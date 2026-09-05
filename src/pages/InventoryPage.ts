import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class InventoryPage extends BasePage {
  // getByRole doesn't resolve: SauceDemo renders the "Products" title as a plain <span>, not a
  // heading element, so it carries no accessible heading role. Falls through to getByText for
  // this genuinely static piece of UI copy, per locator priority order.
  readonly pageTitle = this.page.getByText('Products', { exact: true });
  // CSS attribute selector: product cards carry no accessible role/name as a group and expose
  // `data-test="inventory-item"` (not `data-testid`) — same documented exception as LoginPage.
  readonly productCards = this.page.locator('[data-test="inventory-item"]');

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/inventory.html');
    await this.waitForReady();
  }
}
