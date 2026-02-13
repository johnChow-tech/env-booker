import { expect, Locator } from '@playwright/test';
import { POPOVER } from '../../utils/constants';

export class ReleasePopover {
  readonly popover: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly noBtn: Locator;
  readonly yesBtn: Locator;

  constructor(popover: Locator) {
    this.popover = popover;
    this.title = popover.getByText(POPOVER.TITLE);
    this.description = popover.getByText(POPOVER.DESCRIPTION);
    this.noBtn = popover.getByRole('button', { name: 'No' });
    this.yesBtn = popover.getByRole('button', { name: 'Yes' });
  }

  async assertContent() {
    await expect(this.popover).toBeVisible();

    await expect.soft(this.title).toBeVisible();
    await expect.soft(this.description).toBeVisible();

    await expect.soft(this.noBtn).toBeVisible();
    await expect.soft(this.yesBtn).toBeVisible();
  }

  async clickNo() {
    await this.noBtn.click();
  }

  async clickYes() {
    await this.yesBtn.click();
  }
}
