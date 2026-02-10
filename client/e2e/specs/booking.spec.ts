import { test, expect } from '@playwright/test';
import { HOMEPAGE } from '../utils/constants';
import { MOCKING } from '../utils/mockData';

test.describe('(Mock) Environment Booking and release Flow', () => {
  // TODO 使用准备好的POM来重构测试用例
  // TODO 将自动化测试实装到CI/CD中
  // TODO 思考如何在CI/CD的时候输出测试报告
  // mocking
  type Record = { id: number; name: string; status: string };
  let dbState: Record[];
  // NOTE: typeScript的四种钩子函数
  // test.beforeEach(() => {});
  // test.beforeAll(() => {});
  // test.afterAll(() => {});
  // test.afterEach(() => {});
  test.beforeEach(async ({ page }) => {
    dbState = [{ id: MOCKING.ENV_ID, name: MOCKING.ENV_NAME, status: MOCKING.ENV_STATUS_AVAILABLE }];
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
    const mockEnv = page.getByRole('row', { name: MOCKING.ENV_NAME });
    await expect(mockEnv).toBeVisible();

    // ✅ 写法 A (针对纯文本变量)：
    // expect(envIdText?.trim()).toBe(MOCKING.ENV_ID);
    // ✅ 写法 B (Playwright 推荐 - 针对元素)：
    // 直接对 Locator 断言，这样如果元素还没渲染完，它会自动等待
    // await expect(mockEnv.locator('td').nth(0)).toHaveText(String(MOCKING.ENV_ID));
    await expect(mockEnv.locator('td').nth(0)).toHaveText(String(MOCKING.ENV_ID));
    await expect(mockEnv.locator('td').nth(1)).toHaveText(MOCKING.ENV_NAME);
    await expect(mockEnv.locator('td').nth(2)).toHaveText(HOMEPAGE.STATUS_AVAILABLE);

    // 确认Release按钮存在且不可点击
    await expect(mockEnv.getByRole('button', { name: HOMEPAGE.BUTTON_RELEASE })).toBeDisabled();

    // 确认Book按钮存在并点击
    await mockEnv.getByRole('button', { name: HOMEPAGE.BUTTON_BOOK }).click();

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
    // 确认卡片消失
    await expect(bookingDialog).toBeHidden();

    // 确认弹窗
    const bookSuccessedToast = await page.getByText(`${HOMEPAGE.TOAST_BOOK_SUCCESS_PREFIX}${MOCKING.ENV_NAME}`);
    await expect(bookSuccessedToast).toBeVisible();
    // 确认弹窗消失
    await expect(bookSuccessedToast).toBeHidden();

    // 确认Status是OCCUPIED
    // 确认目标环境的status是AVAILABLE
    await expect(mockEnv.locator('td').nth(2)).toHaveText(HOMEPAGE.STATUS_OCCUPIED);

    // 确认Book按钮存在且不可点击
    await expect(mockEnv.getByRole('button', { name: HOMEPAGE.BUTTON_BOOK })).toBeDisabled();
    // 确认Release按钮存在并点击
    await mockEnv.getByRole('button', { name: HOMEPAGE.BUTTON_RELEASE }).click();

    // 点击Yes
    await expect(page.getByText('Are you sure you want to release this environment?')).toBeVisible();
    await page.getByRole('button', { name: 'Yes' }).click();

    // 确认弹窗
    const releasedToast = await page.getByText('Environment released');
    await expect(releasedToast).toBeVisible();
    // 确认弹窗消失
    await expect(releasedToast).toBeHidden();

    // 确认目标环境的status是AVAILABLE
    const releasedRow = await page.getByRole('row', { name: MOCKING.ENV_NAME });
    await expect(releasedRow.locator('td').nth(2)).toHaveText(HOMEPAGE.STATUS_AVAILABLE);
  });
});
