import { test, expect } from '@playwright/test';

test.describe('Environment Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 确保每次都从首页开始
    await page.goto('http://localhost:3000');
  });

  test('Happy Path: Book and Release first available environment', async ({ page }) => {
    // 1. 验证 Dashboard 标题可见
    await expect(page.getByText('Dashboard')).toBeVisible();

    // --- 关键修复 ---
    // 查找所有包含 "AVAILABLE" 文字的表格行
    // 并使用 .first() 只选取第一行，解决 "strict mode violation"
    const targetRow = page.getByRole('row').filter({ hasText: 'AVAILABLE' }).first();

    // 确保确实找到了至少一行
    await expect(targetRow).toBeVisible();

    // 获取这一行的环境名称 (例如 "QA-Cluster-1")
    // nth(1) 代表第二列 (Name)，nth(0) 是 ID
    const envNameText = await targetRow.locator('td').nth(1).textContent();
    const envName = envNameText?.trim() || 'Unknown';
    console.log(`正在测试环境: ${envName}`);

    // 2. 点击这个特定行的 Book 按钮
    await targetRow.getByRole('button', { name: 'Book' }).click();

    // 3. 填写表单
    // 验证弹窗标题包含环境名
    await expect(page.getByText(`Book Environment: ${envName}`)).toBeVisible();

    // 填写数据
    await page.getByLabel('User Name').fill('Playwright Bot');
    await page.getByLabel('Duration (Minutes)').fill('60');

    // 提交
    await page.getByRole('button', { name: 'Confirm Booking' }).click();

    // 4. 验证预定成功
    // 验证弹窗消失
    await expect(page.getByText(`Book Environment:`)).toBeHidden();

    // 重新定位这一行 (因为页面刷新了，最好通过名字重新找)
    const bookedRow = page.getByRole('row', { name: envName });

    // 验证状态变为 OCCUPIED (红色)
    await expect(bookedRow.getByText('OCCUPIED')).toBeVisible();
    // 验证 Book 按钮变禁用
    await expect(bookedRow.getByRole('button', { name: 'Book' })).toBeDisabled();

    // 5. 释放环境 (Release)
    await bookedRow.getByRole('button', { name: 'Release' }).click();

    // 处理气泡确认框 (Popconfirm)
    await expect(page.getByText('Are you sure you want to release this environment?')).toBeVisible();
    await page.getByRole('button', { name: 'Yes' }).click();

    // 6. 验证释放成功
    // 状态应该变回 AVAILABLE
    await expect(bookedRow.getByText('AVAILABLE')).toBeVisible();
  });
});
