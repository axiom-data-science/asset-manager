# Import Refactor TODO

## Working agreements

- [ ] Keep import behavior behind source-neutral contracts rather than adding source-specific page logic.
- [ ] Add or update Vitest tests with each behavioral change.
- [ ] Keep changes under `src/import` unless sharing existing behavior avoids duplication.
- [ ] Mark every proposed change outside `src/import` with an **Outside import** note before implementation.
- [ ] Complete remote-source and CSV workflows before adding XLS/XLSX support.
- [ ] Add XLS/XLSX only through the same adapter API used by CSV.
- [ ] Prefer a guided, reviewable workflow over exposing every setting on one screen.

## 1. Establish tests and stabilize the current workflow

- [x] Install and configure Vitest with a `test` script and shared test setup.
  - **Outside import:** `package.json`, lockfile, and likely `vite.config.ts` or a test config.
- [ ] Add unit tests for source adapters, canonical record conversion, validation, reconciliation, and merge behavior as those modules are introduced.
- [ ] Add focused tests for the existing CSV parser before connecting it to imports.
- [ ] Fix Import All status keys so they use source `type` values rather than array indexes.
- [ ] Remove render-time timers and fabricated results from Import All.
- [x] Use the edited detail-root URL for preload and import requests.
- [x] Reset import state before a new source load so stale records are not displayed.
- [x] Surface remote loading errors in the import UI.
- [x] Forward cancellation through both source loading and document persistence where supported.
  - **Outside import:** `src/manage/document/services.ts` may need an optional `AbortSignal`; preserve existing callers.
- [x] Show per-record persistence errors and failed counts.

### UI simplification

- Replace the current three loosely coupled tabs with a step-based flow: Source, Type and Schema, Validate, Review, Import.
- Keep endpoint overrides and batch tuning in an advanced settings disclosure.
- Show a compact source summary after a step is complete instead of keeping all controls visible.

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
- [x] Prevent invalid records from being imported by default.
- [x] Allow users with appropriate permissions to explicitly include invalid records.
- [ ] Remove or reconcile enum controls with Quicktype***REMOVED***s current `no-enums` configuration.

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
- [ ] Apply saved type, identity, validation, and conflict defaults per source.
- [ ] Expand the prepared plan from counts, source errors, validation, and conflicts to include relationship dependencies.
- [x] Require source discovery and plan review before execution.
- [ ] Execute sources in dependency order when relationships require it.
- [ ] Preserve per-source and per-record results for retry.
- [x] Remove the current mock results and simulated completion behavior.

### UI simplification

- Use a compact source list with status, record count, warnings, and one configuration action per source.
- Put global defaults at the top and show only source-specific overrides inline.
- Use the same review and execution views for single-source and Import All workflows.

## 6. Add relationship planning and persistence

- [ ] Extend relationship rules from object-type `expected_child_types` metadata.
- [ ] Add parent match field, child match field, predicate, cardinality, and required/optional semantics.
  - **Outside import:** `src/types/types.ts` and object-type editing UI will need compatible optional fields; existing object types must continue to work unchanged.
- [ ] Allow source adapters to override object-type relationship rules.
- [ ] Resolve relationships from canonical external identities before execution.
- [ ] Detect missing parents, ambiguous matches, cardinality violations, and cycles during review.
- [ ] Persist documents first and retain the resulting document UUID map.
- [ ] Persist relationships in a separate, retryable phase.
  - **Outside import:** reuse the existing relationship PostgREST service or extract a shared service from document creation; regression-test normal document creation.
- [ ] Make relationship retries idempotent.

### UI simplification

- Show relationships as a review summary grouped by type and rule.
- Focus the user on unresolved and invalid links instead of listing every successful match.
- Keep source overrides adjacent to the relationship rule they replace.

## 7. Add CSV through the common adapter API

- [ ] Add a CSV file source adapter using `src/lib/csv.ts`.
  - **Outside import:** reuse the parser as-is initially; parser changes require dedicated tests because other features may consume it later.
- [ ] Add file selection, encoding/error handling, and a parsed preview.
- [ ] Add header-row and column mapping controls.
- [ ] Map columns to label, slug, description, external ID, and document data.
- [ ] Allow existing-type selection or type/schema creation from CSV rows.
- [ ] Support sample, selected, and full validation.
- [ ] Run CSV records through the same reconciliation, review, persistence, and relationship phases as remote records.
- [ ] Allow multiple CSV files in one import session.
- [ ] Support parent/child joins between uploaded CSV files using object-type rules with per-file overrides.
- [ ] Add parser and adapter tests for quoted cells, duplicate/blank headers, dates, numbers, missing columns, large files, and malformed input.

### UI simplification

- Treat each uploaded file as a source row rather than opening a separate CSV-only workflow.
- Infer mappings and types, showing only uncertain mappings for confirmation.
- Reuse the standard records, validation, conflict, relationship, and review screens.

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
