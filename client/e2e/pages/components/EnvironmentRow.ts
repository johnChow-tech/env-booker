import { type Locator, expect } from '@playwright/test';
import { HOMEPAGE } from '../../utils/constants';

export class EnvironmentRow {
  readonly row: Locator;
  readonly envID: Locator;
  readonly envName: Locator;
  readonly status: Locator;
  readonly bookBtn: Locator;
  readonly releaseBtn: Locator;

  constructor(row: Locator, envName: string) {
    this.row = row;
    this.envID = row.locator('td').first();
    this.envName = row.getByRole('cell', { name: envName });
    this.status = row.locator('.ant-tag');
    // buttons
    this.bookBtn = row.getByRole('button', { name: HOMEPAGE.BUTTON_BOOK });
    this.releaseBtn = row.getByRole('button', { name: HOMEPAGE.BUTTON_RELEASE });
  }

  async assertContent(id: string, envName: string, status: string, isAvailable: boolean) {
    await expect(this.row).toBeVisible();

    await expect.soft(this.envID).toHaveText(id);
    await expect.soft(this.envName).toHaveText(envName);
    await this.assertStatus(status);

    if (isAvailable) {
      await expect.soft(this.bookBtn).toBeEnabled();
      await expect.soft(this.releaseBtn).toBeDisabled();
    } else {
      await expect.soft(this.bookBtn).toBeDisabled();
      await expect.soft(this.releaseBtn).toBeEnabled();
    }
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
