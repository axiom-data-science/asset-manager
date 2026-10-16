# Unified Import Refactor Plan

Updated: 2026-10-14.

## Goal

Use one import UI and one progression controller for remote metadata, CSV, and
Excel workbooks. Input acquisition remains source-specific; preparation, review,
execution, errors, and retry behavior become shared.

- Preserve all existing CSV/XLSX functionality. Consolidation must not remove
  config-based field mapping or optional user-edited mapping through the UI.
- Treat field mapping as a source-neutral stage: retain configured defaults and
  optional UI adjustments for file imports, and support their use with remote
  records such as ERDDAP when configured or opted into. Mapping precedes validation.
- Simplified: after choosing inputs, one Import action advances until input or
  error resolution is required.
- Interactive: the same pipeline pauses at configured review points.
- Optional steps: configuration supplies default review/input panels; users can
  opt into additional reviews. Required inputs and safety checks cannot be hidden.

Provisional assumption: retain remote support. CSV/XLSX replaces remote discovery
and loading as the acquisition stage for file imports, not as a removal of remote
adapters. Do not retire remote functionality without confirmation.

## Current Status

The policy/readiness foundation is implemented:

- [types.ts](types.ts): `ImportWorkflowPolicy`, `ImportWorkflowInput`,
  `ImportReviewStep`, and `ImportReadinessDecision`.
- [import_all_plan.ts](import_all_plan.ts): `evaluateImportSourceReadiness`,
  configured conflict defaults, and validation evidence retained by preparation.
- Preparation without schema/validator remains available for inference, but the
  readiness evaluator does not authorize automatic writes from it.
- Automatic type creation requires both policy permission and creation permission.
- Opted-in mapping, override, and schema reviews pause before dependent work.
- Latest verification: 21 relationship tests and 186 selected import regression tests,
  TypeScript, behavior-file lint, production build, and whitespace checks passed. Authenticated UI
  error display and retry worked per user report; broader checks remain pending.

The prepared execution helper and preparation helper use this evaluator.
Document-source Import All preparation and execution/retry now call the shared
helpers. Import All now pilots Simplified/Interactive mode selection: Interactive
preserves explicit stage actions, while Simplified advances using returned plan
snapshots and stops for configured reviews, required inputs, errors, or missing-type
setup. Missing-type creation remains explicit. File integration has started with
an opt-in, current-upload-only handoff for clean standalone CSV/XLSX sources into
the same controller. Legacy execution remains available; arrays, parent/child
relationships, ignored rows, and already-started CSV imports are gated out. Tests
cover shared-controller mapped records and a selected real XLSX sheet, not the
full production file-controller/handoff UI. That UI coverage, broader file parity,
extra opt-in review/input panels, and complete composite/array UI parity remain pending.
The evaluator's `complete` result
means source documents are complete, not that session relationships have completed.
Consult the TODO/handoff for current verification totals.

Document execution helpers retain partial results on cancellation and exclude
successful/ignored records from repeat writes. `pages/all.tsx` adopts returned
partial plans, supplies one guarded retry reconciliation refresh, and stops later
sources/links when document readiness pauses or blocks. Array composition reruns
shared preparation so validation evidence matches the composed parent records.
Relationship persistence now runs only after document completion, gates writes on
ready plans and retained UUIDs, and tracks link completion independently. Its
existing duplicate lookup is reused; cancellation retains settled links and the
explicit retry selects only failed or unattempted links. The user reported working
errors/retry but an extra preparation pass. The follow-up keeps execution errors
on Import and validates retained records after either automatic type action.
Authenticated follow-up and composite/array UI verification remain pending.

Latest relationship-slice checks: 21 relationship-planning tests and 126 selected
import tests pass, TypeScript and whitespace checks pass, and scoped lint has zero errors
with the existing `sourcesById` hook-dependency warning.

Use [TODO.md](TODO.md) as the completion ledger. This document defines task scope;
do not maintain a second competing checklist here. [HANDOFF.md](HANDOFF.md) describes
current behavior, including the separate file/remote workflows that this plan will
eventually unify. Preserve those workflows during migration.

## Unauthenticated Test Harness

The first bounded harness reuses the real Import All view with fixture sources,
context, explicit eligibility, and complete in-memory service ports. It needs no
token, OIDC provider, or live backend. The separate dev entry blocks unexpected
fetches, rejects production mode, and is excluded from the normal production build.
Production authentication remains unchanged.

