# Import Refactor TODO

## Current progress (2026-10-20)

- Branch: `refactor-import-process`; type-prefixed slug reconciliation is committed
  as `e56a5d7`. Resume from the remaining file-parity and authenticated
  verification items below; no live backend write verification was performed for
  the slug change.
- [x] Authenticated conflict-review check: on Import Records, the user reported
      one duplicate for a row whose label differed from the matched record. This
      confirms that duplicate reporting is not limited to identical labels; the
      report does not establish whether Import/Link was clicked or whether writes
      occurred.
- [x] Implement type-prefixed slug lookup during duplicate reconciliation. The
      user notes that the database prefixes imported slugs with the selected
      object-type slug; reconciliation now checks both supplied and prefixed slugs
      across CSV, workbook, and Import All paths, including the final create guard.
      Already-prefixed slugs are not prefixed twice. Reconciliation, service,
      orchestration, and production-page tests pass (125 tests); TypeScript,
      production build, and `git diff --check` pass. Code is committed in
      `e56a5d7`. Scoped ESLint reports the
      existing `react-hooks/set-state-in-effect` issue in
      `pages/import_records_page_impl.tsx`.
- [x] User-performed authenticated validation review: a schema-invalid workbook
      source showed its invalid count and validation details in **Edit type and
      validate**, including after closing and reopening the editor. The other sheet's
      type and mapping remained unchanged. No Import or Link was reported; this UI
      check does not establish backend writes.
- [x] Reproduced and fixed the Import Records type-picker interaction through an
      auth-free production-page test: changing Sites to another type works without
      changing Deployments. The CSV source type picker uses a native select in the
      source-schema modal to avoid the blocked portaled menu. The 17 CSV mapping tests
      and production build pass; mocks confirm no writes. User-performed authenticated
      recheck confirms the type switch works and the other source retains its type.
      This does not establish backend writes.
- [x] User-performed authenticated multi-sheet review: two selected sheets appeared
      to retain independent types and mappings in Upload files and Map fields. At
      Import Records, **Edit type and validate** did not allow changing to a different
      type; a later recheck confirmed the fix. No Import or Link action was reported,
      and these UI checks do not establish backend writes.
- [x] Resolve the parked production-page handoff behavior through an approved Luna
      readiness slice. Both handoffs and return to mapping pass with no writes before
      handoff; all 29 CSV mapping/adapter tests pass. Final safety gates remain intact.
- [x] Resolve the TypeScript blocker through a separately approved Luna mock-type
      correction: use existing object type/schema array types for the two service
      mocks. TypeScript and the same 29 focused tests pass; no runtime behavior changed.
- [x] Test the production-page busy return guard through one approved Luna test-only
      slice: return is disabled during deferred shared preparation, cannot leave the
      view while busy, and works after settling without document/relationship writes.
      All five CSV mapping tests, TypeScript, and test-file lint pass.
- [x] Test persistent post-execution mapping locking through one approved Luna
      test-only slice: return stays disabled during a document write and after one
      successful import settles; clicks cannot return to mapping. All six CSV mapping
      tests, TypeScript, and test-file lint pass. No application changes were needed.
- [x] Test the schema-invalid production-page handoff gate through an approved Luna
      test-only slice: complete field mapping produces one schema-invalid record,
      shared handoff is disabled, blocked clicks cannot enter shared flow, and no
      writes occur. All seven CSV mapping tests, TypeScript, and test-file lint pass.
- [x] Test the ambiguous-duplicate production-page handoff gate through an approved
      Luna test-only slice: a schema-valid record has two existing matches, real review
      reports ambiguity, shared handoff stays disabled, and no writes occur. All eight
      CSV mapping tests, TypeScript, and test-file lint pass; one read-count assertion
      repair was needed. No application changes were made.
