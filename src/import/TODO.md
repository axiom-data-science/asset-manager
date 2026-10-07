# Import Refactor TODO

## Working agreements

- [x] Keep import behavior behind source-neutral contracts rather than adding source-specific page logic.
- [x] Add or update Vitest tests with each behavioral change.
- [ ] Keep changes under `src/import` unless sharing existing behavior avoids duplication.
- **Outside import:** CSV route and navigation require `src/App.tsx` and `src/components/app-sidebar.tsx` changes.
- [ ] Mark every proposed change outside `src/import` with an **Outside import** note before implementation.
- [x] Complete remote-source and CSV workflows before adding XLSX support.
- [x] Add XLSX only through the same adapter API used by CSV.
- [ ] Prefer a guided, reviewable workflow over exposing every setting on one screen.

## Future import workflow direction

- [x] Build a shared wizard shell for Import All and CSV imports, using the Import All layout as the starting pattern.
- [x] Show clear wizard steps at the top of Import All and CSV flows, with the current step visibly active and completed steps summarized.
- [x] Place current-step actions, diagnostics, progress, errors, and settings beneath the wizard navigation for Import All and CSV.
- [ ] Keep advanced settings available without letting them dominate the primary step workflow.

### CSV wizard direction

- [x] Refactor single-file CSV import into `Upload`, `Map fields`, and `Import` steps by default.
- [x] For multi-file CSV import, use `Upload`, `Map fields`, and `Import` steps, with relationship settings included in Map fields.
- [ ] Make object-type selection and creation automatic by default; when no type matches the CSV filename, default to creating a new object type from the CSV data.
- [ ] Let the Import step automatically create a newly inferred type without requiring a checkbox or scrolling past schema output; make schema review and object-type creation an optional modal step.
- [ ] Offer an option at the beginning to make object-type setup an explicit wizard step when automatic setup is not appropriate.
- [x] Keep all uploaded CSV files in the same wizard session and import them together from the final `Import` step.
- [x] Show per-file diagnostics and settings beneath the active wizard step without sending the user back to the beginning to configure another file.
- [x] Add an explicit CSV upload mode checkbox so users can choose between single-file progression and keeping the Upload step active for multiple files.
- [x] In the CSV mapping step, show compact information for every uploaded file with expandable previews and per-file mapping controls.
- [x] Include relationship fields and relationship rules alongside each file's mapping and preview.
- [x] Add a type-specific CSV mapping step for imports where the user chooses an existing object type and maps CSV columns to its schema fields.

### ERDDAP metadata import

- [x] Add an ERDDAP source adapter for single-dataset `/info/{datasetID}/index.json` metadata.
- [x] Discover datasets from `/info/index.json`, using catalog IDs, titles, and summaries; fetch full metadata only for selected candidates during preload.
- [x] Normalize ERDDAP global attributes and per-variable attributes into canonical record data.
- [x] Add config-driven text overrides for `dataset_id`, `global_attributes.id`, and `global_attributes.platform_name`; edits invalidate validation and reconciliation.
- [x] Add searchable remote preload records, with select-all and random selection scoped to visible results while preserving hidden selections.
- [x] Add parser, adapter, catalog-discovery, and lazy-loading tests.
- [ ] Verify in the authenticated browser with the live AOOS single-dataset and catalog URLs, including CORS, search/filter selection, preload, metadata overrides, and schema validation.

## 1. Establish tests and stabilize the current workflow

- [x] Install and configure Vitest with a `test` script and shared test setup.
  - **Outside import:** `package.json`, lockfile, and likely `vite.config.ts` or a test config.
- [ ] Add unit tests for source adapters, canonical record conversion, validation, reconciliation, and merge behavior as those modules are introduced.
- [x] Populate `src/import/oikos_relationships.test.ts` with Oikos-specific relationship regression tests.
- [ ] Add focused tests for the existing CSV parser before connecting it to imports.
- [x] Fix Import All status keys so they use source `type` values rather than array indexes.
- [x] Remove render-time timers and fabricated results from Import All.
- [x] Use the edited detail-root URL for preload and import requests.
- [x] Reset import state before a new source load so stale records are not displayed.
- [x] Surface remote loading errors in the import UI.
- [x] Forward cancellation through both source loading and document persistence where supported.
  - **Outside import:** `src/manage/document/services.ts` may need an optional `AbortSignal`; preserve existing callers.
