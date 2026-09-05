# End-to-End Testing Workflow Guide

This guide walks through the full lifecycle used in this repo: **Plan → Generate (POM) → Execute →
Report (pass/fail + screenshots per step) → Heal → Re-run**. Every example below uses the real
files already in this project (`LoginPage.ts`, `standard-login.spec.ts`,
`specs/saucedemo-login.md`) so you can cross-reference the actual source.

> All rules here are governed by [`CLAUDE.md`](../CLAUDE.md). Where a step would require changing
> `playwright.config.ts` or adding a dependency, this guide flags it as **requires approval** —
> per project rules, ask the user before making that change.

---

## 0. Workflow overview

```
 1. PLAN            specs/<feature>.md            playwright-test-planner
        │
        ▼
 2. GENERATE (POM)  src/pages/*.ts + tests/**     playwright-test-generator
        │
        ▼
 3. EXECUTE         npx playwright test           test_run (MCP)
        │
        ├── PASS ──► 5. REPORT (pass + screenshot)
        │
        └── FAIL ──► 4. HEAL ──► re-run (back to 3) ──► 5. REPORT (fail + screenshot)
```

---

## 1. Create a test plan

Test plans live in `specs/<feature-name>.md` (kebab-case) and are the **only** input the
Generator subagent is allowed to work from. See the real example already in this repo:
[`specs/saucedemo-login.md`](../specs/saucedemo-login.md).

### Required structure

```markdown
# Test Plan: <Feature Name>

**Target:** <base URL>
**Seed:** tests/seed.spec.ts
**Date:** 2026-09-05

## Overview
<1-2 sentences: what this plan covers and the starting state>

## Preconditions
- <shared precondition 1>
- <shared precondition 2>

## Scenarios

### Scenario 1.1 — <short title>
- **Priority:** P0 | P1 | P2
- **Tags:** @smoke @critical            <!-- one of @smoke / @regression / @critical, always -->
- **Preconditions:** <scenario-specific precondition>
- **Steps:**
  1. <action> — expected: <result>
  2. <action> — expected: <result>
- **Assertions:**
  - <specific, checkable assertion — never just "page loaded">
- **Edge cases considered:** <what was deliberately excluded and why>

### Scenario 1.2 — <next scenario>
...

## Not covered (and why)
- <thing you decided NOT to test, and the reason>
```

Key rules (from `CLAUDE.md`):
- Scenarios are numbered `<group>.<n>` (e.g. `1.1`, `1.2`, `2.1`) — the Generator references a
  scenario **by this number**, never by its title.
- Every scenario needs explicit preconditions, step-by-step expected results, and at least one
  concrete assertion.
- Every scenario is tagged `@smoke`, `@regression`, or `@critical`.

### How to produce it

Use the `playwright-test-planner` subagent (it drives a real browser via the `playwright-test`
MCP server to explore the app before writing the plan, then saves it with `planner_save_plan`):

```
Use the playwright-test-planner agent to create a test plan for the SauceDemo checkout flow,
saved to specs/saucedemo-checkout.md, following the same structure as specs/saucedemo-login.md.
```

---

## 2. Generate the test script (Page Object Model)

### 2.1 Folder structure (mirrors `CLAUDE.md`)

```
src/pages/      Page Object classes — one file per page, extends BasePage
src/fixtures/   Custom fixtures extending base test (import test from here, never @playwright/test)
src/utils/      Pure helpers — no test logic, no expect()
tests/          Spec files, mirroring the app's URL structure
tests/data/     JSON/CSV test data (never inline literals in a spec)
```

### 2.2 Page Object contract

Every page object extends `BasePage` — real file, [`src/pages/BasePage.ts`](../src/pages/BasePage.ts):

```typescript
import { Page } from '@playwright/test';

export abstract class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  abstract goto(): Promise<void>;

  async waitForReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }
}
```

