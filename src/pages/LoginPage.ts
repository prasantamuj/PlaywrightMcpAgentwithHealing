import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { InventoryPage } from './InventoryPage';

export class LoginPage extends BasePage {
  readonly usernameInput = this.page.getByRole('textbox', { name: 'Username' });
  readonly passwordInput = this.page.getByRole('textbox', { name: 'Password' });
  readonly loginButton = this.page.getByRole('button', { name: 'Login' });
  // CSS attribute selector: SauceDemo's error banner has no accessible role/label and exposes
  // `data-test="error"` (not `data-testid`), so getByRole/getByLabel/getByTestId all fail to
  // resolve it. Locator priority order exhausted — documented exception.
  readonly errorMessage = this.page.locator('[data-test="error"]');

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.waitForReady();
  }

  async login(username: string, password: string): Promise<InventoryPage> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    return new InventoryPage(this.page);
  }

  async loginExpectingError(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
