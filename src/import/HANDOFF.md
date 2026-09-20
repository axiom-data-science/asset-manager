# Import Refactor Handoff

## Current state

The import workflow now uses source-neutral adapters and source-scoped sessions. Individual source imports support canonical loading, schema validation, duplicate reconciliation, conflict policies, and batch result reporting. Import All supports real multi-source discovery and non-writing preparation.

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
- Import All does not write documents yet.

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

Last verified during this work:

```text
npm test       # 29 tests passed
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

## Next implementation step

Add controlled Import All execution:

1. Add per-source bulk conflict defaults and exceptional row overrides.
2. Require every enabled source to be prepared with no unresolved type/schema blockers.
3. Present a final read-only execution summary.
4. Execute only valid, non-ambiguous records using the same create/ignore/overwrite/merge functions as individual imports.
5. Preserve per-source and per-record results for retry.
6. Do not begin relationship ordering until execution results are durable.

After execution is stable, implement relationship planning, then CSV through the shared adapter API. XLS/XLSX remains deferred until the CSV adapter API is proven.

## Changes outside `src/import`

- `package.json` and `package-lock.json`: Vitest and the test script.
- `vitest.config.ts`: test configuration.
- `src/config/config.ts`: optional import merge RPC runtime setting.

No shared PostgREST or document service implementation was changed.
