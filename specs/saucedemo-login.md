# Test Plan: SauceDemo Login

**Target:** https://www.saucedemo.com
**Seed:** tests/seed.spec.ts
**Date:** 2026-09-04

## Overview

Covers the SauceDemo login form: successful authentication for a standard user, the locked-out
user's error path, and client-side validation for missing/invalid credentials. All scenarios start
from a fresh, unauthenticated visit to the login page.

## Preconditions

- App is reachable at https://www.saucedemo.com
- No prior session/storage state — each scenario starts logged out
- Credentials come from `tests/data/users.json`; password for all seed users is `secret_sauce`

## Scenarios

### Scenario 1.1 — Standard user logs in successfully
- **Priority:** P0
- **Tags:** @smoke @critical
- **Preconditions:** Logged out, on `/`
- **Steps:**
  1. Enter `standard_user` in the Username field — expected: value accepted, no error shown
  2. Enter `secret_sauce` in the Password field — expected: value accepted, masked
  3. Click the Login button — expected: navigation to `/inventory.html`
- **Assertions:**
  - URL is `/inventory.html`
  - Inventory page shows exactly 6 product cards
  - Page title "Products" is visible
- **Edge cases considered:** none — this is the golden path

### Scenario 1.2 — Locked-out user is blocked with an explicit error
- **Priority:** P0
- **Tags:** @smoke @critical
- **Preconditions:** Logged out, on `/`
- **Steps:**
  1. Enter `locked_out_user` in the Username field
  2. Enter `secret_sauce` in the Password field
  3. Click the Login button — expected: stays on `/`, error banner appears
- **Assertions:**
  - Error banner is visible and its text contains "locked out"
  - URL remains `/` (no navigation occurred)
- **Edge cases considered:** distinguishes "wrong credentials" error from "account locked" error —
  the two must not be conflated by a loose assertion

### Scenario 1.3 — Empty username is rejected
- **Priority:** P1
- **Tags:** @regression
- **Preconditions:** Logged out, on `/`
- **Steps:**
  1. Leave Username empty
  2. Enter `secret_sauce` in the Password field
  3. Click the Login button — expected: stays on `/`, error banner appears
- **Assertions:**
  - Error banner text mentions "Username is required"
- **Edge cases considered:** whitespace-only username is a related but separate case, not covered
  here (see Not covered)

### Scenario 1.4 — Empty password is rejected
- **Priority:** P1
- **Tags:** @regression
- **Preconditions:** Logged out, on `/`
- **Steps:**
  1. Enter `standard_user` in the Username field
  2. Leave Password empty
  3. Click the Login button — expected: stays on `/`, error banner appears
- **Assertions:**
  - Error banner text mentions "Password is required"

### Scenario 1.5 — Invalid credentials are rejected
- **Priority:** P1
- **Tags:** @regression
- **Preconditions:** Logged out, on `/`
- **Steps:**
  1. Enter `standard_user` in the Username field
  2. Enter `wrong_password` in the Password field
  3. Click the Login button — expected: stays on `/`, error banner appears
- **Assertions:**
  - Error banner text mentions "do not match any user"

## Not covered (and why)

- Whitespace-only username/password — not a distinct SauceDemo validation path, low value
- `problem_user` / `performance_glitch_user` logins — behavioral quirks unrelated to the login
  form itself; belong in an inventory-page or performance test plan, not this one
- Session persistence / logout — out of scope for a login-flow plan; would belong in a separate
  `saucedemo-session.md` plan