Use `npm run dev:import-test` and `http://127.0.0.1:4423/import-test.html` for the
fixture screen; `npm test -- src/import/pages/all.import-test.test.tsx` runs 17
automated component tests. They cover preparation/type creation, document import,
error display/link retry, discovery/link cancellation, validation/ambiguity blockers,
failed-only document retry in both modes, Simplified progression/pauses/cancellation,
and the ERDDAP preparation preview. Retry checks prove
fresh reconciliation precedes the retry write, successful documents remain intact,
and a subsequent Execute action completes links without rewriting documents.
Browser fixture verification completed type creation/import/retry without login.
The new blocker/document-retry cases have component-test evidence only; no new
visual or authenticated browser verification was performed.

The `?view=csv` fixture now reuses the real CSV mapping editor and adapter. A new UI
test covers schema/role overrides, exclusion, and retained fixed/relationship fields;
a worksheet-conversion test verifies config-only canonical-record equality with CSV.
Both run without auth or network. Actual binary XLSX bytes/File now use the real
reader, with empty-sheet omission, ordered names, malformed-byte rejection, and CSV
canonical parity. Fixture upload tests cover selected/excluded sheets and isolated
mapping editors, sharing the production selection filter. Full production selection
controller and multi-file parity remain pending. Browser DOM upload checks passed;
visual/normal-click checks remain pending after the blank screenshot/timeouts.

The `?view=erddap` read-only fixture now exercises configured MODL composite adapters
and shared schema preparation against in-memory catalog/info responses. Tests cover
normalization/coercion, schema-name projection, source/variable preservation, and
lazy fetch-once behavior; the matched ID fallback now respects schema property case.
It does not implement arbitrary config/UI remapping or the full Import All workflow.

Extend this harness before retiring workflows: complete CSV/XLSX mapping/upload parity,
shared ERDDAP field remapping/controller integration, automatic setup-dialog coverage,
and export preparation
after identifying its owning path. Manual auth-backed type selection/form is not
available in the current fixture. Keep a smaller real-backend authorization and
integration verification gate; fixture results do not establish live permissions.

## Guardrails

- Stay under `src/import` unless an explicitly identified integration requires more.
- Mark proposed changes elsewhere with an **Outside import** note before editing.
- Preserve existing adapters, parsers, schema helpers, conflict policies, and tests.
- Preserve CSV/XLSX parsing, sheet selection, single/multi-file behavior, field
  mapping, fixed fields, discriminator choices, and parent/array relationships.
  Keep config-only mapping usable without forcing a UI review; retain optional
  UI mapping and its existing override behavior in both workflow modes.
- Do not modify the forms repository, database/API, or deploy the merge RPC.
- Keep automatic type creation opt-in; preserve pinned schemas and permissions.
- Invalid records and ambiguous matches must not silently pass in Simplified mode.
- Editing mapping, overrides, schema, or type invalidates dependent validation,
  reconciliation, and review acknowledgments.
- Preserve successful writes on cancellation or failure. Retry only failed or
  unattempted work; refresh reconciliation before retrying document writes.
- Do not treat ignored, failed, or blocked work as successful session completion.
  Explicitly ignored documents may be settled, but dependent links still need review.
- Relationship work starts only when its required document UUIDs are available.
- Reuse existing batching and cancellation semantics; do not promise an atomic import.
- Preserve unrelated and concurrent worktree changes. No commits unless requested.
- Automated tests do not substitute for user-performed authenticated UI verification.

Authorization during migration preserves existing behavior: authenticated users
may attempt operations, and backend policies enforce actual write/create rights.
There is no frontend capability mapping in the current auth hook. Do not present
token presence as proof of permission or add new role/scope restrictions without
approval. Automatic creation still requires explicit opt-in and a creation-enabled
caller; the existing preparation action does not enable it.

## Budget And Stop Rules

Task budgets below are editable advisory targets, not measured forecasts or hard
caps. They cover total input/output context for the coordinator and delegated work,
including tool results, tests, retries, and review. Exact consumption is not visible
here; never claim a remaining balance or that a hard limit was enforced. Copilot
premium-request billing may differ from token usage.

- Maximum implementation sub-agents per task: one. Do not launch additional agents,
  retry with a different model, or start the next task without approval.
