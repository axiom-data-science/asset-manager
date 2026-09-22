# Import Refactor TODO

## Working agreements

- [x] Keep import behavior behind source-neutral contracts rather than adding source-specific page logic.
- [x] Add or update Vitest tests with each behavioral change.
- [ ] Keep changes under `src/import` unless sharing existing behavior avoids duplication.
- **Outside import:** CSV route and navigation require `src/App.tsx` and `src/components/app-sidebar.tsx` changes.
- [ ] Mark every proposed change outside `src/import` with an **Outside import** note before implementation.
- [ ] Complete remote-source and CSV workflows before adding XLS/XLSX support.
- [ ] Add XLS/XLSX only through the same adapter API used by CSV.
- [ ] Prefer a guided, reviewable workflow over exposing every setting on one screen.

## 1. Establish tests and stabilize the current workflow

- [x] Install and configure Vitest with a `test` script and shared test setup.
  - **Outside import:** `package.json`, lockfile, and likely `vite.config.ts` or a test config.
- [ ] Add unit tests for source adapters, canonical record conversion, validation, reconciliation, and merge behavior as those modules are introduced.
- [ ] Add focused tests for the existing CSV parser before connecting it to imports.
- [x] Fix Import All status keys so they use source `type` values rather than array indexes.
- [x] Remove render-time timers and fabricated results from Import All.
- [x] Use the edited detail-root URL for preload and import requests.
- [x] Reset import state before a new source load so stale records are not displayed.
- [x] Surface remote loading errors in the import UI.
- [x] Forward cancellation through both source loading and document persistence where supported.
  - **Outside import:** `src/manage/document/services.ts` may need an optional `AbortSignal`; preserve existing callers.
- [x] Show per-record persistence errors and failed counts.
- [x] Add a top-level select/unselect-all control to Import All Sources.
- [x] Open missing-type setup from Import All in a focused dialog using the shared type/schema and type-creation components.
- [x] Allow missing-type sources to prepare records for schema inference before type creation.
- [x] Add one-click automatic type creation from prepared records with enums removed.
- [x] Add page-level automatic creation for all missing types, bypassing the setup modal.
- [x] Surface Import All errors in one concise user-facing view, implemented as an Errors tab.
- [x] Batch Import All preparation requests and show per-source progress.
- [x] Yield between preparation batches so progress can repaint while sources load.
- [x] Show overall and per-source execution progress while Import All writes documents.
- [x] Batch Import All document writes in groups of 10 with a 100 ms abort-aware pause between batches.
- [x] Remove leftover `debugger` statements from Import All execution.
- [x] Show a `Pending type` placeholder for sources without a type.
- [x] Show prepared records in the type-setup dialog.
- [x] Render per-source changed-record actions in a right-side `react-virtuoso` list.

### UI simplification

- [x] Replace the current loosely coupled import tabs with a visible step-based flow: Preload records, Choose type and validate, Import.
- [ ] Refactor single-item import to simplify the UI and remove unnecessary nested workflow controls.
- [ ] Debug object-type creation in the simplified single-item import flow, including type/schema state refresh and failure reporting.
- Keep endpoint overrides and batch tuning in an advanced settings disclosure.
- Show a compact source summary after a step is complete instead of keeping all controls visible.
- Open type setup from Import All in a focused modal showing only type selection, schema setup, and the return action.
- Support a simple one-button import path for prepared sources, with automatic type creation only when explicitly enabled.

## 2. Introduce a source-neutral import pipeline

- [x] Define an `ImportSourceAdapter` contract for discovery and canonical record loading.
- [x] Define a canonical import record containing source identity, external ID, document fields, raw data, and provenance.
- [x] Refactor existing Axiom source functions into adapters without changing their observable output.
- [x] Replace shared global import atoms with a source/session-scoped import session.
- [x] Track explicit record states: discovered, loaded, validated, reconciled, ready, imported, related, and failed.
- [x] Make fully loaded canonical records the single input to schema inference, validation, review, and persistence.
- [x] Preserve source-specific options as adapter configuration rather than UI branching.

### UI simplification