- [x] Allow users to cancel Import All discovery, preparation, and execution without rolling back completed writes.
- [x] Verify the Import All cancel action in the authenticated UI during discovery, preparation, document execution, and relationship persistence; completed writes remain visible and later work stops.
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
- [x] Show overall and per-source preparation progress while Import All loads records.
- [x] Batch Import All document writes in groups of 10 with a 100 ms abort-aware pause between batches.
- [x] Verify in the authenticated UI that Import All uses the intended batching and pauses during document and relationship work.
- [x] Verify retry progress for failed relationship links.
- [x] Remove leftover `debugger` statements from Import All execution.
- [x] Show a `Pending type` placeholder for sources without a type.
- [x] Show prepared records in the type-setup dialog.
- [x] Render per-source changed-record actions in a right-side `react-virtuoso` list.

### UI simplification

- [x] Replace the current loosely coupled import tabs with a visible step-based flow: Preload records, Choose type and validate, Import.
- [ ] Refactor single-item import to simplify the UI and remove unnecessary nested workflow controls.
- [ ] Debug object-type creation in the simplified single-item import flow, including type/schema state refresh and failure reporting.
- [x] Keep selected Import All data-source rows at their compact height until `Discover selected` is pressed; do not expand a selected row before discovery begins.
  - UI verification still needed: select sources without discovering and confirm their rows stay compact, then confirm the workspace expands after discovery begins.
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
- [x] Allow validation of all, selected, or sampled records; keep Import blocked for records that have not been validated.
- [x] Update `@axdspub/axiom-ui-forms` `schemaHelpers.validateAgainstSchema` to return a consistent validation-error array (`[]` for valid values), update its TypeScript declaration, and add library tests for primitive and nested schema violations. Switch `oikos_schemas.test.ts` to the shared helper and remove the temporary direct `ajv` test dependency.
- [x] Prevent invalid records from being imported by default.
- [x] Allow users with appropriate permissions to explicitly include invalid records.
- [ ] Remove or reconcile enum controls with Quicktype's current `no-enums` configuration.
- [x] Ensure automatically created Import All schemas strip all enum constraints.
  - UI verification still needed: create a type automatically and inspect the saved default schema for enum properties.
- [ ] Investigate nested required-field validation in `src/lib/utils.ts` `validate`, especially required properties inside array items. Trace its `schemaToFormUtils.validateAgainstSchema` call and review the temporary workaround added during CSV array testing as a possible long-term validation strategy.

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
  - Add a type-and-slug reconciliation RPC only if needed; it must enforce the current user's select/update permissions and must not allow updates to inaccessible rows.
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
- [x] Validate prepared records against each matching type's default schema.
- [x] Run duplicate reconciliation for valid prepared records without writing documents.
- [x] Apply per-source bulk conflict defaults and exceptional row overrides during execution.
- [x] Expand the prepared plan from counts, source errors, validation, and conflicts to include relationship dependencies.
- [x] Require source discovery and plan review before execution.
- [x] Execute related Import All sources by persisting documents first, then resolving and persisting ready relationships from the retained document UUID map.
- [x] Preserve per-source and per-record execution results for retry review.
- [x] Remove the current mock results and simulated completion behavior.
- [ ] Add a simple one-button import path for prepared sources.
- [ ] Decide whether automatic type creation is allowed when a source type is missing; prefer pre-populated types by default.
- [x] Add an explicit page-level `Create missing types` action for prepared sources.
- [x] Verify recovery when missing-type creation races with an existing object-type slug.
  - Confirmed the UI can refresh types and schemas after `object_type_slug_unique` conflict and continue the prepared import workflow.
- [ ] Add a simple one-button import path for prepared sources after type setup and review are complete.

### Import All verification