- [x] Parent/child production-page feature-gate test and initial type-report repair:
      the approved Luna panel-local ref suppresses undefined reports only until the
      first concrete type is reported; later clears still forward. Callback dependencies
      remain stable. Both temporary traces are removed. The focused test and all nine
      CSV mapping tests pass, with the enabled legacy `Import 2 records` assertion,
      ready relationship, shared legacy gate, and no-write checks intact. TypeScript
      and scoped lint pass; no parent local repairs were needed. Authenticated/UI
      reproduction and type-change/clear verification remain user-performed.
- [x] Array-source production-page shared-handoff gate test: approved Luna test-only
      case requires a composed parent array. Parent repair one declares the join key
      as a relationship passthrough field; parent repair two waits for enabled legacy
      Import. A separately approved Luna query-only correction scopes the post-click
      title to the existing summary container. The focused array test and its case in
      the file-wide run pass, including all no-shared-controller/no-write assertions.
      TypeScript and test-file lint pass. No application changes or real-UI checks.
- [x] Busy-return test upload-readiness follow-up: approved Luna test-only correction
      awaits Prepare and its enabled state after upload, with the deferred gate,
      lock/no-write assertions, cleanup, and timeouts intact. Focused test and all ten
      CSV mapping tests pass; TypeScript (including a fresh forced check) and test-file
      lint pass. No parent repairs or application changes. Editor messages remain
      stale against the passing compiler; authenticated/visual checks remain pending.
- [x] Unmatched array-row production-page blocker test: approved Luna test-only
      case rejects a nonmatching parent key with file/row/key details and corrective
      guidance, retains uploaded sources and mapping/retry controls, exposes no
      records/shared execution controls, and preserves all write counts. Focused test
      and all eleven CSV mapping tests, fresh TypeScript, and test-file lint pass.
      No parent repairs or application changes. Real-UI parity remains unverified.
- [x] Corrected array-upload preparation resume: approved Luna test-only extension
      preserves the blocker assertions, replaces the unmatched item file in the same
      mounted page, and retries Prepare. Exactly two sources, a valid composed parent,
      cleared error, enabled legacy Import, retained array gate, and unchanged write
      counts are verified. Focused test and all eleven CSV mapping tests, fresh
      TypeScript, and test-file lint pass. No parent repairs or application changes;
      execution and authenticated/visual parity remain pending.
- [x] Existing-parent production-page relationship lookup: approved Luna test-only
      child upload uses a typed saved parent without uploading a parent file. Correct
      lookup type/field/value arguments, one ready link, one existing-parent match,
      enabled legacy Import, retained relationship gate, and unchanged write counts
      are verified. Mock implementation restores in `finally`; its return annotation
      uses `IDocument[]`. Focused test and all twelve CSV mapping tests, fresh
      TypeScript, and test-file lint pass. No parent repairs or application changes;
      relationship persistence and authenticated/visual parity remain pending.
- [x] Ambiguous existing-parent production-page lookup: approved Luna test-only
      case returns two distinct saved parents with the same key. Review shows zero
      ready links, one unresolved row, both unselected parent choices, and disabled
      legacy Import/link/shared actions. Blocked clicks retain review without writes;
      lookup mock restores in `finally`. One parent query repair avoids the duplicate
      debug message and requires the disabled Import assertion unconditionally.
      Focused test and all thirteen CSV mapping tests, fresh TypeScript, and test-file
      lint pass. No application changes. Parent selection, persistence, and real-UI
      parity remain unverified.
- [x] Ambiguous existing-parent selection: approved Luna test-only extension uses
      the real control after preserving every original blocker assertion. Selecting
      one parent yields one ready link, zero unresolved, and enabled legacy Import;
      linking/shared handoff remain disabled, blocked shared clicks retain review,
      and document/patch/relationship write counts remain unchanged. Parent repair one
      moved the initially misplaced block into the intended test. The extended focused
      test, fresh TypeScript, and scoped lint pass; no application code changed.