- Use one reusable source picker and one records table for remote sources and uploaded files.
- Display state and actionable errors in the records table rather than separate result panels.
- Keep selection, filtering, and retry controls in a single table toolbar.

## 3. Make type selection and validation authoritative

- [x] Move selected type, selected or inferred schema, and validation results into the import session.
- [ ] Keep automatic type selection by source type when a matching type exists.
- [ ] Keep inferred schemas editable before type creation.
- [ ] Ensure newly created types and schemas are immediately available to the active session.
  - **Outside import:** reuse the existing object-type creation service/component if possible; changes under `src/manage/object_type` require regression checks for normal type creation.
- [ ] Allow validation of all, selected, or sampled records.
- [ ] Update `@axdspub/axiom-ui-forms` `schemaHelpers.validateAgainstSchema` to return a consistent validation-error array (`[]` for valid values), update its TypeScript declaration, and add library tests for primitive and nested schema violations. After releasing that update, switch `oikos_schemas.test.ts` to the shared helper and remove the temporary direct `ajv` test dependency.
- [x] Prevent invalid records from being imported by default.
- [x] Allow users with appropriate permissions to explicitly include invalid records.
- [ ] Remove or reconcile enum controls with Quicktype***REMOVED***s current `no-enums` configuration.
- [x] Ensure automatically created Import All schemas strip all enum constraints.
  - UI verification still needed: create a type automatically and inspect the saved default schema for enum properties.

### UI simplification

- Combine type selection, schema inference, and schema editing into one step.
- Show validation counts first; reveal record-level errors on demand.
- Provide clear actions: revalidate, exclude invalid, and return to schema editing.

## 4. Add duplicate discovery and conflict policies

- [x] Define configurable identity rules with external ID as the default.
- [x] Allow each source adapter to override its identity rule.
- [x] Persist provenance sufficient to identify the source and external ID on later imports.
  - **Outside import:** this may require a document data convention, object-type metadata, or a database migration. Decide before implementation.
- [x] Query existing documents in batches before persistence.
- [x] Classify records as new, exact duplicate, conflicting, or ambiguous.
- [x] Support per-record and bulk actions: overwrite, merge, and ignore.
- [x] Implement merge as a deep merge where incoming non-empty values win and empty incoming values preserve existing values.
- [x] Use client-side authenticated `PATCH` initially; retain an atomic PostgREST RPC as concurrency hardening.
  - **Outside import:** an RPC or database migration is preferred for concurrency safety and requires deployment coordination.
- [x] Add a per-source merge execution setting for client `PATCH` or a configured atomic PostgREST RPC.
- [ ] Deploy and configure the atomic merge RPC described in `src/import/MERGE_RPC.md`.
  - **Outside import:** requires a PostgreSQL function exposed through PostgREST and deployment environment configuration.
- [ ] Revisit 409 conflicts where the unique `(object_type_uuid, slug)` row is not returned by duplicate discovery.
  - Keep the current user-facing Ignore and Return to duplicate check recovery actions.
  - Determine whether the cause is row-level visibility, a race after review, or a PostgREST JSON-path query mismatch.
  - Add a type-and-slug reconciliation RPC only if needed; it must enforce the current user***REMOVED***s select/update permissions and must not allow updates to inaccessible rows.
  - **Outside import:** may require PostgREST policy changes or a permission-aware PostgreSQL RPC.
- [x] Block import for ambiguous external-ID matches and require manual resolution.
- [ ] Add tests for nested objects, arrays, nulls, empty strings, missing values, and concurrent-update behavior.

### UI simplification

- Present one reconciliation summary with counts for new, overwrite, merge, ignore, and unresolved.
- Default bulk policies by source, then let users override exceptional rows.
- Hide records with no conflict unless the user expands them.

## 5. Replace Import All with a reviewable multi-source plan