Rules:
- Constructor takes `page: Page` only.
- All locators are `readonly`, declared in the class body/constructor.
- Action methods return `Promise<void>` **or** the next `Page Object` (enables fluent chaining).
- **No `expect()` inside a page object** — assertions belong in the test file only.

### 2.3 Concrete page object — real file, [`src/pages/LoginPage.ts`](../src/pages/LoginPage.ts)

```typescript
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { InventoryPage } from './InventoryPage';

export class LoginPage extends BasePage {
  readonly usernameInput = this.page.getByRole('textbox', { name: 'Username' });
  readonly passwordInput = this.page.getByRole('textbox', { name: 'Password' });
  readonly loginButton = this.page.getByRole('button', { name: 'Login' });
  // CSS attribute selector: SauceDemo's error banner has no accessible role/label and exposes
  // `data-test="error"` (not `data-testid`) — locator priority order exhausted, documented exception.
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
}
```

Locator priority is **strict** — do not deviate without a documented exception like the one above:

1. `getByRole` with accessible name
2. `getByLabel` for form fields
3. `getByTestId` (`data-test-id` attribute)
4. `getByText` — static UI text only
5. CSS / XPath — forbidden unless explicitly approved

### 2.4 Spec file — real file, [`tests/auth/standard-login.spec.ts`](../tests/auth/standard-login.spec.ts)

```typescript
// spec: specs/saucedemo-login.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../src/fixtures/base';   // never import from '@playwright/test' directly
import { LoginPage } from '../../src/pages/LoginPage';
import users from '../data/users.json';                   // test data, never inline

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
```

Rules: web-first assertions only (`toBeVisible`, `toHaveCount`, `toHaveURL`…), no
`page.waitForTimeout`, no `waitForSelector`, no `networkidle`. Use `test.step()` once a flow
exceeds 3 actions (see §5 — this is also how per-step screenshots get attached to the report).

### How to produce it

Use the `playwright-test-generator` subagent, pointing it at a scenario **number** from the plan:

```
<test-suite>SauceDemo Login</test-suite>
<test-name>Standard user logs in successfully</test-name>
<test-file>tests/auth/standard-login.spec.ts</test-file>
<seed-file>tests/seed.spec.ts</seed-file>
<body>Implement scenario 1.1 from specs/saucedemo-login.md</body>
```

---

## 3. Execute the tests

### CLI (what CI runs)

```bash
# Full suite, all browsers/projects defined in playwright.config.ts
npx playwright test

# Just one spec file
npx playwright test tests/auth/standard-login.spec.ts

# Filter by tag (tags live in the test title, e.g. "@smoke")
npx playwright test --grep @smoke
npx playwright test --grep @critical

# Headed, for visual debugging
npx playwright test --headed

# Open the last HTML report
npx playwright show-report
```

### Via the MCP server (what the agents use)

The `playwright-test` MCP server (configured in `.mcp.json`) exposes `test_list` / `test_run` /
`test_debug`. The Healer subagent always starts with:

1. `test_list` — enumerate available tests
2. `test_run` — run the full suite (or a filtered subset) and capture pass/fail results
3. `test_debug` — step into a specific failing test interactively when a fix is needed

---

## 4. Heal a failing test

When step 3 fails, invoke the `playwright-test-healer` subagent. **Do not hand-patch a failing
test yourself without following this process** — the project explicitly overrides that
subagent's default "mark as `fixme()` and move on" behavior (see
[`.claude/agents/playwright-test-healer.md`](../.claude/agents/playwright-test-healer.md)).

### Healer's workflow

1. Reads `CLAUDE.md`, the failing spec, every page object it uses, and the last run's
   error/stack trace.
2. Runs `test_debug` on the failing test and gathers evidence: DOM snapshot, console errors,
   network 4xx/5xx.
