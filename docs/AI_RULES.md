# AI Rules

## Core principle

**Understand enough to act correctly. Do not consume context unnecessarily.**

These rules are provider-agnostic. They apply to any AI agent working on this repository.

## 1. Start with targeted context

For every task:

1. Read `README.md`.
2. Read `AI_CONTEXT_MAP.md`.
3. Identify the affected area.
4. Read only the relevant project/domain documentation.
5. Inspect the source entry points identified by the map.
6. Expand to additional files only when dependencies require it.

Do not read the whole repository or every documentation file by default.

Use search/navigation to locate relevant code before opening large files. Do not repeatedly read the same context.

## 2. Match effort to risk

### Clear, localized, low-risk change
Inspect the relevant code and implement directly.

### Non-trivial, cross-cutting or high-risk change
Understand the affected flow and dependencies first. Form a concise implementation plan internally before editing.

Do not require a plan/report for every small request. The goal is efficient execution, not ceremony.

## 3. Scope control

- Modify only what is necessary for the requested behavior.
- Do not refactor unrelated code.
- Do not change architecture, persistence, domain semantics or API contracts silently.
- Reuse existing helpers, services, types and patterns when they already fit.
- Do not introduce new dependencies unless they are necessary and justified by the task.
- Do not fix unrelated findings from `AUDIT.md` merely because they are visible.

If the requested change conflicts with an existing rule or documented behavior, surface the conflict before changing the underlying contract.

## 4. Financial and domain safety

Treat portfolio data and financial calculations as high-risk.

Before changing transactions, holdings, cash, prices or performance:

- Check the relevant domain and calculation rules.
- Preserve transaction semantics and ordering.
- Do not invent fees, taxes, FX, dividends, splits or other financial behavior that the application does not currently model.
- Do not silently change how current prices, cost basis, P/L, cash or performance are derived.
- Do not alter historical transaction data unless explicitly requested.
- Be especially careful with buy/sell behavior, oversells, cash movements and embedded portfolio data.

When behavior is ambiguous and could materially change financial results, ask rather than guess.

## 5. Database and API safety

- Preserve the existing MongoDB document model unless a schema change is explicitly requested.
- Remember that portfolio assets and transactions are embedded in portfolio documents.
- Preserve ownership and authorization boundaries.
- Do not weaken validation or security to make a request easier.
- Do not expose or broaden data access beyond the requested scope.
- Avoid destructive migrations or data rewrites unless explicitly requested.

For API changes, inspect the route and its consumers before changing contracts.

## 6. UI and application behavior

- Follow existing component, styling and state-management patterns.
- Preserve existing behavior outside the requested change.
- For UI changes, trace the relevant client → API → persistence flow when the UI depends on backend behavior.
- Do not introduce a new pattern when an existing one already solves the problem.

## 7. Verification

After implementation:

- Re-read the changed code and its immediate consumers.
- Check for type errors, obvious runtime issues and contract mismatches.
- Run the project's existing lint/build/type checks when practical and relevant.
- Tests are not required by project policy; do not add a test framework or create tests unless explicitly requested.
- If verification cannot be performed, state what was and was not verified.

## 8. Documentation

Update documentation only when the change alters documented behavior, architecture, domain rules, calculations, persistence or an important workflow.

Do not create documentation for every code change.

Keep documentation concise and consistent with the implementation. If documentation and code disagree, do not silently rewrite the documentation to hide the disagreement; determine the intended behavior first when it matters.

## 9. Source vs. documentation

Documentation helps route investigation and records known behavior, but it is not a substitute for inspecting code.

When implementation and documentation disagree:

- Treat current source code as evidence of actual behavior.
- Treat domain/calculation documentation as the documented contract.
- Treat `AUDIT.md` as findings, not authorization to change anything.
- If the difference matters to the requested change, call it out and resolve the ambiguity before making a risky assumption.

## 10. Stop conditions

Ask the user instead of guessing when:

- the requested behavior is materially ambiguous;
- two valid interpretations would produce different financial/domain results;
- a change requires a schema, architecture or API-contract decision not specified by the request;
- the safest implementation would require unrelated changes outside the requested scope.

Otherwise, prefer the smallest correct implementation.
