import { type Page, type Locator, expect } from '@playwright/test';
import { EnvironmentRow } from './components/EnvironmentRow';
import { DIALOG, HOMEPAGE, POPOVER, TOAST } from '../utils/constants';
import { BookingDialog } from './components/BookingDialog';
import { ReleasePopover } from './components/ReleasePopover';
import { Toast } from './components/Toast';

export class DashboardPage {
  // 1. 定义一个变量来存 page和locator
  readonly page: Page;
  readonly url: string;

  // 2. 定义静态元素（那些永远在那里的东西）
  readonly heading: Locator;
  readonly refreshBtn: Locator;
  readonly toast: Toast; // 定义属性

  // 3. 构造函数：初始化时把 page 传进来
  constructor(page: Page, url: string) {
    this.page = page;
    this.url = url;
    // 初始化定位器
    this.heading = page.getByRole('heading', { name: HOMEPAGE.TITLE });
    this.refreshBtn = page.getByRole('button', { name: HOMEPAGE.BUTTON_REFRESH });
    this.toast = new Toast(page); // 初始化单例
  }

  // 4. 定义动作：把复杂的交互封装成简单的函数
  // 打开网页
  async goto() {
    await this.page.goto(this.url);
    await expect(this.heading).toBeVisible();
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
    return new EnvironmentRow(rowLocator, envName);
  }

  getBookingDialog(envName: string): BookingDialog {
    const dialogTitle = `${DIALOG.TITLE_PREFIX}${envName}`;
    const dialog = this.page.getByRole('dialog', { name: dialogTitle });
    return new BookingDialog(dialog);
  }

  getReleasePopover(): ReleasePopover {
    const popover = this.page.getByRole('tooltip').filter({ hasText: POPOVER.TITLE });
    return new ReleasePopover(popover);
  }

  async book(envName: string, userName: string, duration: string) {
    const envRow = this.getEnvironmentRow(envName);

    const isAvailable = true;
    await envRow.assertContent(envName, HOMEPAGE.STATUS_AVAILABLE, isAvailable);

    await envRow.clickBook();

    const bookingDialog = this.getBookingDialog(envName);

    const dialogTitle = `${DIALOG.TITLE_PREFIX}${envName}`;
    await bookingDialog.assertContent(dialogTitle);
    await bookingDialog.submitBooking(userName, duration);

    const toastMessage = `${TOAST.BOOK_SUCCESS_PREFIX}${envName}`;
    await this.toast.vertify(toastMessage);
    await envRow.assertStatus(HOMEPAGE.STATUS_OCCUPIED); //这里需要获取一个新的EnvironmentRow吗？
    await this.toast.waitForHidden();
  }

  async release(envName: string) {
    const envRow = this.getEnvironmentRow(envName);

    const isAvailable = false;
    await envRow.assertContent(envName, HOMEPAGE.STATUS_OCCUPIED, isAvailable);

    await envRow.clickRelease();

    const popover = this.getReleasePopover();
    await popover.assertContent();
    await popover.clickYes();

    await this.toast.vertify(TOAST.RELEASE_SUCCESS);
    await envRow.assertStatus(HOMEPAGE.STATUS_AVAILABLE);
    await this.toast.waitForHidden();
  }
}
