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
- Generated schemas can be edited, saved manually, or created automatically with the filename-derived type/schema names.
- Automatic creation checks the intended object-type slug first. Existing types are not overwritten; users can select the existing type and its default schema instead.
- The import records workflow is presented as a compact step flow: type/validate, then import for CSV; remote sources retain preload, type/validate, and import.

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
- Preparation loads canonical full records, validates against each matching type***REMOVED***s default schema, and reconciles valid records against PostgREST.
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
npm test       # currently reports 66 passed and 1 pre-existing empty-suite failure in src/import/oikos_relationships.test.ts
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

Today***REMOVED***s additional validation:

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

Next session, verify the latest Import All behavior with authenticated PostgREST and configured Oikos sources:

1. Confirm overall and per-source execution progress updates while Import All runs.
2. Confirm batched document writes, the short pause between batches, cancellation, and failed-record retry.
3. Verify Oikos model/model-variable and module/layer-group/layer relationships, including first import, repeat import, partial existing data, and failed/retried links.
4. Confirm duplicate relationship rules do not produce duplicate plans or unnecessary writes.

After live Import All verification, continue with:

5. Apply the upstream `@axdspub/axiom-ui-forms` schema-helper update, then switch `oikos_schemas.test.ts` back to the shared helper and remove temporary Ajv test support.
6. Skip additional CSV steps when filename, mappings, and an existing type/schema make them unnecessary.
7. Add multiple spreadsheet sources in one session with dependency-ordered parent/child imports.
8. Submit uploaded CSV sources to one shared relationship plan and persistence phase.
9. Refine CSV mapping guidance and same-view revalidation for invalid records.
10. Refactor the single-item import UI and debug object-type creation state refresh/failures.
11. Keep XLS/XLSX deferred until the multi-source CSV adapter shape is proven.

The relationship ordering investigation is now part of the next relationship-design task rather than a separate deferred item.

## Changes outside `src/import`

- `package.json` and `package-lock.json`: Vitest and the test script.
- `package.json` and `package-lock.json`: temporary Ajv and happy-dom test dependencies for standalone schema fixtures.
- `vitest.config.ts`: test configuration.
- `src/config/config.ts`: optional import merge RPC runtime setting.

No shared PostgREST or document service implementation was changed.
