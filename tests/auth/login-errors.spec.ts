// spec: specs/saucedemo-login.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../src/fixtures/base';
import { LoginPage } from '../../src/pages/LoginPage';
import users from '../data/users.json';

test.describe('SauceDemo Login', () => {
  test('Locked-out user is blocked with an explicit error @smoke @critical', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    // 1. Enter locked_out_user in the Username field
    // 2. Enter secret_sauce in the Password field
    // 3. Click the Login button
    await login.loginExpectingError(users.locked.username, users.locked.password);

    await expect(login.errorMessage).toBeVisible();
    await expect(login.errorMessage).toContainText('locked out');
    await expect(page).toHaveURL('https://www.saucedemo.com/');
  });

  test('Empty username is rejected @regression', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    // 1. Leave Username empty
    // 2. Enter secret_sauce in the Password field
    // 3. Click the Login button
    await login.loginExpectingError('', users.standard.password);

    await expect(login.errorMessage).toBeVisible();
    await expect(login.errorMessage).toContainText('Username is required');
  });

  test('Empty password is rejected @regression', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    // 1. Enter standard_user in the Username field
    // 2. Leave Password empty
    // 3. Click the Login button
    await login.loginExpectingError(users.standard.username, '');

    await expect(login.errorMessage).toBeVisible();
    await expect(login.errorMessage).toContainText('Password is required');
  });

  test('Invalid credentials are rejected @regression', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    // 1. Enter standard_user in the Username field
    // 2. Enter wrong_password in the Password field
    // 3. Click the Login button
    await login.loginExpectingError(users.standard.username, 'wrong_password');

    await expect(login.errorMessage).toBeVisible();
    await expect(login.errorMessage).toContainText('do not match any user');
  });
});
