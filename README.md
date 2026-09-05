# Playwright MCP Claude Demo

A Playwright + TypeScript automation project driven by [Claude Code](https://claude.com/claude-code)
and the Playwright MCP server, demonstrating an agent-driven test lifecycle: **plan → generate
(Page Object Model) → execute → report → heal**.

Target app under test: [SauceDemo](https://www.saucedemo.com).

## Stack

- Playwright 1.62+ with TypeScript
- Node 20+
- Test runner: `@playwright/test`
- MCP server: `playwright-test` (`npx playwright run-test-mcp-server`, configured in [`.mcp.json`](./.mcp.json))

## Setup

```bash
# 1. Clone
git clone https://github.com/prasantamuj/PlaywtightMcpAgentwithHealing.git
cd PlaywtightMcpAgentwithHealing

# 2. Install dependencies
npm install

# 3. Install Playwright browsers
npx playwright install --with-deps chromium
```

No `.env` or credentials are required — SauceDemo test users are seeded in
[`tests/data/users.json`](./tests/data/users.json) and the base URL is configured in
[`playwright.config.ts`](./playwright.config.ts).

### Verify the setup

Run the seed spec first — it's the baseline every agent references before doing anything else:

```bash
npx playwright test tests/seed.spec.ts
```

If it fails, fix it before running or generating anything else (see [`CLAUDE.md`](./CLAUDE.md)).

## Project structure

```
.claude/agents/   Subagent definitions: playwright-test-planner, -generator, -healer
specs/            Test plans (Markdown), one file per feature
src/pages/        Page Object classes (one file per page, extends BasePage)
src/fixtures/     Custom fixtures extending base test
src/utils/        Pure helpers — no test logic
tests/            Spec files, mirroring the app's URL structure
tests/data/       JSON/CSV test data
docs/             Guides (see docs/testing-workflow-guide.md)
```

## Running tests

```bash
npx playwright test                       # full suite
npx playwright test --grep @smoke         # tag-filtered
npx playwright test tests/auth/standard-login.spec.ts   # single file
npx playwright test --headed              # visible browser
npx playwright show-report                # open the last HTML report
```

## The agent-driven workflow

Three subagents in `.claude/agents/` cover the lifecycle end to end. Full walkthrough, code
samples, and the escalation/reporting rules live in
**[`docs/testing-workflow-guide.md`](./docs/testing-workflow-guide.md)** — short version:

1. **Plan** — `playwright-test-planner` explores the app and writes a numbered scenario plan to
   `specs/<feature-name>.md` (e.g. [`specs/saucedemo-login.md`](./specs/saucedemo-login.md)).
2. **Generate** — `playwright-test-generator` turns one plan scenario into a Page Object +
   spec file under `tests/`, reusing existing page objects wherever possible.
3. **Execute** — run via `npx playwright test` or the MCP `test_run` tool.
4. **Heal** — on failure, `playwright-test-healer` classifies the root cause (locator drift, UI
   restructure, copy change, real regression, environment issue, or flakiness), applies a minimal
   fix that preserves the test's original intent, and re-runs. It escalates to a human after 2
   failed attempts instead of marking the test `fixme()` — see the guide for the full escalation
   rule and mandatory report format.
5. **Report** — pass/fail status and screenshots per step are available via the HTML report and
   Trace Viewer; see the guide for how to capture a screenshot on both pass and fail per step.

All rules governing this workflow — locator priority, page object contract, forbidden patterns,
and the healer's escalation rule — are defined in **[`CLAUDE.md`](./CLAUDE.md)** and take
precedence over any subagent's own defaults.
