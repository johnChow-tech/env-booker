import { type Locator, expect } from '@playwright/test';
import { HOMEPAGE } from '../utils/constants';

export class EnvironmentRow {
  readonly row: Locator;
  readonly envID: Locator;
  readonly status: Locator;
  readonly bookBtn: Locator;
  readonly releaseBtn: Locator;

  constructor(row: Locator) {
    this.row = row;
    this.envID = row.locator('td').first();
    this.status = row.locator('.ant-tag');
    // buttons
    this.bookBtn = row.getByRole('button', { name: HOMEPAGE.BUTTON_BOOK });
    this.releaseBtn = row.getByRole('button', { name: HOMEPAGE.BUTTON_RELEASE });
  }

  async clickBook() {
    await this.bookBtn.click();
  }
  async clickRelease() {
    await this.releaseBtn.click();
  }
  async assertStatus(expectedStatus: string) {
    await expect(this.status).toHaveText(expectedStatus);
  }
}