3. Classifies the failure — **do not skip this step**, it decides whether the test should even be
   touched:

   | Category | Meaning | Allowed action |
   |---|---|---|
   | A | Locator drift (element still there, name/role changed) | Fix the locator |
   | B | UI restructure (element moved) | Update the steps |
   | C | Copy change (visible text changed) | Update the text assertion, after verifying live |
   | D | Real regression (feature is actually broken) | **Report the bug — do not touch the test** |
   | E | Environment issue (app down, seed broken) | **Report — do not touch the test** |
   | F | Flakiness (race condition/timing) | Add a real wait tied to app state, never a fixed sleep |

4. Applies a minimal fix (never softens an assertion, never widens `toHaveCount`, never adds
   `test.skip`/`fixme` without explicit human approval, never touches a page object, fixture, or
   `playwright.config.ts` without explicit human approval).
5. Re-runs the test to confirm.

### Escalation rule (strict — overrides the subagent's own default)

> After **2 failed fix attempts**, or if the root cause looks like category D, or a fix would
> require touching a page object/fixture/config: **stop.** Report what was tried and ask the
> human what to do next. Never `fixme()`, never keep iterating, never ship a fix you're not
> confident in.

### Mandatory Healer report format

Every healing session — resolved or escalated — produces this report:

```markdown
## Healer Report — <test-file-path>

### Failure classification
<A/B/C/D/E/F> — <one-line explanation>

### Root cause
<Plain-English description>

### Evidence gathered
- DOM snapshot: <what you saw>
- Console errors: <yes/no + details>
- Network errors: <yes/no + details>

### Fix applied
<Exact diff — before and after>

### Intent preservation check
- Original assertion: <exact code>
- New assertion: <exact code>
- Did assertion intent change? <YES/NO>
- Was any assertion softened? <YES/NO>
- Was any test skipped? <YES/NO>
- Was any timeout increased? <YES/NO>

### Test result
- Run 1: <PASS/FAIL>
- Run 2: <PASS/FAIL>

### Files modified
- <path/to/file> — <what changed>

### Recommendation
- Ready to merge — clean fix
- Needs human review — <reason>
- Do not merge — root cause is a real bug: <what to file>
```

Invoke it like this:

```
Use the playwright-test-healer agent to fix the failing test in
tests/auth/standard-login.spec.ts and produce the mandatory Healer Report.
```

---

## 5. Pass/fail report with a screenshot for every step

The goal: for each `test.step()` in a spec, the HTML report shows **which action ran, whether it
passed or failed, and a screenshot taken at that moment** — for both outcomes, not just failures.

There are two complementary mechanisms. Use both together for the most useful report.

### 5.1 Built-in per-action screenshots via Trace Viewer (recommended, no code changes)

Playwright's trace already records a screenshot before/after **every action** (click, fill,
navigation, etc.) together with the DOM snapshot, console, and network — for passing **and**
failing runs — with zero extra code, as long as `test.step()` is used to label the actions.

Current config (`playwright.config.ts`) only traces `on-first-retry`, so a first-try pass or fail
records nothing. To capture a trace (and therefore per-action screenshots) on **every** run:

```typescript
// playwright.config.ts
use: {
  baseURL: 'https://www.saucedemo.com',
  trace: 'on',   // was: 'on-first-retry'
},
```

> **Requires approval** — `CLAUDE.md` forbids modifying `playwright.config.ts` without asking
> first. Confirm with the user before applying this change.

Viewing it:

```bash
npx playwright show-report          # click any test → "Trace" tab
# or directly:
npx playwright show-trace test-results/<test-folder>/trace.zip
```

The trace viewer's timeline lists every `test.step()` (e.g. "Enter username", "Enter password",
"Click Login button") with a green ✓ or red ✗, and clicking a step shows the screenshot at that
exact point — for both passed and failed steps.

### 5.2 Explicit screenshots attached inline in the HTML report (belt-and-suspenders)

