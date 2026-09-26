# Import Refactor Handoff

## Current state

The import workflow now uses source-neutral adapters and source-scoped sessions. Individual source imports support canonical loading, schema validation, duplicate reconciliation, conflict policies, and batch result reporting. Import All supports real multi-source discovery, preparation, controlled execution, conflict defaults, row overrides, and per-record results.

The implementation plan and remaining work are tracked in `src/import/TODO.md`.

## Completed behavior

### Individual source imports

- Remote source functions are wrapped by `ImportSourceAdapter`.
- Canonical records carry source ID, external ID, full document fields, and source data.
- Each source has an isolated import session.
- The edited list and detail URLs are respected.
- Fully loaded records are reused for validation and persistence.
- Schema and validation results are source-scoped.
- Import is blocked until validation completes.
- Invalid records are excluded by default; admins may explicitly include them.
- Cancellation reaches source requests and document writes.
- Row failures remain selected and visible for retry.

### CSV imports

- `/import/csv` reuses the existing CSV file uploader and parser.
- The uploaded filename supplies the default object-type slug and label. For example, `test-metadata.csv` becomes `test-metadata` and `Test Metadata`.
- CSV rows are previewed before import and can be mapped to label, slug, external ID, description, and document-data columns.
- CSV rows are discovered and canonical-loaded immediately after continuing; the remote-source preload step is skipped because the file is already local.
- CSV imports use the shared type selection, schema validation, reconciliation, and persistence workflow.
- CSV sources can choose an existing object type and its default schema instead of relying only on filename-based type inference.
- CSV mapping uses one table for document roles, data inclusion, and schema-field mapping.
- Schema mapping options show field titles, IDs, and nested or array-item paths; a schema field can be selected by only one CSV column.
- Nested and array-item schema mappings are emitted as structured canonical document data.
- Schema-field autocomplete options use a custom view with a red required asterisk, bold title, and smaller path.
- Generated schemas can be edited, saved manually, or created automatically with the filename-derived type/schema names.
- Automatic creation checks the intended object-type slug first. Existing types are not overwritten; users can select the existing type and its default schema instead.
- The import records workflow is presented as a compact step flow: type/validate, then import for CSV; remote sources retain preload, type/validate, and import.
- CSV now has a shared wizard shell with `Upload files` -> `Map fields` -> `Import records` steps. Multiple-file mode keeps Upload active after each file is added.
- The CSV Map fields step shows every uploaded file in expandable sections with compact previews, per-file field mappings, relationship fields, and relationship rules together.
- CSV source labels use high-contrast dark headers, and mapping sections have increased spacing for readability.

### Duplicate reconciliation

- Import provenance is stored in `document.attrs.import` as `source_id` and `external_id`.
- Existing documents are queried by external ID and by `(object_type_uuid, slug)`.
- New, exact, conflicting, and ambiguous records are classified before writes.
- Users can ignore, overwrite, or deep-merge existing readable records.
- Incoming non-empty values win during deep merge; empty incoming values preserve existing values.
- Merge can use client-side deep merge plus PATCH or an optional atomic PostgREST RPC.
- Duplicate incoming slugs are blocked before persistence.
- A final type-and-slug lookup runs before POST to reduce stale-plan races.
- PostgREST errors are classified and displayed in persistent table and row error UI.

### Import All