- [x] Verify authenticated preparation and document execution across multiple sources, including validation and conflict blockers.
- [x] Verify relationship planning for ready, missing-parent, and ambiguous-parent cases.
- [x] Verify document and relationship progress, batching, abort-aware pauses, cancellation, and failed-link retry.
- [x] Verify repeat relationship execution detects existing links without creating duplicates.
- [ ] Verify failed-document retry in the authenticated UI, confirming successful records are not rerun and retry refreshes duplicate reconciliation.

### Import All errors

- [x] Add a concise Import All error view as an Errors tab.
  - Include source discovery, preparation, validation, document, and relationship errors.
  - Keep per-source and per-record context, with retry actions where available.

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
- [x] Detect missing parents and ambiguous matches during review.
- [ ] Detect relationship cardinality violations and cycles during review.
- [x] Persist documents first and retain the resulting document UUID map.
- [x] Persist ready relationships in a separate phase with independent per-link results.
  - **Outside import:** reuse the existing relationship PostgREST service or extract a shared service from document creation; regression-test normal document creation.
- [x] Add UI retry controls for failed relationship writes without rerunning documents.
- [x] Check for an existing relationship before creating or retrying a link.
- [x] Verify database protection for duplicate relationships.
  - Confirmed unique constraint on `from_document_uuid`, `to_document_uuid`, and `predicate_uuid`.
- [x] Verify duplicate relationship handling in the Import All UI.
  - Repeated the same parent/child import and confirmed `100 links already existed` with no duplicate links created.
- [x] Verify relationship planning behavior for ready, missing-parent, and ambiguous-parent cases in the authenticated Import All UI.
  - Used the development-only Oikos relationship test modes to override parent `slug` and child `modelSlug` values in memory.
- [x] Deduplicate equivalent backend and source-adapter relationship rules before planning.
- [x] Deduplicate Oikos module candidates repeated across layer groups.
- [x] Match Oikos module UUIDs to layer-group `module_uuid` values.

### Relationship planning and persistence verification

- [x] Verify authenticated ready, missing-parent, and ambiguous-parent plans, successful relationship persistence, duplicate detection, and retry of failed links without rerunning documents.
- [x] Verify repeating the same parent/child import reports existing links without creating duplicates.
- [x] Automatically start CSV relationship persistence after all dependency-ordered document source attempts complete; retain the manual action for retry.
- [x] Keep the CSV document batch executor mounted outside the validation dialog so the global Import request is consumed while the dialog is closed.
- [x] Verify CSV document import and subsequent relationship linking in the authenticated UI.
  - User confirmed on 2026-10-07 that Import worked and relationships linked after the persistent executor fix.
- Development-only failure switches were used for verification. Keep them unset or `false`/`off` during normal development and production use.

### UI simplification

- Show relationships as a review summary grouped by type and rule.
- Focus the user on unresolved and invalid links instead of listing every successful match.
- Keep source overrides adjacent to the relationship rule they replace.

### Import All execution follow-up

- [x] Add overall and per-source progress bars during document execution.
- [x] Batch document writes while preserving per-record results and failed-record retry behavior.
- [x] Batch relationship writes with abort-aware pauses while preserving independent per-link results.
- [x] Show relationship persistence progress alongside document import progress in Import All.
- [x] Verify progress bars, batch pacing, cancellation, and failed relationship-link retry in the authenticated UI.

## 7. Add CSV through the common adapter API

- **Outside import:** reuse the parser as-is initially; parser changes require dedicated tests because other features may consume it later.

### Current next steps