- Maximum failed repair attempts: two after the initial focused validation fails.
  Stop earlier when the defect requires work outside the task boundary.
- Checkpoints: after targeted routing, the first edit/test cycle, and each repair.
  Keep updates short; state progress and blockers, not invented token counts.
- If a task cannot fit one bounded implementation and its checks, propose smaller
  slices before editing. Do not spend the budget mapping the whole repository.
- Stop on acceptance success, unresolved failure after the repair limit, a required
  scope/model/agent expansion, or a user stop request. If reliable usage telemetry
  becomes available, stop before starting work that would exceed the agreed target.
- On a budget concern, stop at a safe checkpoint and ask to continue or split the
  task. Without telemetry, checkpoints limit activity, not actual token consumption.
- Do not omit tests or safety checks to fit a budget. If interrupted, preserve
  existing work and report changed symbols, checks run, remaining risks, and the
  smallest next action. Unverified work stays incomplete in the TODO.
- Stronger-model reviews require approval and their own agreed advisory budget;
  count them toward the parent task's total unless a separate budget is authorized.

## Task Sequence

Run tasks in order. Each task should be a separate bounded request. If a task still
requires several behavior changes, split it further before editing.

### Task 2A: Prepared-Source Controller

Depends on: completed policy/readiness foundation.

Advisory token budget: 10,000 total tokens.
Stop condition: acceptance checks pass, or an unimplemented stage is needed; return
an explicit paused decision rather than expanding into preparation or UI work.
The common agent/repair limits also apply.

Anchors: [import_all_plan.ts](import_all_plan.ts),
[import_all_plan.test.ts](import_all_plan.test.ts), [types.ts](types.ts).

Implement the smallest source-neutral progression function for an already prepared
source. Reuse `evaluateImportSourceReadiness` and `executeImportAllSource` with
injected services. Pause on `needs-input` or `blocked`; execute only when permitted.
Apply configured conflict defaults deliberately so review and execution agree.
Return updated plans/results and the next decision; do not discard state on pause.
Do not implement acquisition, routes, type-creation services, or UI in this task.
Use a small dedicated controller module only if existing modules are unsuitable.

Acceptance: clean Simplified executes; Interactive/optional reviews pause; missing
inputs, permission, stale validation, invalid data, and ambiguity prevent writes.
Record why missing stages cannot advance yet rather than loop indefinitely.

### Task 2B: Preparation And State Ownership

Depends on: 2A.

Advisory token budget: 15,000 total tokens.
Stop condition: acceptance checks pass, or state ownership/service reuse requires
broader redesign; hand off the specific decision before editing additional layers.
The common agent/repair limits also apply.

Anchors: [import_all_plan.ts](import_all_plan.ts),
[state/importState.ts](state/importState.ts),
[state/importState.test.ts](state/importState.test.ts).

Choose one authoritative workflow state owner and record that choice in the handoff.
Extend progression to prepare, resolve configured type/schema, validate, and
reconcile using existing helpers. Do not keep bidirectional copies of plan/session
state. Invalidate dependent evidence and review acknowledgments after edits.
Automatic type creation uses an injected existing service and requires explicit
configuration and actual permissions. Keep schema inference separate from validated
readiness. Preserve explicit privileged invalid-record inclusion as a distinct
existing behavior, not as an unattended default.

Acceptance: missing setup pauses; supplying it resumes; edited inputs require fresh
validation/reconciliation; pinned schema selection remains authoritative.

### Task 2C: Cancellation, Retry, And Relationships

Depends on: 2B.

Advisory token budget: 15,000 total tokens.
Stop condition: acceptance checks pass, or retry correctness requires database/API
changes; report the limitation instead of implementing backend work.
The common agent/repair limits also apply.

Anchors: [import_all_plan.ts](import_all_plan.ts),
[relationship_planning.ts](relationship_planning.ts),
[relationship_planning.test.ts](relationship_planning.test.ts).

Retain successful document/link results and UUIDs. Resume only failed/unattempted
operations after current reconciliation. Forward cancellation and stop later work.
Keep document and relationship completion distinct; preserve parent-first
dependencies and independent link retries. Resolve blocked decisions through
explicit user changes/retry actions, not uncontrolled automatic retry loops.