- The old simulated timers and fabricated results are removed.
- Selected configured sources are discovered through the same adapters as individual imports.
- Discovery supports per-source URL overrides, limits, all-record mode, errors, and cancellation.
- Preparation loads canonical full records, validates against each matching type's default schema, and reconciles valid records against PostgREST.
- The plan displays per-source and aggregate record, validation, and conflict counts.
- Import All executes only valid, non-ambiguous records after review.
- Per-source conflict defaults and exceptional row overrides select ignore, overwrite, or merge behavior.
- Late create conflicts are rechecked by type and slug before writing.
- Per-record execution results remain visible for retry review.
- Failed records can be retried per source without rerunning successful records.
- Failed-record retries refresh duplicate reconciliation before writing and preserve successful results.
- Import All preparation loads records in batches and reports per-source progress without requiring a type first.
- Missing-type sources show `Pending type`; type setup reuses the shared schema/type UI and displays prepared records.
- Import All has a page-level `Create missing types` action that generates a type and default schema from prepared records without opening the setup modal.
- Missing-type creation recovers from an `object_type_slug_unique` race by reusing the existing type and default schema; the UI provides `Refresh types and schemas` when the conflict is surfaced.
- Automatic type creation removes all enum constraints from the generated schema before saving the default schema.
- Changed-record actions use a right-side virtualized list powered by `react-virtuoso`.
- Relationship planning now reads `expected_child_types`, matches provenance identities by default, supports optional match paths, and surfaces ready or blocked plans before writes.
- Full Import All execution now writes ready relationships after documents, retains document UUIDs, and reports link failures independently.
- Failed relationship writes can be retried from the UI without rerunning document imports; successful link results remain preserved.
- Relationship execution checks for an existing child-to-parent link before posting, so repeat runs do not create another link when the existing row is readable.
- Database duplicate protection is verified: `UNIQUE("from_document_uuid", "to_document_uuid", "predicate_uuid")`.
- The Import All page uses source adapter relationship rules, including the Oikos model-to-model-variable rule.
- Oikos layer, layer-group, and module adapters have standalone static schemas under `src/import/schemas`; these schemas are detailed but self-contained and do not use `$ref`.
- Oikos layer and layer-group relationship identities preserve numeric IDs through discovery and full loading.
- Oikos service payloads use snake_case at the import boundary; vector layers preserve `layer_group_id`, matching the current `@axdspub/axiom-ui-data-services` shape. Static Oikos schemas contain no camelCase property names.
- Numeric relationship fields are normalized for matching, and Import All now refreshes incomplete reconciliation rows after type creation so the first Execute click can proceed.
- Prepare review can load records before missing types exist; execution remains blocked until reconciliation is available.
- Import All source rows reserve a right-side activity area with tabs for import activity and changed records. Activity entries show discovery/loading/validation/execution state, document links, and errors.
- Import All shows overall and per-source execution progress while documents are being written.
- Import All document writes run in batches of 10 with a 100 ms abort-aware pause between batches; per-record failures remain available for retry.
- Equivalent backend and adapter relationship rules are deduplicated before planning.
- Oikos module candidates are deduplicated by UUID, and module-to-layer-group matching uses module UUIDs.
- All leftover `debugger` statements were removed from Import All execution.
- Import All and CSV share the reusable wizard navigation component. Import All task controls live under the active step, and clean review advances automatically to Import.
- Import All remains on Review when invalid records, duplicate conflicts, relationship blockers, or import errors require attention. Source rows show matching alert indicators and highlighted attention text.
- Missing-type creation handles an `object_type_slug_unique` race by reusing the existing type and default schema; the page offers `Refresh types and schemas` when the conflict is surfaced.

### Multi-file CSV work

- `/import/csv` supports multiple uploaded files as independent source rows.
- Each uploaded file retains its own preview, mapping, adapter, validation state, and import session.
- Upload source IDs are unique for the lifetime of the page, even when a source is removed and another file is added.
- CSV adapters can carry relationship rules and preserve explicitly configured join fields in canonical record data.
- Cross-source relationship planning is covered by focused tests, but uploaded CSV sources are not yet submitted to one shared relationship plan and persistence phase.
- The preview is bounded for narrower windows and the mapping section no longer overlaps it; additional scrollbar cleanup remains open.

Relationship UI note: the individual source `Import Records` tab only checks document duplicates. Relationship counts and link results appear on `Import All Sources` after execution, when matching parent and child records are included in the same plan.

## Known issue: hidden or late duplicate conflicts

A write can still receive `409 document_type_slug_uniq` when the database sees an existing `(object_type_uuid, slug)` row that duplicate discovery cannot read, or when another writer creates it after review.

The UI now explains this and offers:

- Ignore record
- Return to duplicate check

Do not expose overwrite or merge when the current user cannot read the existing row. Revisit this with a permission-aware type-and-slug RPC only if required. The deferred investigation is recorded in `src/import/TODO.md`.

## Optional atomic merge RPC

`src/import/MERGE_RPC.md` defines the contract. Configure either:

```text
VITE_IMPORT_MERGE_RPC=merge_import_document
TWOWOLVES_IMPORT_MERGE_RPC=merge_import_document
```

Without configuration, client deep merge plus authenticated PATCH remains the default. PostgREST `resolution=merge-duplicates` is intentionally not treated as an equivalent deep merge.

## Validation

Latest verification during this work:

```text
npm test       # latest full-suite result should be rerun after the Oikos relationship tests were added
npm run build  # passed
npm run lint   # fails on existing repository lint issues listed below
```

Focused ESLint checks for the new Import All files passed. Existing import hook dependency warnings remain in `useBatchImport.tsx` and `select_object_type_for_import/index.tsx`. Vite reports bundle-size and browser-externalization warnings.

The full lint command currently reports unrelated errors in:

- `src/brands/modl/create_document_entry.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/sidebar.tsx`
- `src/hooks/use-mobile.ts`
- `src/manage/field_config/create.tsx`

Run these again after checking out on another machine:

```bash
npm install
npm test
npm run build
npm run dev
```

Live validation requires configured external source endpoints and authenticated PostgREST for reconciliation/writes.

Recent focused validation:

```text
src/import/import_all_plan.test.ts
src/import/relationship_planning.test.ts
# 15 tests passed
npm run build  # passed
```

Additional focused validation during CSV work:

```text
src/import/csv_adapter.test.ts
src/import/importState.test.ts
# 4 tests passed
npm run build  # passed; existing Vite quicktype/browser and chunk-size warnings remain
```

Today's additional validation:

```text
src/import/import_all_plan.test.ts
src/import/relationship_planning.test.ts
# 22 focused tests passed, including the Oikos service identity regression
npm run build  # passed; existing Vite browser-externalization and chunk-size warnings remain
```