- [x] Build Import All discovery from the same adapters as individual imports.
- [x] Let users enable all or selected configured sources.
- [x] Discover source counts before loading every full record where the source permits it.
- [x] Load canonical full records for selected discovered sources during plan preparation.
- [x] Validate prepared records against each matching type***REMOVED***s default schema.
- [x] Run duplicate reconciliation for valid prepared records without writing documents.
- [x] Apply per-source bulk conflict defaults and exceptional row overrides during execution.
- [x] Expand the prepared plan from counts, source errors, validation, and conflicts to include relationship dependencies.
- [x] Require source discovery and plan review before execution.
- [ ] Execute related sources through a dependency-aware task or resolve counterpart documents during creation; choose and implement one approach.
- [x] Preserve per-source and per-record execution results for retry review.
- [x] Remove the current mock results and simulated completion behavior.
- [ ] Add a simple one-button import path for prepared sources.
- [ ] Decide whether automatic type creation is allowed when a source type is missing; prefer pre-populated types by default.
- [x] Add an explicit page-level `Create missing types` action for prepared sources.
- [ ] Add a simple one-button import path for prepared sources after type setup and review are complete.

### Completed item verification: controlled Import All execution

- Automated: `src/import/import_all_plan.test.ts` passes (6 tests); `npm run build` passes.
- UI verification still needed with authenticated PostgREST and configured source endpoints:
  - Discover two or more sources and confirm each source keeps its own count and status.
  - Prepare a source containing new, changed, invalid, and ambiguous records.
  - Confirm the Execute button stays disabled until all enabled sources are prepared and type/schema blockers are resolved.
  - Change a source conflict default, override one changed row, execute, and confirm imported/ignored/blocked/failed counts remain visible after completion.
  - Confirm a late slug conflict reports failure and does not overwrite the existing document.

Suggested next step: should I add retry controls for failed Import All records next? Reply `yes` to continue with retry behavior, or `no` to pause for live UI verification.

### Completed item verification: failed-record retry controls

- Automated: `src/import/import_all_plan.test.ts` passes (7 tests); `npm run build` passes.
- UI verification still needed:
  - Force one record to fail while another succeeds.
  - Confirm `Retry failed` appears for that source and successful records are not rerun.
  - Confirm the failed record***REMOVED***s result is replaced by the retry result while the other result remains unchanged.
  - Confirm retry remains disabled while another execution is running.

Suggested next step: should I make retry re-run duplicate reconciliation for failed records before writing? Reply `yes` to continue with retry reconciliation, or `no` to pause for live UI verification.

### Completed item verification: retry reconciliation

- Automated: `src/import/import_all_plan.test.ts` passes (8 tests); `npm run build` passes.
- UI verification still needed:
  - Force a write failure, then create or change the same document before selecting `Retry failed`.
  - Confirm retry refreshes the failed row and changes its classification when appropriate.
  - Confirm a newly ambiguous row is blocked rather than written.
  - Confirm successful rows from the original execution remain untouched.

Suggested next step: should I start relationship planning and persistence next? Reply `yes` to continue with relationships, or `no` to pause for live UI verification.

### Follow-up tasks from current UI testing

- [ ] Investigate missing relationships reported after Import All execution. (Deferred by current work decision.)
  - Related records must be loaded in dependency order; loading a child before its parent can prevent the relationship from being created.
  - Compare `relationships ready`, `relationship blockers`, and persisted link results.
  - Check missing parents, identity-field mismatches, predicate lookup, and source coverage.
  - Add focused tests for the observed missing case before changing matching behavior.
- [x] Add a concise Import All error view as an Errors tab.
  - Include source discovery, preparation, validation, document, and relationship errors.
  - Keep per-source and per-record context, with retry actions where available.

Suggested next step: should I investigate the missing relationships first? Reply `yes` to continue, or `no` to pause for UI verification.

### UI simplification

- Use a compact source list with status, record count, warnings, and one configuration action per source.
- Put global defaults at the top and show only source-specific overrides inline.
- Use the same review and execution views for single-source and Import All workflows.

## 6. Add relationship planning and persistence

