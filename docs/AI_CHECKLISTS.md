# AI Checklists

Use these checklists only for **non-trivial or high-risk changes**. They are investigation aids, not mandatory files to inspect for every task.

They do not require tests.

## Transactions

Before changing transaction behavior, verify:

- [ ] `Transaction` semantics in `DOMAIN.md`
- [ ] persistence shape in `DATABASE.md`
- [ ] affected formulas/metrics in `CALCULATIONS.md`
- [ ] relevant flow in `WORKFLOWS.md` when the end-to-end flow changes
- [ ] transaction API and its direct consumers
- [ ] transaction ordering/date handling
- [ ] buy/sell behavior and oversell implications
- [ ] cash transaction behavior
- [ ] embedded portfolio asset/transaction persistence
- [ ] authorization/ownership if the API boundary changes

## Portfolio / persistence

- [ ] Identify the exact collection/document being changed
- [ ] Preserve ownership boundaries
- [ ] Check all direct readers/writers of the changed field
- [ ] Check whether embedded data must remain consistent
- [ ] Avoid destructive rewrites unless explicitly requested

## Calculations

- [ ] Read the relevant section of `CALCULATIONS.md`
- [ ] Identify the exact source function(s)
- [ ] Check transaction ordering and price source
- [ ] Check effects on holdings, cash, P/L and performance
- [ ] Confirm whether the requested behavior is new business logic or a correction of existing logic
- [ ] Do not introduce financial concepts the current model does not support

## Auth / API

- [ ] Identify authentication and ownership checks
- [ ] Inspect the route and direct consumers
- [ ] Preserve request/response contracts unless explicitly changing them
- [ ] Check validation and error behavior
- [ ] Avoid broadening access or weakening authorization

## Pricing / external integrations

- [ ] Identify the provider/service used
- [ ] Inspect current normalization and error handling
- [ ] Preserve existing fallback behavior unless requested
- [ ] Check how current prices flow into calculations
- [ ] Avoid changing provider contracts without need

## UI / cross-cutting

- [ ] Identify the UI entry point
- [ ] Trace the relevant client → API → persistence flow
- [ ] Reuse existing components/helpers/patterns
- [ ] Check direct consumers of changed API data
- [ ] Preserve unrelated UI behavior