- [x] Add user-configurable saved-parent lookup to the CSV source setup: a Child
      source can select an existing parent object type and schema match field without
      uploading a Parent CSV, then select its child lookup column. The ambiguous-parent
      production-page test exercises those controls, duplicate matches, parent choice,
      safety gates, and unchanged write counts. All thirteen CSV mapping tests, fresh
      TypeScript, scoped ESLint, and whitespace checks pass. The initial test edit
      targeted the neighboring single-parent case and was corrected before validation.
- [ ] Extend saved-parent lookup to support top-level `uuid`, `slug`, and `label`
      fields, including field choices, candidate matching, and PostgREST lookup
      queries; add focused tests for all three fields. This is a bounded follow-up
      slice and still requires approval before implementation.
- [x] User-performed authenticated parent-selection review: user reports the
      saved-parent controls appear and work, duplicate matches block Import until a
      parent is selected, and shared flow remains gated. No Import or Link relationships
      action was reported. Visual review does not establish network-level zero-write
      proof.
- [x] Run the full project test suite and production build after the saved-parent
      UI change. The build passes with Vite externalization/chunk-size warnings. The
      suite initially had one Oikos relationship test failure; its fixture incorrectly
      used external ID `model-1` as canonical `record.slug` instead of upstream model
      slug `forecast-model`. An approved test-only helper correction separates those
      values. Focused Oikos test, all 245 project tests, fresh TypeScript, and scoped
      test-file ESLint pass. No Oikos runtime code changed.
- [x] Standalone production handoff upload readiness: approved Luna test-only
      correction awaits Prepare and its enabled state after upload. Upload-count,
      handoff/return/second-handoff, and no-write assertions remain intact, with no
      application changes, timeout changes, or parent repairs. Focused test, fresh
      TypeScript, and scoped lint pass; this test also passes in the file-wide run.
- [x] Restore a passing CSV mapping file: approved Luna test-only correction awaits
      the recovered legacy Import control with `findByRole`, retaining its enabled-state
      wait and every blocker, correction/resume, shared-gate, and no-write assertion.
      Focused test and all thirteen CSV mapping tests pass, including standalone
      handoff and extended parent selection. Fresh TypeScript, scoped lint, and editor
      diagnostics pass. No application/timeouts changes or parent repairs. This
      supersedes earlier file-wide failures; full-suite/build and user-performed
      authenticated/visual verification were not rerun.
- [ ] Obtain approval before another implementation slice. Broader visual checks,
      remaining blocked-input gates, and full CSV/XLSX file-page parity remain pending.
- [x] Save completed work on `refactor-import-process`: `da11ff6` (shared workflow),
      `438319c` (fixtures/tests/docs), and `a2bdec9` (mode pilot). Redundant branch deleted;
      nothing pushed. Unrelated PAM workbook/lock files remain excluded and untouched.
- [x] Verify the latest pilot with 178 selected import tests, including 17 fixture
      component tests, TypeScript, behavior-file lint, whitespace, and production build/
      fixture exclusion. Auth-free browser DOM smoke reached three documents/two links/
      zero errors. The existing individual-import effect lint error remains unchanged.
- [x] Start CSV/XLSX integration with an opt-in shared-controller handoff for clean
      standalone file sources before writes. Scope to the current upload IDs; exclude
      remote/unrelated sources. Keep legacy execution and gate unsupported arrays,
      parent/child relationships, ignored rows, and already-started CSV imports.
- [x] Verify shared mapped CSV in both modes and a real selected XLSX sheet;
      same-ID source edits invalidate stale evidence, recorded successes survive
      blocked post-write edits, and late uploads/activity cancellation are covered.
      186 selected tests (including 28 focused UI tests), TypeScript, behavior-file
      lint, and production build pass. No new browser/live-backend validation here.