- [x] Read relationship candidates from object-type `expected_child_types` metadata.
- [x] Support provenance identity by default and source-adapter match fields.
- [x] Classify ready, missing-parent, ambiguous-parent, and invalid-rule plans before writes.
- [x] Allow source adapters to define relationship rules without changing the backend object-type contract.
- [x] Resolve relationships from canonical external identities before execution for the current Import All plan.
- [x] Normalize Oikos service payloads to snake_case at the import boundary, including `layer_group_id` for layer/group matching.
- [x] Add self-contained static Oikos schemas for layers, layer groups, and modules.
- [ ] Detect missing parents, ambiguous matches, cardinality violations, and cycles during review.
- [ ] Persist documents first and retain the resulting document UUID map.
- [x] Persist documents first and retain the resulting document UUID map.
- [x] Persist ready relationships in a separate phase with independent per-link results.
  - **Outside import:** reuse the existing relationship PostgREST service or extract a shared service from document creation; regression-test normal document creation.
- [x] Add UI retry controls for failed relationship writes without rerunning documents.
- [x] Check for an existing relationship before creating or retrying a link.
- [x] Verify database protection for duplicate relationships.
  - Confirmed unique constraint on `from_document_uuid`, `to_document_uuid`, and `predicate_uuid`.
- [x] Deduplicate equivalent backend and source-adapter relationship rules before planning.
- [x] Deduplicate Oikos module candidates repeated across layer groups.
- [x] Match Oikos module UUIDs to layer-group `module_uuid` values.

### Completed item verification: relationship planning and persistence foundation

- Automated: `src/import/relationship_planning.test.ts` and Import All tests pass (15 tests); `npm run build` passes.
- UI verification still needed:
  - Prepare parent and child sources whose external identities match and confirm the ready relationship count.
  - Prepare a child without a matching parent and confirm it appears as a relationship blocker.
  - Prepare duplicate parent identities and confirm the relationship is classified as ambiguous rather than written.
  - Confirm relationship counts reset when a source is rediscovered or re-prepared.
  - Execute a ready parent/child pair and confirm the relationship is written child-to-parent.
  - Force a relationship write failure and confirm link failures remain separate from document failures.
  - Confirm the `Retry failed links` button appears beside link counts only after a link failure.
  - Confirm retry disables the button while links are being written and does not rerun document imports.
  - Confirm a successful retry changes the failed count to zero and increments links created.
  - For relationship checks, use **Import All Sources**, not the individual source***REMOVED***s `Import Records` tab.
  - In Import All, include the parent and child sources, prepare the plan, execute it twice, and confirm the summary shows `links already existed` on the second run without adding duplicate links.

Suggested next step: should I move on to the CSV import adapter? Reply `yes` to continue, or `no` to pause for live UI verification.

### UI simplification

- Show relationships as a review summary grouped by type and rule.
- Focus the user on unresolved and invalid links instead of listing every successful match.
- Keep source overrides adjacent to the relationship rule they replace.

### Next relationship design decision

- [ ] Decide whether related remote sources should be grouped into one dependency-aware import task or whether each document creation should resolve an already-created counterpart.
- [ ] Support first imports where both parent and child documents are new.
- [ ] Support imports where only the parent or only the child already exists.
- [ ] Support source selection in either order without losing relationship planning or persistence.
- [ ] Verify layer/layer-group relationships across first import, repeat import, partial existing data, and retryable failures.
- [ ] Carry the chosen relationship behavior into the multi-file CSV import design.

### Import All execution follow-up

- [x] Add overall and per-source progress bars during document execution.
- [x] Batch document writes while preserving per-record results and failed-record retry behavior.
- [ ] Verify progress bars, batch pacing, cancellation, and retry behavior in the authenticated UI.

## 7. Add CSV through the common adapter API

- [x] Add a CSV file source adapter using `src/lib/csv.ts`.
  - **Outside import:** reuse the parser as-is initially; parser changes require dedicated tests because other features may consume it later.
