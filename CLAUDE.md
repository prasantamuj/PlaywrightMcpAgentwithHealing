# Project rules for AI agents

You are working in a Playwright TypeScript automation project driven by Claude Code and the
Playwright MCP server (`playwright-test`, configured in `.mcp.json`). Three subagents live in
`.claude/agents/`: `playwright-test-planner`, `playwright-test-generator`, `playwright-test-healer`.
Follow these rules for every code change, whether made by you directly or by one of those subagents.

## Stack

- Playwright 1.62+ with TypeScript
- Node 20+
- Test runner: @playwright/test
- MCP server: `playwright-test` (`npx playwright run-test-mcp-server`, see `.mcp.json`)

## Folder structure

- `src/pages/` — Page Object classes (one file per page)
- `src/fixtures/` — Custom fixtures extending base test
- `src/utils/` — Pure helpers, no test logic
- `tests/` — Spec files, mirror app URL structure
- `tests/data/` — JSON/CSV test data
- `specs/` — Planner output (Markdown plans)

## Coding conventions

- Import test from `src/fixtures/base.ts`, never from `@playwright/test` directly
- Use `test.describe` per feature area
- One logical assertion group per test
- Use `test.step` for readability when a flow has more than 3 actions
- File names: kebab-case (`add-to-cart.spec.ts`)

## Locator priority (STRICT — do not deviate)

1. `getByRole` with accessible name
2. `getByLabel` for form fields
3. `getByTestId` (attribute is `data-test-id`)
4. `getByText` only for genuinely static UI text
5. CSS / XPath — forbidden unless explicitly approved

## Page Object contract

- One class per page, extends `BasePage` (`src/pages/BasePage.ts`)
- Constructor takes `page: Page` only
- All locators declared as `readonly` in constructor
- Action methods return `Promise<void>` OR the next page object
- No `expect()` calls inside page objects — assertions belong in tests
- No business logic in tests — put it in page objects or helpers

## Assertion rules

- Web-first assertions only (`expect(locator).toBeVisible()`)
- No `page.waitForTimeout` — ever
- No `waitForSelector` — use locator auto-waiting
- No `networkidle` waits
- Custom timeouts only when justified in a code comment

## Test plans (Planner output)

- Saved to `specs/<feature-name>.md`, kebab-case
- Scenarios numbered `<feature-group>.<scenario>` (e.g. `1.1`, `1.2`, `2.1`) — the Generator
  references scenarios by this number, never by name
- Every scenario has explicit preconditions, steps with expected results, and at least one
  meaningful assertion (not just "page loaded")
- Tag every scenario `@smoke`, `@regression`, or `@critical`

## When adding a new test

- Mirror the app URL structure inside `tests/`
- Reuse existing page objects — do not create parallel infra
- Load test data from `tests/data/`, not inline
- Tag tests with `@smoke`, `@regression`, or `@critical` as appropriate
- Seed file is `tests/seed.spec.ts` — the baseline every agent references for the base URL and
  environment setup. If it is broken, fix it before anything else.

## Forbidden

- Do not skip, `fixme`, or comment out failing tests to make a run green
- Do not use `page.evaluate` unless there is no MCP tool alternative
- Do not commit `.env`, credentials, `storage-state.json`, or auth tokens
- Do not modify `playwright.config.ts` without asking
- Do not add new npm dependencies without asking
- Do not use `page.pause()` in committed code

## Healer-specific rule (overrides the default subagent behavior)

The bundled `playwright-test-healer` subagent's default instructions permit marking a stubborn
test `test.fixme()` and skipping it. **That default is overridden for this project.** The Healer
must never silently skip or soften a test. See `.claude/agents/playwright-test-healer.md` for the
full escalation rule: after 2 failed fix attempts, stop and report — do not fixme, do not weaken
the assertion, do not increase timeouts to paper over a real issue.

## When you (the agent) are unsure

- Ask a clarifying question before generating code
- Prefer a smaller, focused change over a big refactor
- If a required file does not exist, ask before creating it

## Chain of authority

1. The user's prompt in the current conversation
2. This file (`CLAUDE.md`)
3. The specific subagent's `.claude/agents/*.md` definition
4. Playwright MCP tool defaults

When a subagent's behavior surprises you, walk down this list to find where the instruction is
coming from.