Progress (2026-10-12): the bounded document helper slice is implemented in
`import_all_plan.ts`. Explicit retry keys refresh and execute only failed or
unattempted records; settled results and UUIDs remain retained. Cancellation
returns completed results and does not start later batches. Current schema,
validation, permission/eligibility, ambiguity, and conflict-policy readiness
checks remain in force. The `pages/all.tsx` caller now uses guarded document
execution/retry, adopts returned partial plans, and stops later sources/links on
pause, block, or cancellation. Relationship persistence/retry behavior is unchanged;
shared relationship-readiness integration remains separate.

Acceptance: pause/cancel/retry does not repeat successful writes; relationship
failures remain visible and retryable without rerunning documents.

### Task 3: Remote Import All Pilot

Depends on: 2C.

Advisory token budget: 15,000 total tokens.
Stop condition: automated pilot checks pass; hand off authenticated UI checks to
the user. Do not migrate CSV, remaining routes, or unrelated sources in this task.
The common agent/repair limits also apply.

Anchors: [pages/all.tsx](pages/all.tsx), [config.ts](config.ts),
[import_all_plan.test.ts](import_all_plan.test.ts).

Replace page-specific button-to-button orchestration with controller calls while
keeping the existing layout initially. Add mode/config wiring and actionable pause
states. Preserve discovery, selection/filtering, edited URLs, lazy loading, and
progress. Preserve composite fetch-once behavior and schema pinning wherever these
sources enter the shared controller; do not silently move excluded ERDDAP sources
into Import All.

Acceptance: existing remote behavior is preserved; configured clean sources can
advance automatically; intervention and resume work in the pilot UI.

### Task 4: CSV And Workbook Integration

Depends on: 3.

Advisory token budget: 18,000 total tokens.
Stop condition: automated file integration checks pass; hand off authenticated
parity checks. If CSV and workbook wiring need separate changes, propose a split.
The common agent/repair limits also apply.

Anchors: [pages/csv.tsx](pages/csv.tsx),
[csv_orchestration.ts](csv_orchestration.ts),
[csv_orchestration.test.ts](csv_orchestration.test.ts),
[workbook.test.ts](workbook.test.ts).

Feed locally loaded canonical records into the same controller. Reuse parsing,
sheet selection, mapping, discriminator choices, and fixed fields. Compose array
rows into parents before validation; array sources are not standalone documents.
Preserve unmatched-row errors, parent-first ordering, optional sources, and existing
parent lookup behavior. Keep file sessions self-contained during migration.

Acceptance: CSV/XLSX results match existing behavior in both modes; file users are
not redirected to the old remote page to resolve relationships. Verify parity for
config-only mapping and optional UI mapping/overrides, including fixed fields and
discriminator choices. Do not remove existing file workflows until automated
regression checks and user-performed mapping parity checks confirm preservation.

### Task 5A: Shared Presentation

Depends on: 4.

Advisory token budget: 20,000 total tokens.
Stop condition: automated presentation checks pass and UI verification steps are
provided; wait for user-confirmed parity before removing old workflows. Propose
smaller source-picker, records-view, or composite-flow slices if needed.
The common agent/repair limits also apply.

Anchors: [components/import_wizard.tsx](components/import_wizard.tsx),
[pages/all.tsx](pages/all.tsx), [pages/csv.tsx](pages/csv.tsx),
[pages/import_records_page_impl.tsx](pages/import_records_page_impl.tsx).

Use one source picker, records/errors surface, progress view, and retry controls.
Present Source -> optional Configure/Review -> Import without separate controllers
for each mode. Keep required input panels visible when needed. Preserve existing
visual conventions and responsive behavior. Integrate remaining individual and
composite remote flows; retain pinned schemas and configured overrides.
Reuse the mapping stage for canonical records regardless of acquisition source,
including ERDDAP. Expose its UI only when required or opted into; configured mapping
must still run when the UI panel is skipped, before schema validation/reconciliation.

Acceptance: one usable workflow for each input type, with no lost source-specific
capabilities. Verify equivalent mapping behavior for files and configured remote
sources, including ERDDAP. Obtain user-performed authenticated parity checks before
removal.

### Task 5B: Routes And Navigation

Depends on: verified 5A.

Advisory token budget: 8,000 total tokens.
Stop condition: route compatibility checks pass, or verified 5A/user approval for
the stated Outside import changes is missing; do not proceed with route removal.
The common agent/repair limits also apply.