- [x] Verify filename-derived type/schema naming, automatic creation, and selection of the generated default schema.
- [x] Verify uploading the same filename again blocks duplicate type creation.
- [x] Verify existing-type default-schema loading.
- [x] Verify the unified CSV field-mapping table controls label, slug, external ID, description, inclusion, and schema mapping.
- [x] Verify unique schema-field selection; a schema field already assigned to one CSV column is unavailable to another.
- [x] Verify nested and array-item mappings produce structured document values; the array fixture produced `sample_file.headers[].data_type` as an object inside an array.
- [x] Unit-test matched, unmatched, and keyless array rows plus the shared unmatched-row diagnostic used by CSV and Import All.
- [x] Add focused CSV orchestration tests for configured and generic-style array composition, unmatched-row blocking, and excluding array sources from standalone document panels.
- [x] Add automated tests for automatic type/default-schema creation payloads and source-specific CSV mapping isolation.
- [x] Verify multiple-file mapping/session isolation and that invalid records can be corrected by remapping and revalidation; click `Continue to import` after the correction to reload and validate.
- [x] Verify the Upload-step related CSV, lookup columns, and predicate produce one mirrored rule with the selected parent and child fields.
- [x] Verify clearing and reselecting `Related CSV` empties and repopulates the relationship rules.
- [x] Verify CSV-local relationship persistence; the authenticated workflow reported `3 created`.
- [x] Verify failed-link retry without rerunning document imports by blocking `/relationship` requests, restoring them, and linking successfully.
- [x] Replace Import records cards with dependency-ordered source rows, validation counts, duplicate handling, and a type/schema validation dialog.
- [ ] Investigate the latest CSV-local link failure (2026-10-06): documents imported, but relationships did not link. Capture planner statuses, link results/errors, and the relationship request response; verify the selected document UUIDs and predicate. Do not rerun successful document imports during this investigation. The earlier `3 created` and retry checks remain historical successes.
- [x] Verify configured and generic array-item uploads produce the expected parent document and report unmatched rows.
  - Confirmed matched array rows are embedded in parent documents and unmatched rows block the transition to Import records.
  - The unmatched-row message now identifies an array-composition blocker and directs the user to lookup columns or missing parent rows.
- [x] Check the preview and mapping layout at narrow and short browser sizes.
- [ ] Fix issues found in these checks, with focused tests for behavioral changes.
- [x] Implement dependency-aware multi-file document execution so parent sources are persisted before related child sources, preserving missing, ambiguous, and out-of-order diagnostics.

  - [x] Add CSV adapter support for relationship rules and explicit join fields, with cross-source planner tests.

- [x] Expose per-file relationship-field selection in the CSV mapping view and preserve selected fields in canonical records.
- [x] Add a per-file relationship-rule editor for child source, parent field, child field, and predicate.
  - [x] Allow the related CSV selection to be cleared after it is set.
  - [x] Mirror the selected relationship, role, lookup fields, and predicate onto the counterpart source.
    - [x] Keep CSV users inside `/import/csv`; shared wizard, adapter, validation, relationship, and persistence functionality may be reused, but CSV users must not be sent to `/import/all`.
      - Live relationship verification is tracked under `Current next steps` below.
  - [x] Let each CSV source choose an existing object type and load its default schema.
  - [x] Combine CSV role mapping, data inclusion, and schema-field mapping into one table.
  - [x] Prevent multiple CSV columns from selecting the same schema field.
  - [x] Show schema field titles, IDs, and nested or array-item paths in mapping options.
  - [x] Emit structured nested and array-item data for mapped schema paths.
  - [x] Use the schema-field autocomplete option view to show a red required asterisk, bold field title, and smaller field path.
- [x] Load multi-spreadsheet CSV sources together inside `/import/csv` for relationship planning.
- [x] Resolve multi-spreadsheet document imports in dependency order inside `/import/csv` so parent spreadsheets are imported before related child spreadsheets. Panels are dependency-ordered, and child write steps wait for uploaded parents to finish an import attempt; a missing parent source remains available to relationship diagnostics.
  - [x] Verify parent-first gating in the authenticated CSV UI; the child import remained blocked until the parent batch finished.
  - [x] Verify partial parent failures, parent-row retry, and missing-parent diagnostics with the fixtures in `public/test-parent-first-*.csv`.
- [x] Preserve cross-spreadsheet identity and relationship diagnostics when a parent file is missing, duplicated, or loaded out of order.
- [ ] Add parser and adapter tests for quoted cells, duplicate/blank headers, dates, numbers, missing columns, large files, and malformed input. (Adapter coverage started; parser edge-case coverage remains.)
- [ ] Replace the page-wide `CSVImportViewConfig` with per-source/session configuration.
- [ ] Support uploading a known parent CSV and known child CSV in one session, with independent known types and mapping modes.
- [ ] Support fixed relationship fields and rules shared across the known parent/child source configuration.
- [x] Keep CSV relationship planning and persistence accessible inside `/import/csv`; shared implementation code with Import All is allowed, but CSV users must not be routed to `/import/all`.
  - Live verification of CSV-local relationship results and failed-link recovery is tracked under `Current next steps` below.