- [ ] Test the actual production file-controller/handoff controls, including
      return-to-mapping and post-execution locking, before broadening feature gates.
      The standalone CSV upload/prepare/handoff/return case now passes with auth/service
      doubles, as do the busy preparation guard and persistent post-execution lock;
      schema-invalid and ambiguous-duplicate handoff gates also pass. Other blocked-input
      and feature-gate cases and full parity remain.
- [ ] Complete CSV/XLSX integration and parity for parent/array/external-parent
      relationships, ignored rows, full sheet/type/schema selection, and multi-file
      orchestration before retiring legacy execution. Config/UI mappings remain required.
- [ ] Complete visual and user-performed authenticated/live-backend verification;
      automated/component and browser DOM results do not replace these checks.
- Defer moving the ERDDAP fixture into the shared UI until interactive UI testing
  requires it; its current normalization/preparation preview remains unchanged.

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

### Unified workflow implementation

Execution plan and bounded agent task prompts: [REFACTOR_PLAN.md](REFACTOR_PLAN.md).
Track completion here; the plan defines scope and acceptance checks.

- [ ] Required CSV/XLSX parity: preserve all existing file-import functionality, including config-based field mapping, optional UI mapping and overrides, parsing/sheet selection, single/multi-file behavior, fixed fields, discriminators, and parent/array relationships. Verify automated and user-performed parity before retiring existing workflows.
- [ ] Keep field mapping source-neutral: configured mappings run before validation even when the UI is skipped; optional UI mapping remains available for files and remote records such as ERDDAP in either workflow mode. Verify file/remote mapping parity.
- [x] Define shared Simplified/Interactive policy, configured inputs, opt-in review steps, explicit automatic type creation, and conflict defaults.
- [x] Add a pure source readiness evaluator that checks permissions, current validation evidence, reconciliation, relationship blockers, and review requirements before automatic progression.
- [x] Retain validation evidence from preparation; preparation without a schema/validator remains available for inference but cannot authorize automatic execution through the evaluator.
- [x] Verify the policy foundation with plan regression tests, neighboring CSV/workbook/session/relationship tests (66 passing), TypeScript checking, and touched-file lint.
- [x] Task 2A execution-only slice: add `executePreparedImportAllSource`, align policy conflict defaults, pause unsupported stages, gate writes on readiness, and return post-execution readiness; 44 focused plan tests, TypeScript, and touched-file lint pass.
- [x] Task 2B preparation-only slice: add `progressImportAllSourcePreparation` using caller-supplied canonical records/type/schema, refresh validation/reconciliation after edits, and return explicit review invalidations; 51 plan tests and 87 selected import regression tests, TypeScript, and touched-file lint pass.
- [x] Task 2B type/review-state contract: inject `createTypeIfMissing`, require policy and permissions, honor schema review, preserve caller schema, retain returned type on cancellation, and return filtered review acknowledgments; 56 plan tests and 92 selected import regression tests, TypeScript, and touched-file lint pass.
- [x] Task 2B real-service adapter: add `createImportAllTypeCreationAdapter` and reuse it from existing automatic-creation buttons; lookup/reuse types, recover unique-slug races, infer no-enum defaults, refresh owned default schemas, and forward authentication/cancellation. Eight creation tests and 100 selected import tests, TypeScript, and whitespace checks pass; lint has no errors and one existing page hook warning.
- [x] Wire document-source `prepareSelected` through shared preparation, retain filtered review acknowledgments, preserve composite fetch-once and existing array handling, and reuse retained records after type setup; 60 plan tests and 115 selected import regression tests, TypeScript, and whitespace checks pass. Authentication controls frontend eligibility; backend authorization remains authoritative.
- [x] Task 2C document cancellation/retry helper slice: guarded explicit retry requires `retryReconciliation`, refreshes selected failed/unattempted records, and rechecks readiness; imported/ignored results and UUIDs are preserved. Cancellation retains successful in-flight siblings and leaves later work unattempted; non-abort errors remain visible. 65 plan tests and 120 selected import regression tests, TypeScript, scoped lint, and whitespace checks passed at helper completion.
- [x] Task 2C document caller slice: `pages/all.tsx` uses guarded execution for explicit runs/retries, resolved schema, authenticated eligibility, conflict defaults, and Execute review acknowledgment. Retries refresh once; partial results/UUIDs survive cancellation and stale operations are ignored. Completed sources resume without writes; genuine pauses show actionable errors and stop later sources/links. Composed array parents receive fresh validation evidence. 68 plan tests and 123 selected import tests, TypeScript, scoped lint, and whitespace checks pass; the existing hook warning remains.
- [x] Task 2C relationship readiness/caller slice: ready plans require document/predicate UUIDs, and link completion is distinct from document completion. Successful/existing links survive cancellation/retry; explicit retries select failed/unattempted links only. Cancellation publishes unfinished outcomes even before the first lookup; superseded caller results are ignored. Retained UUIDs stay authoritative during lookup. 21 relationship tests and 126 selected import tests, TypeScript, and whitespace checks pass; lint has zero errors and the existing hook warning remains.
- [ ] User-performed authenticated document caller verification: cancel a multi-source run after some writes, confirm retained results/UUIDs, resume without duplicate successful writes, retry only failed records, and confirm validation/ambiguity pauses stop later sources/links with actionable messages.
- [x] User reported authenticated error display and retry working (2026-10-13), with an extra manual preparation pass required. This report does not establish duplicate-write avoidance or composite/array-parent behavior.
- [x] Follow-up: retain the Import step after execution attempts/errors and make both automatic type buttons validate/reconcile retained records after creation, without another source load. Refresh type/schema context after partial creation/cancellation. 127 selected import tests and TypeScript pass; scoped lint has zero errors and the existing hook warning.
- [x] Unauthenticated Import All fixture harness: reuse the real view with explicit eligibility, empty token, fixture sources/context, and fully injected in-memory services. Normal app authentication is unchanged; dev entry rejects production use and unexpected fetch calls, and is excluded from the normal production build. Start with `npm run dev:import-test`.
- [x] Three automated real-view fixture tests cover discovery/preparation, automatic missing-type creation without another Prepare click, document import, error display/unfinished-link retry, discovery cancellation/resume, and link cancellation retaining completed links without repeat document writes. 130 selected import tests, TypeScript, scoped lint (existing hook warning), and production build pass. Browser fixture smoke check reached three documents/two links/zero errors without login.
- [x] Auth-free CSV/worksheet mapping baseline: reuse the real CSVSourceEditor and adapter; verify configured nested mappings, quoted/numeric values, fixed discriminators, relationship keys, UI destination/role changes, excluded columns, and startAtImport invalidation. Worksheet conversion produces the same canonical records as CSV. One new editor test plus one worksheet parity test and existing regressions yield 157 passing selected tests; TypeScript and touched lint pass. The fixture is available at `import-test.html?view=csv`.
- [x] Actual XLSX fixture tests: parse genuine binary bytes and File with the real reader, reject malformed bytes, preserve sheet order/quotes/numbers, omit empty sheets, and match CSV canonical records. Fixture UI upload tests cover empty-selection blocking, selected-sheet exclusion, and isolated per-sheet mapping edits. Production and fixture share selectWorkbookSheets. 162 selected tests, TypeScript, touched lint, and production build pass. Browser DOM upload selected only Deployments and confirmed its mapped data without auth.
- [x] Production XLSX selection and preparation coverage: approved test-only production-page tests upload the binary workbook and verify one-sheet selection, isolated mapping panels for two selected sheets, and preparation into two loaded source entries. Document, patch, and relationship write counts stay unchanged; no Import or Link action is executed. Focused tests and all fifteen CSV mapping tests, fresh TypeScript, scoped ESLint, and whitespace checks pass. Test refinements use distinct configured source keys, required-preview mode, and panel open-state assertions. No application changes; no full-suite/build or authenticated/visual rerun.
- [x] Production XLSX legacy execution coverage: include `external_key` in the test schema, assign it the Slug role through the production mapping UI, and verify the selected-sheet import via the mocked `postDocument` call and payload. All 16 CSV mapping tests and the full 248-test suite pass; `npm run build` passes with Vite warnings. Backend calls are mocked; no live writes or application changes occurred.
- [x] Store the workbook as the actual project file [testing/fixtures/csv-mapping.xlsx](testing/fixtures/csv-mapping.xlsx), removing embedded base64. Tests read it from disk; the browser harness allows its exact local GET only and still blocks unexpected requests. All 162 selected tests and the browser file-loading check pass; fixture helpers are asynchronous.
- [ ] Complete file mapping parity through production single/multi-file import workflows. Visual/manual-click verification remains pending after the prior integrated-browser blank screenshot/timeouts. Existing object-type label mapping precedence over a CSV label role remains unchanged.
- [x] ERDDAP normalization/schema-mapping baseline: realistic in-memory catalog/info fixtures cover raw versus typed attributes, numeric/boolean/range coercion, normalized schema matches, preserved source/variable metadata and provenance, lazy/composite fetch-once behavior, and real configured MODL schema preparation without auth. Fixed dataset-ID fallback to use the actual schema property name (including ID). The read-only preview is available at `import-test.html?view=erddap`; 165 selected tests, TypeScript, touched lint, and production build pass. Browser DOM preparation validated both record groups and blocked unexpected requests.
- [ ] Complete shared config/UI field remapping for ERDDAP and full Import All controller integration; the current fixture tests existing schema-name matching and is a read-only composite/preparation preview, not a new arbitrary remapping UI or complete ERDDAP execution workflow.
- [x] Auth-free Import All blocker/retry UI tests: invalid schema data and duplicate same-type/same-slug existing documents prevent execution and all document/relationship writes. A fail-once document exposes its error, retries only that record after fresh reconciliation, preserves successful UUID/data, and completes links through the subsequent Execute action without repeating document writes. Seven fixture component tests and 168 selected import tests pass; TypeScript and scoped lint pass. No production code/auth changes; these are automated component tests, not new visual or live-backend verification.
- [ ] Expand unauthenticated fixtures to the automatic setup dialog and export preparation once its owning path is identified. Manual type selection/form is intentionally unavailable in the current fixture view because it still uses auth-backed services.
- [ ] Separate dependency follow-up: npm audit reports 13 advisories (9 high, 4 critical); no dependency remediation was performed in this harness slice.
- [ ] User-performed follow-up verification: retry failed records/unfinished links without manually preparing again; use both Create missing types and dialog Create automatically, confirming valid records become prepared automatically and genuine validation errors still require correction.
- [ ] User-performed authenticated relationship caller verification: cancel after links complete, confirm completed links remain settled, retry unfinished links without repeating document writes, and verify blocked UUIDs/relationship plans show actionable errors. Composite and array-parent behavior remains to verify in the UI.
- [ ] Connect explicit type-creation actions to the full shared caller; automatic creation is not enabled by the preparation action.
- [ ] User-performed authenticated preparation verification: remote and composite preload, missing-type inference, schema validation, unchanged manual creation, cancellation, and preparation error recovery.
- [ ] User-performed authenticated verification of the shared creation adapter: automatic missing-type creation, saved no-enum inferred schema, existing-type reuse, refreshed schema availability, and creation error reporting.
- [x] Import All Simplified/Interactive mode pilot: Interactive remains the default with explicit Discover/Prepare/Execute actions; Simplified advances discovery, preparation, guarded document execution, and links from Import when ready. Configured reviews require acknowledgment; required inputs, missing types, invalid/ambiguous records, and write eligibility still pause/block. Missing-type creation remains explicit, followed by Import to resume. Returned plan snapshots avoid stale React state; cancellation retains unfinished-link results for retry. 178 selected tests and 17 fixture component tests pass, TypeScript and behavior-file lint pass, and the production build passes. Browser DOM verification reached three documents/two links/zero errors without login; visual/authenticated checks remain pending. Existing individual-import effect lint error is unchanged.
- [ ] Connect CSV/XLSX and remaining individual/composite flows to shared mode progression, preserving mapping, arrays, worksheets, and multi-file functionality. Add user-selectable extra review panels and required-input editors as those source workflows are integrated; configured review acknowledgment is not arbitrary field remapping.
- [ ] Consolidate source selection, optional configuration/review, errors, progress, and retry into one shared UI.
- [ ] User-performed authenticated UI verification after controller integration: clean automatic import, opt-in/required-input pauses, correction/resume, cancellation, and failed-only retries.

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
- [x] Discover datasets from `/info/index.json` and `/search/index.json` URLs, using IDs, titles, and summaries; fetch full metadata only for selected candidates during preload.
- [x] Normalize ERDDAP global attributes and per-variable attributes into canonical record data.
- [x] Add config-driven text overrides for `dataset_id`, `global_attributes.id`, and `global_attributes.platform_name`; edits invalidate validation and reconciliation.
- [x] Add a targeted MODL ERDDAP source that maps typed global attributes to schema properties and pins object schema slug `modl`.
- [x] Define the variable metadata schema with top-level `dataset_id` and a name-keyed `variables` object.
- [x] Add a targeted variable-metadata source that stores every variable and its attributes in one grouped record matching the `modl_variable_metadata` schema.
- [x] Configure the MODL dataset and grouped variable-metadata sources to link by parent canonical slug and child `dataset_id` in Import All.
- [x] Add a dedicated `/import/modl` composite view, separate from Import All, that loads metadata once, creates the MODL dataset and its grouped `modl_variable_metadata` record against their respective schemas, and persists their relationship through the shared relationship planner. Keep generic `/import/erddap_metadata` as its own view and exclude ERDDAP sources from `/import/all`.
- [x] Add searchable remote preload records, with select-all and random selection scoped to visible results while preserving hidden selections.
- [x] Add parser, adapter, catalog-discovery, and lazy-loading tests.
- [ ] User-performed authenticated browser verification with live AOOS single-dataset, catalog, and composite targeted MODL imports, including CORS, search/filter selection, preload, overrides, schema validation, and the grouped child relationship. Do not attempt browser checks without explicit user direction.
- [x] User-confirmed authenticated browser verification: composite import created `modl` and `modl_variable_metadata` records and related them successfully.
- [ ] Verify the remaining live AOOS cases: generic single-dataset and catalog/search imports, CORS, search/filter selection, preload, overrides, and schema validation. Do not attempt browser checks without explicit user direction.

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
- [x] Authenticated UI verification: user selected two sheets and reported their
      types and mappings appeared independent in Upload files and Map fields.
- [x] Authenticated UI observation: **Edit type and validate** did not allow
      changing to a different type; an auth-free production-page test reproduced and
      fixed the blocked picker interaction.
- [x] User-performed authenticated recheck: confirmed changing one workbook
      source's type from **Edit type and validate** leaves the other source's type
      unchanged. This confirms UI behavior only, not backend writes.
- [x] User-performed authenticated validation review: confirmed a schema-invalid
      record's count and details remain available after reopening **Edit type and
      validate**, with the other sheet unchanged. This confirms UI review only.
- [x] Authenticated XLSX readiness check: user reports Type `None`, `0 valid`, `0 invalid`, `1 pending` at first; after choosing a type in the modal, status became `1 valid · 0 invalid`. Returning via Back to CSV sources and Continue to import recalculated readiness and exposed the page-level Import button. User did not click Import/Link; this confirms readiness only, not persistence.
- [ ] Authenticated UI verification: confirm conflict issues remain reviewable and
      complete remaining multi-sheet/array parity checks. Schema-invalid record
      reviewability is now confirmed above.
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
