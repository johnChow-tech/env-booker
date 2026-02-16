import { test, expect } from '@playwright/test';
import { HOMEPAGE } from '../utils/constants';
import { MOCKING } from '../utils/mockData';
import { DashboardPage } from '../pages/DashboardPage';

// TODO 将自动化测试实装到CI/CD中
// TODO 思考如何在CI/CD的时候输出测试报告
test.describe('(Mock) Environment Booking and release Flow', () => {
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
  let envName: string;
  let envId: number;

  // 1. テスト開始前：API を叩いて「専用の環境」を作る
  test.beforeAll(async ({ request }) => {
    // ランダムな名前を生成 (衝突防止)
    envName = `E2E-Test-Env-${Date.now()}`;

    // 管理者権限で作成 (server/main.go の Basic Auth: admin/123456)
    const response = await request.post('http://localhost:8080/envs', {
      headers: {
        Authorization: 'Basic ' + Buffer.from('admin:123456').toString('base64'),
      },
      data: {
        name: envName,
      },
    });

    // 作成された ID を保存（削除用）
    const body = await response.json();
    envId = body.id;

    // 作成できたか確認
    expect(response.ok()).toBeTruthy();
  });

  // 2. テスト実行：作った環境に対して読み書きする
  test('Happy Path: 予約と解放 (Self-Contained)', async ({ page }) => {
    const dashboard = new DashboardPage(page, HOMEPAGE.URL);
    await dashboard.goto();

    // さっき作った環境を操作する
    await dashboard.book(envName, 'E2E-User', '60');
    await dashboard.release(envName);
  });

  // 3. テスト終了後：ゴミ掃除 (Teardown)
  test.afterAll(async ({ request }) => {
    if (envId) {
      await request.delete(`http://localhost:8080/envs/${envId}`, {
        headers: {
          Authorization: 'Basic ' + Buffer.from('admin:123456').toString('base64'),
        },
      });
    }
  });
});