**Outside import:** [../App.tsx](../App.tsx) and
[../components/app-sidebar.tsx](../components/app-sidebar.tsx).

Route existing entry points into the shared experience with compatible wrappers or
redirects. Preserve meaningful source-specific links/configuration. Do not delete
working old routes before replacements are validated.

Acceptance: old links still reach the intended source/configuration; navigation
opens the shared workflow without resets or lost configuration.

### Task 6: Cleanup And Closeout

Depends on: verified 5B.

Advisory token budget: 6,000 total tokens.
Stop condition: cleanup checks pass and remaining verification is documented, or
a failure reveals a new behavioral defect; create a bounded follow-up rather than
repairing unrelated behavior. Keep pending authenticated checks incomplete.
The common agent/repair limits also apply.

Remove superseded orchestration and duplicate state, not useful adapters or tests.
Update [TODO.md](TODO.md) and [HANDOFF.md](HANDOFF.md). Report remaining authenticated
verification separately; never mark it complete from automated checks alone.

## Verification Commands

Run from the `asset-manager` root. Choose the narrow test file for the current task
first, immediately after the first behavioral edit:

```bash
npm test -- src/import/import_all_plan.test.ts
```

At controller/source integration gates:

```bash
npm test -- src/import/import_all_plan.test.ts src/import/csv_orchestration.test.ts src/import/state/importState.test.ts src/import/workbook.test.ts src/import/relationship_planning.test.ts
npx tsc -b --pretty false
git diff --check
```

Lint touched TypeScript files. At final integration, run `npm run build` and
`npm run lint`; report unrelated baseline failures without opportunistic repairs.
Add source-specific existing tests, such as ERDDAP tests, when those paths change.

User-performed authenticated checks: equivalent CSV, workbook, remote and composite
imports in both modes; required/opt-in pauses; corrected-input resume; conflicts;
parent/array/link behavior; cancellation; failed-only document and link retries.

## Using A Cheaper Model

In VS Code Copilot Chat, choose Agent mode for implementation, then choose a model
with a lower displayed premium-request multiplier/cost in the model picker. Model
availability and billing depend on your plan and may change; verify the current
display rather than assuming a named model is cheapest. Auto selection is not a
guarantee of the lowest cost. A read-only Explore agent is not an implementation
agent; an agent role and the selected language model are different choices.

Use one task per fresh chat, attach this document and only the listed anchor files,
and supply the task ID. Do not ask the model to complete the entire refactor in one
request. Do not run agents concurrently on overlapping files.

Start with this prompt:

```text
Implement Task 2A from src/import/REFACTOR_PLAN.md only.
Advisory budget: 10,000 total tokens across coordinator and delegated work.
This is not a hard cap; do not claim exact usage or remaining tokens.
Read its Current Status, Guardrails, Budget And Stop Rules, and Task 2A sections,
plus the working
agreements in src/import/TODO.md. Inspect only the named anchors and nearby tests
unless a concrete blocker requires another dependency.
Use at most one implementation sub-agent, only if delegation is requested.
Do not launch extra agents, switch models, or start another task without approval.
Preserve existing changes. No UI, routes, acquisition, database, or forms-repo work.
Make a small implementation and immediately run the focused plan tests.
Also typecheck and lint touched files. Stop once Task 2A acceptance checks pass.
Stop after two failed repair attempts or if the task needs scope expansion.
At routing/edit/test checkpoints, report blockers without invented token counts.
Do not skip validation to fit the budget; hand off unverified work as incomplete.
Update TODO.md and add a short HANDOFF.md entry with decisions, changed symbols,
test outcomes, and the next task. Distinguish tests from pending authenticated UI
verification. If blocked, report the specific blocker without expanding scope.
```

For subsequent tasks, replace the task ID, budget, stop condition, and exclusions
with that task's fields. Confirm a different budget explicitly before starting.
Keep handoffs short and report only decisions, checks, and the next action. Do not
paste full files or large logs back into chat.

Use a stronger model for a bounded review of state ownership, retry correctness,
and cross-source integration before Tasks 3 and 5B, or when the same focused check
fails twice without a clear local fix. Review the changed code and tests, not the
entire repository. Cheaper requests are useful only if they avoid costly rework.