If you want a screenshot embedded directly in the single-file HTML report (not just the trace
viewer), attach one manually after each step, in a `finally` block so it fires on **pass and
fail** alike. This is a pure helper (`src/utils/`, no test logic) per the folder-structure rule:

```typescript
// src/utils/step-screenshot.ts
import { Page, TestInfo } from '@playwright/test';

export async function stepWithScreenshot(
  testInfo: TestInfo,
  page: Page,
  stepName: string,
  action: () => Promise<void>,
): Promise<void> {
  let status: 'PASS' | 'FAIL' = 'PASS';
  try {
    await action();
  } catch (err) {
    status = 'FAIL';
    throw err;
  } finally {
    const screenshot = await page.screenshot();
    await testInfo.attach(`${stepName} — ${status}`, {
      body: screenshot,
      contentType: 'image/png',
    });
  }
}
```

Used inside a spec, combined with `test.step()` so the action is named in the report body too:

```typescript
import { test, expect } from '../../src/fixtures/base';
import { LoginPage } from '../../src/pages/LoginPage';
import { stepWithScreenshot } from '../../src/utils/step-screenshot';
import users from '../data/users.json';

test.describe('SauceDemo Login', () => {
  test('Standard user logs in successfully @smoke @critical', async ({ page }, testInfo) => {
    const login = new LoginPage(page);

    await test.step('Open login page', async () => {
      await stepWithScreenshot(testInfo, page, 'Open login page', () => login.goto());
    });

    await test.step('Enter username: standard_user', async () => {
      await stepWithScreenshot(testInfo, page, 'Enter username', async () => {
        await login.usernameInput.fill(users.standard.username);
      });
    });

    await test.step('Enter password', async () => {
      await stepWithScreenshot(testInfo, page, 'Enter password', async () => {
        await login.passwordInput.fill(users.standard.password);
      });
    });

    let inventory;
    await test.step('Click Login button', async () => {
      await stepWithScreenshot(testInfo, page, 'Click Login button', async () => {
        await login.loginButton.click();
      });
    });

    inventory = login; // page-object transition omitted here for brevity — see real spec

    await expect(page).toHaveURL(/inventory\.html/);
  });
});
```

Each `test.step()` block shows up in `npx playwright show-report` with its own pass/fail icon,
duration, and — thanks to `testInfo.attach` in the `finally` — its own screenshot regardless of
whether that step passed or failed, labeled with the action and its outcome (e.g.
`"Click Login button — FAIL"`).

> This introduces a new util file (`src/utils/step-screenshot.ts`). Per `CLAUDE.md`, confirm with
> the user before adding it to the codebase — it's a new piece of shared infrastructure, not a
> one-off test change.

### 5.3 Summary — which to use when

| Need | Mechanism | Config/code change |
|---|---|---|
| Quick, zero-code, every action, both outcomes | Trace Viewer | `trace: 'on'` in config (**needs approval**) |
| Screenshot embedded directly in the single HTML report body, per named step | `testInfo.attach` in a `finally` | New `src/utils/step-screenshot.ts` helper (**needs approval**) |
| One screenshot per test (not per step), failures only | `screenshot: 'only-on-failure'` in config | Config change (**needs approval**) |

---

## Quick reference

| Task | Command / Agent |
|---|---|
| Write a test plan | `playwright-test-planner` agent → `specs/<feature>.md` |
| Generate a POM test from a plan scenario | `playwright-test-generator` agent, referencing scenario `<n.n>` |
| Run all tests | `npx playwright test` |
| Run smoke tests only | `npx playwright test --grep @smoke` |
| Debug one test interactively | MCP `test_debug`, or `npx playwright test --debug <file>` |
| View the last report | `npx playwright show-report` |
| Fix a failing test | `playwright-test-healer` agent (escalates after 2 failed attempts) |
| View per-step screenshots | Trace tab in the HTML report, or `npx playwright show-trace <trace.zip>` |