- [x] Add initial configured upload slots with per-source labels, descriptions, known types, mapping modes, and source-specific relationship fields.
- [x] Use an explicit user-selected source role for generic CSV parent, child, and array-item uploads.
- [x] Preserve role-specific relationship match fields automatically in canonical CSV data.
- [x] Synchronize object types selected or created during CSV import back to their CSV sources before relationship planning.
- [x] Move generic parent/child type, child-source, lookup-column, and predicate setup to the CSV Upload step.
- [x] Add an on-screen CSV planner snapshot for relationship debugging.
- [x] Deduplicate mirrored CSV relationship rules in planner diagnostics and planning input.
- [x] Render independent import panels for all uploaded document CSV sources in the CSV Import step.
- [x] Allow an additional spreadsheet source to populate an array of objects on a known parent document type, alongside ordinary parent/child relationship sources.
- [x] Treat each spreadsheet row as one object in the parent document's array; create the parent document and its array items in one operation, with no individual array-item retry workflow.
- [x] Map array spreadsheet columns to the parent schema's existing `items` schema rather than a separate document type/schema.
- [ ] Defer multiple spreadsheets contributing to the same array until a concrete use case requires it.
- [x] Provide configured upload slots for known-type workflows, with a label and description targeting the expected document type or array field.
  - PAM is the production known-type view; its remaining validation is tracked in the PAM continuation checklist below.
  - Reuse `CSVImportPage` with route-specific `CSVImportViewConfig` and `sourceConfigs`, following `/import/csv/test-array`; do not copy the CSV workflow into separate page implementations.
  - Each production configuration needs backend object-type slugs, source keys/labels/descriptions, expected filenames or columns, mapping mode, and any fixed roles, relationship rules, or array targets. Backend default schemas are loaded by object-type slug, so local schema imports are not required when those records already exist.
  - Keep route registration and brand-specific discovery separate from the shared CSV import behavior so branded instances can supply their own configured views later.
- [x] Implement PAM known-type CSV import as a declarative known-schema view over `CSVImportPage` at `/import/csv/pam`.
  - [x] Register the view in `src/app-variants/pam/index.tsx`; route and navigation registration already support variant-provided CSV views.
  - Backend definitions were confirmed on 2026-10-05 through `http://localhost:3345/object_schema?slug=eq.pam_project`, `http://localhost:3345/object_schema?slug=eq.pam_site`, and `http://localhost:3345/object_schema?slug=eq.pam_deployment`; recheck the active backend on another machine because this URL is local to the confirming machine.
  - Backend `expected_child_types` declares `pam_project` -> `pam_site` -> `pam_deployment`, with `to_parent_predicate: has_child` (child-side predicate `has_parent`). Keep schemas and this relationship metadata backend-owned.
  - Configure document joins: parent `pam_project.project` to child `pam_site.project`; parent `pam_site.siteOrCruiseName` to child `pam_deployment.site`.
  - Configure array source slots targeting `pam_deployment.recordings` and `pam_deployment.analyses`; in both, match parent `deploymentTitle` to row `deploymentTitle`.
  - [x] Agreed UX: one PAM entry page with four clear `locationDetail` choices: stationary marine, stationary terrestrial, mobile marine, and multipoint stationary marine. The selected backend `oneOf` branch scopes field choices and supplies `locationDetail.type`; the backend schema remains the validation source.
  - [x] Extend schema field discovery for selected `oneOf` branches and local `$ref`s; combine separately mapped columns into the same nested array item.
  - [x] Add schema-derived synthetic CSV fixtures in `public/pam/` for the project, all four site branches, deployment, recordings, and analyses.
  - [x] Derive CSV document label, slug, description, and provenance identity from mapped data using `object_type.data.field_mappings` after CSV-to-schema mapping; do not require generic metadata columns in PAM CSVs.
  - [x] Include project contributor and related-project array examples; omit generic metadata role columns from PAM project, site, and deployment fixtures.
  - [ ] Confirm actual producer CSV conventions for navigation URI lists and multiple `locations` on one multipoint site; the synthetic multipoint row contains one schema-minimum location.
  - [x] Resolve dependency-aware CSV document execution so project and site parents are attempted before their child sources; retain missing, ambiguous, and out-of-order diagnostics.
  - [x] Add focused tests for the four branch choices, `$ref` field discovery, discriminator emission, nested location arrays, and dependency ordering.
  - [x] Add focused assertions for the PAM route's configured source, relationship, array slots, and location choices.
  - [x] Perform authenticated end-to-end validation against the intended backend for the core PAM workflow.
    - Confirmed 2026-10-06: `pam_project`, `pam_site`, and `pam_deployment` imported; recordings and analyses were embedded in deployments; configured relationships were created.
