import { test } from '@playwright/test';
import { HOMEPAGE } from '../utils/constants';
import { MOCKING } from '../utils/mockData';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('(Mock) Environment Booking and release Flow', () => {
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

    // await page.goto('http://localhost:3000');
  });

  test('(mock)Happy Path:预约并释放第一个环境', async ({ page }) => {
    const dashboard = new DashboardPage(page, HOMEPAGE.URL);
    await dashboard.goto();
    const name = dbState[0].name;
    await dashboard.book(name, 'test', '60');
    await dashboard.release(name);
  });
});

test.describe('Environment Booking and release Flow', () => {
  test('Happy Path:预约并释放第一个环境', async ({ page }) => {
    const dashboard = new DashboardPage(page, HOMEPAGE.URL);
    await dashboard.goto();

    const name = 'Dev-Machine-A';
    await dashboard.book(name, 'test', '60');
    await dashboard.release(name);
  });
});
