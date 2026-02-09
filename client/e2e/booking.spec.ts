import { test, expect } from '@playwright/test';

// 通用常量,方便重复使用以及维护脚本
const HOMEPAGE = {
  TITLE: 'Dashboard',
  STATUS_AVAILABLE: 'AVAILABLE',
  STATUS_OCCUPIED: 'OCCUPIED',
  BUTTON_BOOK: 'Book',
  BUTTON_RELEASE: 'Release',
  DIALOG_TITLE_PREFIX: 'Book Environment: ',
  DIALOG_LABEL_USER_NAME: 'User Name',
  DIALOG_LABEL_DURATION: 'Duration (Minutes)',
  DIALOG_BUTTON_BOOK: 'Confirm Booking',
  DIALOG_BUTTON_CANCEL: 'Cancel',
  TOAST_BOOK_SUCCESS_PREFIX: 'Successfully booked: ',
};

const MOCKING = {
  ENV_ID: 1,
  ENV_NAME: 'Mock-Env-01',
  ENV_STATUS_AVAILABLE: 'available',
  ENV_STATUS_OCCUPIED: 'occupied',
};

test.describe('Environment Booking Flow', () => {
  // NOTE: typeScript的四种钩子函数
  // test.beforeEach(() => {});
  // test.beforeAll(() => {});
  // test.afterAll(() => {});
  // test.afterEach(() => {});
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

test.describe('(Mock) Environment Booking Flow', () => {
  // mocking
  // NOTE: typeScript的四种钩子函数
  // test.beforeEach(() => {});
  // test.beforeAll(() => {});
  // test.afterAll(() => {});
  // test.afterEach(() => {});
  test.beforeEach(async ({ page }) => {
    let dbState = [{ id: MOCKING.ENV_ID, name: MOCKING.ENV_NAME, status: MOCKING.ENV_STATUS_AVAILABLE }];
    // 确保每次都从首页开始

    // 🟢 规则 A: 拦截【获取列表】请求 (GET /api/envs)
    // 无论何时前端请求这个接口，都返回当前的 dbState
    await page.route('**/api/envs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(dbState),
      });
    });

    // 🔵 规则 B: 拦截【预定】请求 (POST /api/envs/*/book)
    await page.route('**/api/envs/*/book', async (route) => {
      dbState[0].status = MOCKING.ENV_STATUS_OCCUPIED;
      await route.fulfill({
        status: 200,
        body: JSON.stringify('Mock env booked success'),
      });
    });

    // 🟠 规则 C: 拦截【释放】请求 (POST /api/envs/*/release)
    await page.route('**/api/envs/*/release', async (route) => {
      dbState[0].status = MOCKING.ENV_STATUS_AVAILABLE;
      await route.fulfill({
        status: 200,
        body: JSON.stringify('Mock env released success'),
      });
    });

    await page.goto('http://localhost:3000');
  });

  test('(mock)Happy Path:预约并释放第一个环境', async ({ page }) => {
    // 1. 确认Page已被加载
    // await: 异步等待
    // except: 断言
    // await expect(page.getByTitle('Dashboard')).toBeVisible();
    // getByRole('heading', { name: <xxx> })):精确查找，必须是标题元素 (h1-h6 或 role="heading")
    await expect(page.getByRole('heading', { name: HOMEPAGE.TITLE })).toBeVisible();

    // 确认存在目标环境Mock-Env-01
    const targetRow = page.getByRole('row').filter({ hasText: HOMEPAGE.STATUS_AVAILABLE }).first();
    await expect(targetRow).toBeVisible();

    const envIdText = await targetRow.locator('td').nth(0).textContent();
    // ✅ 写法 A (针对纯文本变量)：
    // expect(envIdText?.trim()).toBe(MOCKING.ENV_ID);
    // ✅ 写法 B (Playwright 推荐 - 针对元素)：
    // 直接对 Locator 断言，这样如果元素还没渲染完，它会自动等待
    // await expect(targetRow.locator('td').nth(0)).toHaveText(MOCKING.ENV_ID);
    await expect(envIdText?.trim()).toBe(MOCKING.ENV_ID);

    const envNameText = await targetRow.locator('td').nth(1).textContent();
    await expect(envNameText?.trim()).toBe(MOCKING.ENV_NAME);

    // 确认目标环境的status是AVAILABLE
    const envStatusText = await targetRow.locator('td').nth(2).textContent();
    await expect(envStatusText?.trim()).toBe(HOMEPAGE.STATUS_AVAILABLE);

    // 确认Release按钮存在且不可点击
    await expect(targetRow.getByRole('button', { name: HOMEPAGE.BUTTON_RELEASE })).toBeDisabled();

    // 确认Book按钮存在并点击
    await targetRow.getByRole('button', { name: HOMEPAGE.BUTTON_BOOK }).click();

    // 确认"确认卡片"
    // 卡片标题为"Book Environment: Mock-Env-01"
    const bookingDialog = page.getByRole('dialog', { name: `${HOMEPAGE.DIALOG_TITLE_PREFIX}${MOCKING.ENV_NAME}` });
    await expect(bookingDialog).toBeVisible();

    // 卡片中有输入栏"User Name",默认值为空
    // 输入test_01
    await page.getByLabel(HOMEPAGE.DIALOG_LABEL_USER_NAME).fill('test_01');

    // 卡片中有输入栏"Duration (Minutes)",默认值为60
    // 输入100
    await page.getByLabel(HOMEPAGE.DIALOG_LABEL_DURATION).fill('100');

    // 点击Confirm Booking(这里应该Mock)
    await page.getByRole('button', { name: HOMEPAGE.DIALOG_BUTTON_BOOK }).click();

    // 确认弹窗
    await expect(bookingDialog).toBeHidden();
    await expect(page.getByText(`${HOMEPAGE.TOAST_BOOK_SUCCESS_PREFIX}${MOCKING.ENV_NAME}`)).toBeVisible();

    // 确认Status是OCCUPIED
    const bookedRow = page.getByRole('row', { name: MOCKING.ENV_NAME });
    // 确认目标环境的status是AVAILABLE
    const bookedRowstatus = await targetRow.locator('td').nth(2);
    await expect(equal(bookedRowstatus.textContent(), HOMEPAGE.STATUS_OCCUPIED));

    // 确认Book按钮存在且不可点击
    await expect(bookedRow.getByRole('button', { name: HOMEPAGE.BUTTON_BOOK })).toBeDisabled();
    // 确认Release按钮存在并点击
    await bookedRow.getByRole('button', { name: HOMEPAGE.BUTTON_RELEASE }).click();

    // 点击Yes
    await expect(page.getByText('Are you sure you want to release this environment?')).toBeVisible();
    await page.getByRole('button', { name: 'Yes' }).click();

    // 确认弹窗
    await expect(page.getByText('Environment released')).toBeVisible();
    // 确认目标环境的status是AVAILABLE
    // 确认Release按钮存在且不可点击
    // 确认Book按钮存在并点击
  };);
});