- [ ] Provide targeted upload-slot guidance when a relationship source or one or more array-field spreadsheets are expected.
- [x] Extend configured upload slots with an explicit array-field target and persist its rows into the parent document's array instead of importing the spreadsheet as separate documents.
  - Live verification of configured array uploads is tracked under `Current next steps` above.
- [ ] Future: support nested arrays, including the required child/parent lookup and nested relationship planning. This is not required for the first array-of-objects implementation.
- [ ] Future: support array composition in the ordinary create-types-as-you-go CSV workflow. The current array process intentionally requires a configured known-type upload view.

### UI simplification

- Treat each uploaded file as a source row rather than opening a separate CSV-only workflow.
- Infer mappings and types, showing only uncertain mappings for confirmation.
- Reuse the standard records, validation, conflict, relationship, and review screens.
- [ ] Revisit the main Import All page later: reduce its crowded UI and improve grouping of controls, diagnostics, and progress information.
- [x] Allow CSV mapping edits and revalidation after validation fails; return to `Map fields` and click `Continue to import` after correcting the mapping.
- [x] Verify the CSV preview layout at narrow and short browser sizes; no overlap or problematic nested vertical scrollbars were observed.
- [x] Verify the wide-table fix at narrow width with the sidebar expanded; confirm only the table scrolls horizontally.
- [ ] Make the `Map fields` to `Import records` transition accessible without scrolling to the bottom; enable the wizard step when the import transition is available.
- [x] Constrain wide tables to their layout container and give them their own horizontal scrollbar instead of scrolling the whole page.
  - Fixed the shared sidebar layout with `min-w-0 flex-1`; browser verification remains open above.
- [x] Rename the Upload-step `Child CSV` selector to `Related CSV` so the control describes the selected source without overcommitting to direction.
- [x] Bring the CSV-to-array workflow into the simplified Upload-step relationship setup, while keeping array rows embedded in the parent document rather than importing them as standalone documents.
  - Live verification for parent array shape and unmatched-row diagnostics is included in the current next steps above.
- [ ] Automatically assign the parent source the `Parent` role when an `Array items` source selects it.
- [ ] Simplify the CSV Import step further after multi-source panel UI verification.
- [x] Test one parent CSV with array items and two ordinary parent/child relationships in the same upload session; extend relationship planning/source roles if needed.
  - Confirmed in the authenticated PAM workflow on 2026-10-06: project -> site -> deployment relationships created, with recordings and analyses embedded in deployments.

### CSV workflow boundary

- `/import/csv` is the complete CSV user workflow, including multi-file relationships and array composition.
- `/import/all` is a separate user workflow for configured remote-source imports. Shared implementation code and UI patterns are fine, but CSV users are never sent there as a workflow step or verification destination.
- The ordinary CSV flow exposes explicit parent, child, and array-item roles; live verification for array composition with an existing parent type/schema is tracked under `Current next steps` above.

### CSV mapping verification

- Automated CSV, import-session, and relationship tests passed in the latest recorded validation.
- Live verification is included in `Current next steps` above, including required-field indicators and document-role inclusion behavior.

### Continuation point

Current state: `CSVImportViewConfig` still provides configured upload slots, while generic uploads support explicit parent, child, and array-item roles. Do not add more page-level presets. Any follow-up configuration work should be per source/session and must feed the combined CSV-local relationship plan.

