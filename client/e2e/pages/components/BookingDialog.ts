import { expect, type Locator } from '@playwright/test';
import { DIALOG } from '../../utils/constants';

export class BookingDialog {
  readonly dialog: Locator;
  readonly userNameInput: Locator;
  //   readonly userNameLabel: Locator;
  //   readonly durationLabel: Locator;
  readonly durationInput: Locator;
  readonly closeBtn: Locator;
  readonly cancelBtn: Locator;
  readonly confirmBtn: Locator;

  constructor(dialog: Locator) {
    this.dialog = dialog;

    /*
    getByLabel 的工作原理就是：先找到 Label 文本，再找到对应的 Input。
    冗余：如果 userNameInput 能找到 (toBeEditable 通过)，那么 userNameLabel 必然是存在的且可见的。
    维护成本：虽然写了也没错（更严谨），但在大多数 UI 测试中，我们只关心“输入框能不能填”，不太关心“Label 纯文本是否存在”。
     */

    // this.userNameLabel = this.dialog.getByText(DIALOG.LABEL_USER_NAME);
    // this.durationLabel = this.dialog.getByText(DIALOG.LABEL_DURATION);
    this.userNameInput = this.dialog.getByLabel(DIALOG.LABEL_USER_NAME);
    this.durationInput = this.dialog.getByLabel(DIALOG.LABEL_DURATION);
    // buttons
    this.closeBtn = this.dialog.getByRole('button', { name: DIALOG.BUTTON_CLOSE });
    this.cancelBtn = this.dialog.getByRole('button', { name: DIALOG.BUTTON_CANCEL });
    this.confirmBtn = this.dialog.getByRole('button', { name: DIALOG.BUTTON_CONFIRM });
  }

  async assertContent(dialogTitle: string) {
    await expect(this.dialog).toBeVisible();

    await expect.soft(this.dialog.locator('.ant-modal-title')).toHaveText(dialogTitle);
    await expect.soft(this.userNameInput).toBeEditable();
    await expect.soft(this.durationInput).toBeEditable();

    await expect.soft(this.closeBtn).toBeVisible();
    await expect.soft(this.cancelBtn).toBeVisible();
    await expect.soft(this.confirmBtn).toBeVisible();
  }

  async fillUserName(userName: string) {
    await this.userNameInput.fill(userName);
  }

  async fillDuration(duration: string) {
    await this.durationInput.fill(duration);
  }

  async clickClose() {
    await this.closeBtn.click();
  }

  async clickCancel() {
    await this.cancelBtn.click();
  }

  async clickConfirm() {
    await this.confirmBtn.click();
  }

  async submitBooking(userName: string, duration: string) {
    await this.fillUserName(userName);
    await this.fillDuration(duration);
    await this.clickConfirm();
  }
}