Latest focused validation:

```text
src/import/import_all_plan.test.ts
src/import/relationship_planning.test.ts
src/import/services.test.ts
src/import/reconciliation.test.ts
src/import/reconciliation_service.test.ts
# 42 tests passed
npm run build  # passed; existing Vite browser-externalization and chunk-size warnings remain
```

Current CSV and relationship validation:

```text
src/import/csv_adapter.test.ts
src/import/relationship_planning.test.ts
src/import/state/importState.test.ts
# 27 tests passed
npm run build  # passed; existing Vite browser-externalization and chunk-size warnings remain
```

Live CSV checks still needed:

- Upload a new CSV, confirm filename-derived type/schema naming, generate a schema, and use `Create automatically`.
- Upload the same filename again and confirm the intended-slug warning blocks duplicate creation.
- Choose the existing type and confirm its default schema is loaded and validation can proceed.
- Change each CSV mapping and confirm the resulting document fields match the selected columns.
- Upload multiple CSV files, switch between source rows, and confirm each mapping and import session remains isolated.
- Confirm invalid CSV records can be diagnosed by revising the mapping and validating again without leaving the validation workflow.
- Check the preview at short and narrow browser sizes for overlapping sections and unnecessary nested vertical scrollbars.

## Next implementation step

Live Import All verification is complete for preparation, document execution, relationship linking, duplicate relationship handling, relationship planning blockers, progress visualization, batching, pauses, cancellation, and failed relationship-link retry. Repeating the same parent/child import reported `100 links already existed` without creating duplicates. Relationship planning was verified for ready, missing-parent, and ambiguous-parent cases using the development-only Oikos test modes. The retry check used `VITE_IMPORT_FAIL_RELATIONSHIP_ONCE`; keep all relationship test switches unset or `false`/`off` during normal development and production use.

The shared wizard shell, type-specific CSV mapping, and initial Import All/CSV integration are now implemented. The next work is live CSV verification and any fixes found there:

1. Verify existing-type selection and default-schema loading.
2. Verify the unified mapping table, unique schema-field selection, and nested/array field paths.
3. Verify related CSV files appear in one shared relationship plan and persistence phase.

For CSV, the current flow is:

1. Single file: `Upload` -> `Map fields` -> `Import`.
2. Multiple files: `Upload` -> `Map fields` -> `Import`, with relationship settings shown alongside each file's mapping and preview.
3. All uploaded files remain in one session and can be mapped without returning to a separate file-selection step.

Live CSV verification remains needed for the wizard transitions, mapping all files in one pass, nested and array schema mappings, relationship configuration, narrow-window layout, and shared Import All persistence.

### Explicit continuation point

The current `CSVImportViewConfig` in `src/import/pages/csv.tsx` now has initial `sourceConfigs` upload slots. These slots provide per-source labels, descriptions, known types, mapping modes, and relationship fields. The target workflow is one upload session containing a known parent CSV and a known child CSV, where fixed relationship fields/rules are shared by the combined Import All plan.

The first-level array-field slice is now implemented: a configured array source carries an explicit parent source key, array field path, parent match field, and row match field. Import All loads those rows, embeds them into the matching parent records, validates/reconciles the merged parent, and skips standalone array-source document writes. Do not import an array spreadsheet as separate documents once that slot type is selected.

UI verification is still needed for the configured array upload slot and the final parent document shape. Nested arrays, multiple spreadsheets contributing to one array, and item-level retry remain deferred.

The ordinary `/import/csv` create-types-as-you-go workflow intentionally does not use this array composition path. It remains a future enhancement; the current array implementation is for configured known-type views only.

Still decide how the application identifies each known uploaded file: filename/source-key matching or an explicit user-selected parent/child source role. Do not create separate page-level presets for the parent and child.

Additional CSV requirements for the next design:

- A known-type upload session may include an additional spreadsheet that populates an array field, not only spreadsheets connected by parent/child relationships.
- Known-type workflows should provide targeted upload slots with labels and descriptions for expected relationship sources and specific array fields.
- Each spreadsheet row should become one object in the parent document's array. The parent and its array items should be created together; individual array-item retries are not required.
- Array spreadsheet columns map to the parent field's existing `items` schema, rather than creating a separate document type/schema for array items.
- Multiple spreadsheets contributing to the same array are possible but deferred until needed.
- Nested arrays are a future task. They will require child/parent lookup and nested relationship planning, but are intentionally out of scope for the first array-of-objects implementation.

Before or alongside the wizard work, verify failed relationship-link retry when a suitable failure scenario is available.

The relationship ordering investigation is now part of the next relationship-design task rather than a separate deferred item.

## Changes outside `src/import`

- `package.json` and `package-lock.json`: Vitest and the test script.
- `package.json` and `package-lock.json`: Vitest/test configuration and removal of the temporary direct Ajv dependency; Ajv remains transitively installed.
- `vitest.config.ts`: test configuration.
- `src/config/config.ts`: optional import merge RPC runtime setting.

No shared PostgREST or document service implementation was changed.