The next configured-upload branch is intentionally deferred. When resumed, create production known-schema views as declarative configurations over `CSVImportPage`, using `/import/csv/test-array` as the proven reference. Do not duplicate its page or orchestration code. Obtain the concrete backend object-type slugs and source/relationship definitions before implementation.

New requirements to carry into that refactor:

- A session may include additional spreadsheets that populate an array field on a known document type, in addition to spreadsheets connected through relationships.
- Known-type upload views should expose targeted upload buttons/slots with labels and descriptions, such as the expected parent/child type or the specific array field being populated.
- Resolved array behavior: each spreadsheet row becomes an item mapped against the parent's existing array-item schema; parent and items are written together, without individual item retries. Multiple files contributing to one array and nested arrays remain deferred.

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

## 8. Add workbook sources through the CSV pipeline

- [x] Select `read-excel-file` for browser-side `.xlsx` parsing; lazy-load it only when a workbook is selected.
  - **Outside import:** `package.json` and the lockfile include the parser dependency.
- [x] Convert selected worksheets into independent sources through the existing CSV adapter, mapping, validation, and reconciliation workflow.
- [x] Support selecting multiple sheets; each selected sheet gets an independent source and type/mapping workflow.
- [x] Add focused coverage for multiple sheets, empty sheets, and CSV-safe cell serialization.
- [x] Authenticated UI verification: workbook tabs are recognized in the sheet selector.
- [x] Keep templated source cards hidden until selected workbook sheets are added; show each sheet's configured type (or None) before adding.
- [x] Show configured schema-branch choices in the matching worksheet row and require a choice before adding that sheet.
- [x] Make the assumed type editable, show array destinations as `type.path[]`, and widen the pre-add worksheet controls to avoid overlap.
- [x] Replace the native workbook input with a filename-aware Choose file button and an X that removes the workbook and all of its imported sheets.
- [x] Render configured source slots as compact rows instead of tall cards.
- [ ] Authenticated UI verification: select multiple sheets and confirm each appears as an independent source with its own type and mapping.
- [ ] Authenticated UI verification: confirm clean known-schema sources expose one final Import action, while mapping, validation, and conflict issues remain reviewable.
- [ ] Authenticated UI verification: confirm schema-derived optional array slots use parent and row lookup columns and embed matched rows in the parent.
- [ ] Evaluate legacy `.xls` support separately; the current upload picker accepts `.xlsx` only.
- [ ] Extend workbook tests for formula results, date cells, duplicate headers, and large workbooks.

## 9. Universal upload format and existing-parent relationships

- [x] Require an initial CSV files / Excel workbook (.xlsx) choice on every CSV import page.
- [x] Replace the shared location-specific entry choice with configurable schema branch/value choices, including a view-provided label, placeholder, and options.
- [x] Allow configured document sources to be optional so partial source sets can be imported without requiring every configured tab.
- [x] Support opt-in exact matching against existing parent documents using configured parent type and data-field paths.
- [x] Auto-link a unique exact match and require explicit selection when multiple parents match.
- [x] Allow a missing-parent child row to be excluded from import, with an action to restore ignored rows.
- [x] Offer detailed generic relationship review and a guided variant presentation.
- [x] Keep array-only sources blocked unless their configured in-session parent source is uploaded.
- [ ] Authenticated UI verification: choose CSV and workbook modes on generic and PAM CSV routes; verify each shows only its selected upload controls.
- [ ] Authenticated UI verification: upload a partial PAM source with a unique existing parent and confirm it auto-resolves and links.
- [ ] Authenticated UI verification: confirm multiple existing parents require a selection and no-match rows can be ignored/restored before import.
- [ ] Authenticated UI verification: confirm an array-only workbook is blocked without its configured document source, then embeds rows when that source is present.

## Completion criteria

- [ ] Individual remote, Import All, and CSV imports use one pipeline.
- [ ] Every imported record has a durable result and actionable failure information.
- [x] Validation results control import eligibility.
- [ ] Existing records are detected before writes and receive an explicit conflict policy.
- [ ] Relationships are planned before writes and persisted in a retryable phase.
- [ ] Vitest covers the source-neutral business logic and critical adapters.
- [x] Workbook sheets use the existing CSV adapter pipeline rather than a separate import flow.