- [x] Add file selection, encoding/error handling, and a parsed preview using the existing file uploader.
- [x] Add header-row and column mapping controls.
- [x] Add a dedicated CSV mapping step for label, description, slug, external ID, and document data fields.
- [x] Skip the CSV preload step because uploaded rows are already available as canonical records.
- [ ] Skip additional CSV steps when filename, headers, mappings, and an existing type/schema provide enough information to proceed safely.
- [x] Allow existing-type selection or automatic type/schema creation from CSV rows. The filename supplies the default type/schema name, and existing intended slugs are checked before creation.
- [ ] Support sample, selected, and full validation.
- [x] Run CSV records through the same reconciliation, review, and persistence phases as remote records.
- [x] Derive filename-based type slugs with underscores to satisfy the database slug constraint.
- [x] Add `public/test-metadata.csv` as a local UI verification fixture.
- [ ] Allow multiple CSV files in one import session, treating each spreadsheet as a source row with its own type and mapping.
- [ ] Support parent/child joins between uploaded CSV files using object-type rules with per-file overrides.
- [ ] Resolve multi-spreadsheet imports in dependency order so parent spreadsheets are loaded before related child spreadsheets.
- [ ] Preserve cross-spreadsheet identity and relationship diagnostics when a parent file is missing, duplicated, or loaded out of order.
- [ ] Add parser and adapter tests for quoted cells, duplicate/blank headers, dates, numbers, missing columns, large files, and malformed input. (Adapter coverage started; parser edge-case coverage remains.)

### UI simplification

- Treat each uploaded file as a source row rather than opening a separate CSV-only workflow.
- Infer mappings and types, showing only uncertain mappings for confirmation.
- Reuse the standard records, validation, conflict, relationship, and review screens.

### Completed item verification: Import All type setup dialog

- Automated: focused Import All and relationship tests pass (15 tests); `npm run build` passes.
- UI verification still needed:
  - Open `Set up type` from a missing-type source and confirm a dialog opens without leaving Import All.
  - Confirm the dialog contains type selection/schema setup and type creation, but not the full source-loading/import workflow.
  - Confirm `Create automatically` appears next to the type form only after a schema exists.
  - Click it and confirm a type and default schema are created without additional input, then confirm the source setup state refreshes.
  - Confirm `Create missing types` appears on the main Import All page after preparation and creates all missing types without opening the modal.
  - Confirm the dialog lists prepared records on the left before schema inference.
  - Confirm sources without types show `Pending type` while preparation is incomplete.
  - Confirm each source shows `N of M records loaded` during preparation without freezing other source rows.
  - Confirm changed records appear in a right-side scroll area and scrolling it does not move later sources.
  - Confirm `Apply to all...` changes every changed record in that source.
  - Confirm overall preparation progress updates while batches are loading.
  - Select an existing type, close the dialog, and confirm the Import All page reflects the type after context refresh.
  - Create a type from the prepared records, close the dialog, and confirm the source no longer shows `Set up type`.
  - For a missing type, confirm `Prepare review` loads records first; then `Set up type` opens without a schema-inference error.

Suggested next step: should I add the one-button import path for prepared sources? Reply `yes` to continue, or `no` to pause for UI verification.

## 8. Add XLS/XLSX only after CSV is complete

- [ ] Extract a tabular-source adapter API from the completed CSV adapter.
- [ ] Verify that the API represents workbook name, sheet name, headers, rows, and mapping without CSV-specific assumptions.
- [ ] Select an XLS/XLSX parsing library based on browser support, maintenance, bundle size, and licensing.
  - **Outside import:** dependency and lockfile changes will be required.
- [ ] Implement each worksheet as a tabular source using the CSV adapter API.
- [ ] Support selecting multiple sheets and assigning one type per sheet.
- [ ] Reuse cross-source relationship joins for parent/child sheets.
- [ ] Add workbook tests for multiple sheets, formulas/results, date cells, blank rows, duplicate headers, and large workbooks.

## Completion criteria

- [ ] Individual remote, Import All, and CSV imports use one pipeline.
- [ ] Every imported record has a durable result and actionable failure information.
- [x] Validation results control import eligibility.
- [ ] Existing records are detected before writes and receive an explicit conflict policy.
- [ ] Relationships are planned before writes and persisted in a retryable phase.
- [ ] Vitest covers the source-neutral business logic and critical adapters.
- [ ] XLS/XLSX begins only after the CSV adapter API has proven reusable.
