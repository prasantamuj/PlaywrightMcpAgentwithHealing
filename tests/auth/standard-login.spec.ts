// spec: specs/saucedemo-login.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../src/fixtures/base';
import { LoginPage } from '../../src/pages/LoginPage';
import users from '../data/users.json';

test.describe('SauceDemo Login', () => {
  test('Standard user logs in successfully @smoke @critical', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    // 1. Enter standard_user in the Username field
    // 2. Enter secret_sauce in the Password field
    // 3. Click the Login button
    const inventory = await login.login(users.standard.username, users.standard.password);

    await expect(page).toHaveURL(/inventory\.html/);
    await expect(inventory.pageTitle).toBeVisible();
    await expect(inventory.productCards).toHaveCount(6);
  });
});
