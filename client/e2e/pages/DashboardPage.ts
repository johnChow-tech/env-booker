import { type Page, type Locator, expect } from '@playwright/test';
import { HOMEPAGE } from '../utils/constants';

export class DashboardPage {
  // 1. 定义一个变量来存 page和locator
  readonly page: Page;
  readonly url = HOMEPAGE.URL;

  // 2. 定义静态元素（那些永远在那里的东西）
  readonly heading: Locator;
  readonly refreshBtn: Locator;

  // 3. 构造函数：初始化时把 page 传进来
  constructor(page: Page) {
    this.page = page;
    // 初始化定位器
    this.heading = page.getByRole('heading', { name: HOMEPAGE.TITLE });
    this.refreshBtn = page.getByRole('button', { name: HOMEPAGE.BUTTON_REFRESH });
  }

  // 4. 定义动作：把复杂的交互封装成简单的函数
  // 打开网页
  async goto() {
    await this.page.goto(this.url);
    await expect(this.refreshBtn).toBeVisible();
  }
  // 刷新网页
  async refresh() {
    await this.refreshBtn.click();
    await expect(this.heading).toHaveText(HOMEPAGE.TITLE);
    await expect(this.refreshBtn).toBeVisible();
  }
  getEnvironmentRow(envName: string): EnvironmentRow {
    const rowLocator = this.page.getByRole('row', { name: envName });
    return new EnvironmentRow(rowLocator);
  }
  // TODO:预约环境
  // TODO:释放环境
}
