# Import Refactor Handoff

## Authenticated conflict-review check (2026-10-20)

- On Import Records, the user reported one duplicate under **Duplicate reporting**
  for a record whose label differed from the existing record's label. Duplicate
  detection is therefore not limited to identical labels. The report does not
  establish whether Import or Link was clicked, or whether any backend writes
  occurred.
- The user noted that the database prefixes imported slugs with the selected
  object-type slug. Reconciliation now checks both the supplied and prefixed slug
  in CSV, workbook, and Import All flows, including the final create guard; it
  avoids double-prefixing an already-prefixed slug. A differing label remains a
  conflict even when the slug matches.
- Validation: 125 focused reconciliation/orchestration/page tests pass, as do
  TypeScript, production build, and `git diff --check`. The build retains existing
  Vite Quicktype/chunk warnings. Scoped ESLint reports
  `react-hooks/set-state-in-effect` at `pages/import_records_page_impl.tsx:333`,
  outside this change.
- The implementation and tests are committed on `refactor-import-process` as
  `e56a5d7` (`Check type-prefixed import slugs`).
- Resume sequence:
  1. Decide whether the approved-scope follow-up for saved-parent top-level
     `uuid`, `slug`, and `label` lookup belongs in this branch; obtain approval
     before that implementation slice.
  2. Finish production CSV/XLSX controller and handoff gate coverage, then perform
     authenticated parity checks for parent/child, external-parent, array,
     ignored-row, multi-file, and multi-sheet workflows. Keep legacy execution
     until parity is confirmed.
  3. Verify authenticated Import All cancellation/resume/retry after partial
     writes, including retained UUIDs, no duplicate successful writes, and
     actionable validation/ambiguity pauses.
  4. Complete source-neutral mapping parity for files and remote sources such as
     ERDDAP in both workflow modes; then complete shared presentation and route
     compatibility (Tasks 5A/5B in `REFACTOR_PLAN.md`).
  5. Run full-suite/type/lint/build closeout, clean up only superseded workflow
     state, and document any remaining live-backend checks.
- `testing/fixtures/conflicts-with-known-parent.csv` is the two-line manual
  conflict-review input and is included with the checkpoint commit. The other
  untracked local samples `public/ambiguous-child.csv` and
  `public/pam/pam_sample_workbook_complete.xlsx` were not included; preserve them
  locally or transfer separately if needed. Do not assume they exist on another
  machine.

## Previous pause checkpoint (2026-10-16)

- At this checkpoint, the user had paused before the authenticated conflict-review
  check. The check is now recorded above.
- The remaining authenticated conflict and array-parity checks are UI checks
	only; they do not establish backend writes.

## Authenticated XLSX validation review (2026-10-16)

- User confirmed a workbook source with a schema-invalid record showed its invalid
	count and validation details in **Edit type and validate**; the review remained
	available after closing and reopening the editor. The other sheet's type and
	mapping remained unchanged.
- This confirms authenticated UI reviewability only. No Import or Link action was
	reported, and this is not evidence of backend writes.

## XLSX Import Records type-switch fix (2026-10-16)

- The user reported that **Edit type and validate** did not allow switching types
	after selecting two workbook sheets. An auth-free production-page test
	reproduced a blocked pointer interaction when choosing a type from the modal:
	the small-list SelectInput rendered a portaled dropdown under the modal's
	`pointer-events: none` body state.
- The CSV source type picker now uses the utility's native select whenever a
	source schema is supplied, avoiding the portaled menu in this modal. The
	regression test selects an alternate type for Sites and verifies Deployments
	keeps its original type. All 17 CSV mapping tests and `npm run build` pass;
	mocks confirm no document or relationship writes in the test. Build reports
	the existing Vite dependency/chunk-size warnings.
- User-performed authenticated recheck confirmed a source's type can be changed
	in this step while the other source retains its type. This verifies the UI
	behavior after the fix only; it is not evidence of backend writes.

## Authenticated multi-sheet XLSX review (2026-10-16)

- User selected two workbook sheets and reported that their types and mappings
	appeared independent in both the Upload files and Map fields steps.
- At Import Records, selecting **Edit type and validate** did not allow the user
	to change to a different type. The later authenticated recheck above confirmed
	that the type-switch fix resolves this behavior.
- The initial review and recheck cover setup and type editing only, not backend
	writes. No Import or Link action was reported; the automated XLSX execution test
	uses mocked persistence.

## Authenticated XLSX readiness check (2026-10-15)

- User-performed review selected a workbook sheet and reached Import Records.
	Initially Type was `None`, with `0 valid`, `0 invalid`, and `1 pending`, so no
	page-level Import button appeared. Selecting an object type in the modal changed
	the row to `1 valid · 0 invalid`; the modal had its own Import action, but the
	page-level button remained hidden after closing it.
- `handleObjectTypeSelected` resets `startAtImport: false` when the type changes.
	Returning with Back to CSV sources and choosing Continue to import recalculates
	readiness; the user confirmed the page-level Import button then appeared. No
	Import or Link action was clicked.
- This confirms the known-type page-level readiness path only, not persistence.
	The automated production-page test uses a known fixture type/schema and verifies
	a mocked write. Broader authenticated parity and blocked-state checks remain open.

## Legacy XLSX execution test completed (2026-10-15)

- The approved test-only production-page case imports the selected Deployments
	worksheet through the legacy CSV Import control. Its test schema includes the
	workbook's `external_key` column so required-mode mapping is complete.
- The embedded `BatchLoadDocuments` progress is intentionally hidden in this page;
	the test waits for its mocked `postDocument` call and verifies the saved payload
	instead of querying hidden UI text. The test uses the production mapping selector
	to assign `external_key` the Slug role, then verifies the resulting `deploy-2`
	slug and mapped data. All 16 CSV mapping tests and the full 248-test suite pass.
	The production build also passes with Vite dependency/chunk-size warnings. Backend
	ports are mocked, so no live writes occurred; no application code changed.

## Production XLSX selection coverage added (2026-10-15)

- Two approved test-only cases in `pages/csv.mapping.test.tsx` mount the production
	`CSVImportPage` and upload the real binary workbook. One deselects Sites and adds
	only Deployments; the other adds both sheets and verifies their separate mapping
-	panels show their own rows when open, then prepares the workbook and confirms
	two separate sources are loaded. Document, patch, and relationship write counts
	remain unchanged; no import or relationship linking was executed.
- The focused tests and all fifteen CSV mapping tests pass, as do fresh TypeScript,
	scoped test-file ESLint, and whitespace checks. Test refinements used distinct
	configured source keys, required-preview mode, and `<details>` open-state
	assertions because collapsed content remains in the DOM. No application code
	changed. Full-suite/build and authenticated/visual checks were not rerun for
	this slice.
- Remaining parity: production sheet-selection coverage is now present; full
	single/multi-file import workflows, broader CSV/XLSX parity, and visual/manual
	verification remain pending. Obtain approval before another implementation slice.

## Saved-parent lookup controls added (2026-10-15)

- One approved CSV UI slice adds saved parent object type, parent match field,
	and child match field controls for a Child source in the CSV source setup.
	Selecting a type configures the existing `lookup` policy without requiring a
	parent CSV; match fields come from the saved type's schema and child headers.
- The ambiguous-parent production-page test now configures those values through
	the UI, returns two saved parents with the same `P-1` key, and verifies the
	ambiguity/selection gates and unchanged document, patch, and relationship write
	counts. No writes were executed.
- All thirteen CSV mapping tests, fresh TypeScript (`npx tsc -b --force`), scoped
	ESLint, and whitespace checks pass. The first test edit landed in the adjacent
	single-parent case; it was restored, moved to the ambiguity test, and verified.
- User reports the saved-parent controls appear and work in the authenticated CSV
	UI, and that the duplicate-match and parent-selection behavior and shared-flow
	gates work as expected. No Import or Link relationships action was reported.
	Visual checks do not establish network-level zero-write proof. Do not create or
	modify backend records to manufacture test data.
- Corrected the Oikos test fixture helper to keep external ID `model-1` separate
	from canonical `record.slug` `forecast-model`, matching the production
	`oikosModels` adapter contract. No Oikos runtime code changed. The focused Oikos
	test and full project suite pass (245 tests); fresh TypeScript and scoped ESLint
	pass. The earlier production build passes; it reported quicktype Node-module
	externalization and chunk-size warnings.
- The authenticated parent-selection review, production build, and full automated
	test suite are complete. Broader CSV/XLSX parity remains pending; obtain approval
	before the next bounded implementation slice.

## Corrected array-upload Import readiness verified (2026-10-15)

- One approved `GPT-6 Luna (copilot)` test-only correction changes the recovered
	legacy Import query from synchronous `getByRole` to awaited `findByRole` in the
	existing unmatched-row/corrected-upload test. The enabled-state wait and all
	blocker, correction/resume, shared-gate, and no-write assertions remain intact.
	No application code, fixtures, or timeouts changed; no parent repairs.
- Parent review and focused test pass. All thirteen CSV mapping tests pass,
	including standalone handoff, parent selection, and corrected array-upload
	resume. Fresh TypeScript (`npx tsc -b --force`), test-file lint, and editor
	diagnostics pass. This supersedes the earlier file-wide failure checkpoints.
- No full-suite/build or browser/authenticated/visual checks ran. No imports or
	relationships were executed in this slice; no commits or pushes. Automated
	checks do not replace user-performed authenticated UI verification or establish
	relationship persistence and full CSV/XLSX parity.
- Stop after this slice. Next proposed step, awaiting approval: user-performed
	authenticated parent-selection review, checking unselected ambiguity blocks
	Import, selecting one parent enables legacy Import, and shared flow stays gated,
	without clicking Import or Link relationships. No additional agent is approved.

## Standalone upload readiness corrected (2026-10-15)

- One approved `GPT-6 Luna (copilot)` test-only correction makes the standalone
	production handoff test await `Prepare import` and its enabled state after
	upload. Upload-count, both handoffs, return-to-mapping, and no-write assertions
	remain unchanged. No application code or timeouts changed; no parent repairs.
- Parent review and focused test pass. Fresh TypeScript (`npx tsc -b --force`)
	and test-file lint pass. Editor diagnostics still reference old code despite
	the fresh compiler passing.
- Latest CSV mapping file result: 12 passing, one failing. Standalone handoff and
	parent selection pass. Corrected array-upload resume still cannot synchronously
	find `Import 1 records` (line 1171). Its cause remains unconfirmed; stop at this
	neighboring-test boundary without additional agents or implementation.
- No full-suite/build or browser/authenticated/visual checks ran. No imports or
	relationships were executed in this slice; no commits or pushes. Automated
	component checks do not replace user-performed authenticated UI verification.
- Next proposed bounded slice, awaiting approval: investigate corrected
	array-upload resume's legacy Import readiness query, retaining all original
	blocker, correction/resume, shared-gate, and no-write assertions.

## Parent-selection extension: focused pass, file-wide pause (2026-10-15)

- One approved `GPT-6 Luna (copilot)` test-only extension selects
	`existing-parent-1` through the real parent control in the existing ambiguous
	lookup test. All original ambiguity, unselected-choice, disabled-action,
	blocked-click, and no-write assertions remain before selection. Selection yields
	one ready link, zero needing resolution, and enabled legacy Import. The chooser
	and ambiguity message disappear; relationship linking and shared handoff remain
	disabled. A blocked shared click retains review and all write counts.
- Parent repair one moves Luna's block from the neighboring duplicate-ambiguity
	test into the intended parent test. The initial focused pass ran the unchanged
	parent test; the first file-wide run exposed the misplaced block (12 pass,
	one fail), and TypeScript found its out-of-scope variables.
- After repair, the extended focused test passes. Fresh TypeScript
	(`npx tsc -b --force`) and test-file lint pass. Editor diagnostics still reference
	old code despite the fresh compiler passing. No application code changed.
- Latest CSV mapping file result: 11 passing, two failing. The extended parent
	test passes. The standalone production handoff test cannot synchronously find
	`Prepare import` (line 328); corrected array-upload resume cannot synchronously
	find `Import 1 records` (line 1169). Cause is not established. Stop at this
	neighboring-test scope boundary; do not claim the thirteen-test file is green.
- No imports or relationship writes were executed in this extension. No full-suite,
	build, browser/authenticated/visual checks, commits, or pushes ran. Authenticated
	UI verification remains user-performed; automated checks do not establish it.
- Next proposed bounded slice, awaiting approval: investigate upload/Prepare
	readiness in the standalone production handoff test without weakening its
	handoff, return, or no-write assertions. Do not launch another agent yet.

## Ambiguous existing-parent test complete (2026-10-14)

- One approved `GPT-6 Luna (copilot)` test-only slice seeds two saved parents
	with distinct UUIDs and the same lookup key for a child-only CSV upload. Review
	reports zero ready links, one needing resolution, and two existing-parent matches.
	Both parent choices are offered with no selection. Legacy Import, relationship
	linking, and shared handoff stay disabled; blocked clicks preserve review and
	all write counts remain unchanged. The lookup mock restores in `finally`.
- One parent repair scopes the visible ambiguity message away from the development
	planner snapshot and makes the disabled legacy Import assertion mandatory rather
	than conditional. No application code or timeouts changed.
- Verified: focused test and all thirteen CSV mapping tests pass, as do fresh
	TypeScript (`npx tsc -b --force`), test-file lint, and whitespace checks. Editor
	diagnostics still reference old code; the fresh compiler reports no errors.
- No full-suite/build, browser/authenticated/visual checks, commits, or pushes.
	Choosing a parent and relationship persistence are not covered by this slice.
- Stop before additional agents or implementation. Next proposed bounded slice,
	awaiting approval: one Luna test-only extension selecting an ambiguous parent
	and verifying review resolves and legacy Import becomes ready without writes.

## Existing-parent lookup test complete (2026-10-14)

- One approved `GPT-6 Luna (copilot)` test-only slice uploads a child CSV without
	a parent file and seeds one typed saved parent. The production page looks up the
	configured parent type UUID, `code`, and `P-1`; review reports one ready link,
	zero needing resolution, and one existing-parent match. Legacy Import is enabled,
	shared handoff remains relationship-gated, and no writes occur after a blocked
	handoff click. The lookup mock restores its prior implementation in `finally`.
- The lookup double now has a `Promise<IDocument[]>` annotation, matching adjacent
	typed service doubles. No application changes or parent repairs were needed.
- Verified: focused test and all twelve CSV mapping tests pass, as do fresh
	TypeScript (`npx tsc -b --force`), test-file lint, and whitespace checks. Editor
	diagnostics still reference old code; the fresh compiler reports no errors.
- No full-suite/build, browser/authenticated/visual checks, commits, or pushes.
	This verifies lookup and review readiness, not actual relationship persistence.
- The subsequently approved ambiguous existing-parent slice is complete above;
	its latest verification and proposed next step supersede this earlier checkpoint.

## Corrected array-upload resume test complete (2026-10-14)

- One approved `GPT-6 Luna (copilot)` test-only slice extends the existing
	unmatched-row test rather than adding another case. All original blocker checks
	remain. In the same mounted page, replacing the item upload with a matching
	parent key and retrying Prepare clears the error and yields exactly two sources,
	one valid composed parent, and enabled legacy Import. The array shared-flow gate
	remains in force and all document/patch/relationship write counts stay unchanged.
- Verified: focused block-then-correct test and all eleven CSV mapping tests pass,
	as do fresh TypeScript (`npx tsc -b --force`), test-file lint, and whitespace checks.
	No parent repairs or application changes. Editor diagnostics still reference old
	code; the fresh compiler reports no errors.
- Full-suite/build, browser/authenticated/visual checks, commits, and pushes were
	not run. This covers preparation resume, not execution or complete file parity.
- The subsequently approved existing-parent lookup slice is complete above;
	its latest verification and proposed next step supersede this earlier checkpoint.

## Unmatched array-row blocker test complete (2026-10-14)

- One approved `GPT-6 Luna (copilot)` test-only slice adds a production-page
	parent/item upload with a nonmatching `parent_code`. Preparation reports the
	existing array-composition blocker, file/data-row/key details, and corrective
	message. Uploaded sources and mapping/retry controls remain available; records,
	shared handoff, and execution controls are absent. All write counts stay unchanged.
- Verified: focused test and all eleven CSV mapping tests pass, as do fresh
	TypeScript (`npx tsc -b --force`), test-file lint, and whitespace checks. No parent
	repairs or application changes. Editor diagnostics still reference old code;
	the fresh compiler reports no errors.
- Full-suite/build, browser/authenticated/visual checks, commits, and pushes were
	not run. Control availability is covered, not successful corrected-input resume.
- The subsequently approved corrected-upload resume slice is complete above;
	its latest verification and proposed next step supersede this earlier checkpoint.

## Busy-test readiness correction complete (2026-10-14)

- One approved `GPT-6 Luna (copilot)` test-only correction awaits the Prepare
	button and its enabled state after upload in the busy-return test. The deferred
	reconciliation gate, lock/no-write assertions, cleanup, and default timeouts are
	unchanged. No application code changed and no parent repairs were needed.
- Verified: focused busy-return test and all ten CSV mapping tests pass, as do
	TypeScript, a fresh `npx tsc -b --force`, test-file lint, and whitespace checks.
	Editor diagnostics still reference old unrelated code; the fresh compiler passes.
	The array-source case also completes all safety assertions in this latest run.
- Full-suite/build and browser/authenticated/visual checks were not run. No
	commits or pushes. Real application parity remains user-performed and incomplete.
- The subsequent approved unmatched-array-row blocker slice is complete above;
	its latest verification and proposed next step supersede this earlier checkpoint.

## Historical array gate and busy-test pause (2026-10-14)

- One approved `GPT-6 Luna (copilot)` test-only slice adds a matched parent/item
	upload case in `pages/csv.mapping.test.tsx`. The parent schema requires the
	composed `items` array; no application code was changed.
- First focused run stopped at mapping review. Parent repair one declares
	`parent_code` as an array-source relationship passthrough field; the focused
	test then passed. The file-wide run was nine passing/one failing at a synchronous
	legacy Import query. Parent repair two waits for the original enabled
	`Import 1 records` assertion with the default `waitFor` timeout.
- That slice exhausted both repairs with a duplicate post-click title query. A
	separately approved Luna query-only correction now scopes that assertion to the
	existing loaded-source summary container. Only one test query changed. The
	focused array test passes, and the array case also passes in the file-wide run,
	including composed-parent validation, enabled legacy Import, the array gate,
	blocked handoff, no shared-controller controls, and unchanged write counts.
- Latest file-wide result is nine passing/one failing in the neighboring busy
	return-guard test, not the array case. It fails looking for `Prepare import`
	immediately after upload, before the page has finished loading the source. That
	test uses a synchronous lookup; an asynchronous readiness query is the local
	hypothesis, not a verified correction. Parent stopped at this scope boundary.
	TypeScript, test-file lint, editor diagnostics, and whitespace checks pass.
- Stop before more edits, agents, or test runs. Next proposed bounded slice,
	awaiting approval: one Luna test-only correction awaiting upload/Prepare readiness
	in the busy-return test, preserving the deferred reconciliation gate and all
	lock/no-write assertions, then focused and file-wide checks. No full-suite/build,
	browser/authenticated checks, commits, or pushes ran in the query-only slice.

## Parent/child gate repair complete (2026-10-14)

- One approved `GPT-6 Luna (copilot)` repair adds a panel-local ref that ignores
	undefined type reports until a concrete type has been reported. Later clears
	still reach the controller; callback dependencies remain unchanged. This avoids
	treating the initially unset session type as a change to the prepared CSV source.
- Temporary controller logging, test trace subscriptions, console capture, and
	diagnostic-only helper output are removed. The original enabled legacy Import
	control, relationship-ready, shared feature-gate, and no-write assertions remain.
- Verified by parent: focused parent/child test passes; all nine CSV mapping tests
	pass; `npx tsc -b`, a fresh `npx tsc -b --force`, and scoped lint for both touched
	files pass. Editor test diagnostics still point to old code; the forced compiler
	check reports no errors. No local repair
	attempts were needed. No full-suite/build, browser, authenticated/visual checks,
	commits, or pushes ran in this slice. Real-UI reproduction and type-change/clear
	behavior still need user-performed verification.
- The subsequent approved array-source gate slice is paused above. Parent/child
	completion remains valid; further implementation or agents require approval.

### Historical diagnostic sequence

- User approved one retry with parent-selected `GPT-6 Luna (copilot)` after the
	first delegation stopped without edits. The retry added one production-page
	parent/child gate test and test-helper options for cloned type/schema/config
	fixtures. No application changes were made.
- Two parent local repairs corrected configured upload selectors and multi-file
	transition expectations. The earlier isolated test passed: two CSV sources load, one
	relationship is ready, shared handoff is feature-gated, the legacy Import control
	is enabled, and no writes occur. That isolated result predates the provider fix.
- Latest full CSV mapping file run: eight passing, one failing. The new relationship
	test now fails waiting for the legacy `Import 2 records` control. The multi-file
	summary, ready relationship, and shared feature-gate assertions pass before it.
	The enabled legacy-control assertion remains intact; no root cause is established.
- A separately approved diagnostic probe captured a missing QueryClientProvider
	error in object-type selection. The approved Luna correction now gives each
	production-page mount an isolated client with retries disabled, clears clients
	after unmount, and removes the temporary boundary. Unexpected-fetch rejection
	and service doubles remain active. One parent local repair scopes the outer title
	query to `2 sources loaded`, avoiding duplicate nested headings. TypeScript/lint
	pass after these changes. No application code or timeouts changed.
- A subsequent approved Luna callback guard suppressed undefined type reports
	while panel records were unsynchronized. Its focused test passed, but the full
	file regressed to three passing/six failing. Parent removed only this new guard;
	the rerun restored eight passing/one failing at `Import 2 records`. The attempted
	fix is not retained. It added callback dependencies that can retrigger the child's
	type-reporting effect; that is a risk to investigate, not a confirmed root cause.
- The later approved test-only trace remains installed. Its one full-file run
	still reports eight passing/one failing. Uploaded source metadata and the existing
	planner snapshot show both configured type UUIDs retained after Prepare, one
	loaded record per source, and a ready relationship; legacy Import remains absent.
	Private session state and local `startAtImport` are not captured, so this trace
	cannot confirm an initialization clear or identify the failing readiness check.
	Subscriptions clean up in `finally`; failure output includes the trace. No
	callback dependencies, assertions, gates, or timeouts changed. TypeScript/lint
	were not rerun for this diagnostic slice.
- The approved controller-side Luna trace is now installed in `pages/csv.tsx`,
	with scoped console capture in the relationship test. The one normal-order file
	run remains eight passing/one failing. Both sources pass eligibility with one
	valid record. A subsequent undefined parent-type report resets the parent's
	`startAtImport` from true to false and clears its selected UUID. The next report
	restores the parent UUID but leaves readiness false; the child report is a no-op
	with readiness true. This confirms the reset sequence in the test, not why the
	empty report occurs or whether it reproduces in the authenticated application.
	Callback dependencies, gates, assertions, and timeouts are unchanged. The debug
	spy forwards output and restores in `finally`. Editor checks report no test-file
	errors and only existing Tailwind suggestions in the controller. TypeScript/lint
	were not rerun for this slice; temporary diagnostics remain installed.
- Stop before repairs or more test runs. Next proposed bounded slice, awaiting
	approval: one Luna fix for the transient undefined parent-type report at its
	nearest reporting/handling boundary, preserving intended type changes and stable
	callback dependencies, followed by focused and file-wide checks. Do not repeat
	the rolled-back dependency-changing guard, weaken the enabled-control assertion,
	or remove safety gates. Diagnostic cleanup must be included explicitly in the
	approved scope. No full-suite/build, browser, authenticated/visual checks,
	commits, or pushes ran in this diagnostic slice.

## Ambiguous-duplicate handoff test (2026-10-14)

- One approved Luna test-only slice uses two typed existing documents with the
	same type/slug/external ID. The real production CSV page reports one valid record
	and an ambiguous duplicate, disables shared handoff with its explanation, and
	retains the CSV view after a blocked click. Document/patch/relationship write
	counts do not change. The seeded lookup implementation is restored in `finally`.
- The focused test passed first. One parent local repair removed an exact lookup
	count assumption exposed by the file-wide run; lookup occurrence and settled
	ambiguity are still asserted, with exact no-write checks preserved. All eight
	CSV mapping tests, TypeScript, and test-file lint now pass. No application edits,
	full-suite/build reruns, browser checks, commits, or pushes were made.
- The later parent/child test slice above is implemented but paused after a
	file-wide failure; it is not complete. Other feature gates and parity remain.

## Schema-invalid handoff test (2026-10-14)

- An approved exact-model retry produced one Luna test-only slice. The production
	CSV helper accepts an optional schema; the test maps `value` normally but sets
	`minLength: 8` against `deep`. Preparation reports zero valid and one invalid
	record. Shared handoff stays disabled with its explanation; clicking cannot enter
	the shared view, and document/patch/relationship write counts stay unchanged.
- One parent local repair waits for the asynchronous upload's Prepare button
	before clicking. The focused test and all seven CSV mapping tests pass, as do
	TypeScript and test-file lint. No application changes, commits, pushes, full-suite/
	build reruns, or browser checks were made. Authenticated/visual parity is pending.
- The later ambiguous-duplicate test above covers that next blocked-input case.
	Other blocked-input and relationship/file parity cases remain incomplete.

## Post-execution mapping lock test (2026-10-14)

- One approved Luna test-only slice verifies the real production CSV/shared
	controller keeps Back to CSV mapping disabled after execution starts. A deferred
	document write exposes the active lock; after one successful import and the
	controller's Cancel action disappearing, the lock and explanation persist.
	Clicking cannot return to mapping in either state. Exactly one document write
	and no patch/relationship writes are asserted; the gate and mock are restored
	in `finally`. No application changes were needed.
- Verified: the new focused test, all six CSV mapping tests, TypeScript, and
	test-file lint pass. No full-suite/build, browser, authenticated, or visual
	checks ran. Earlier editor diagnostics remain stale against passing compiler
	checks. No commits or pushes were made.
- The later schema-invalid gate test above covers one blocked-input case.
	Other blockers, full CSV/XLSX/relationship parity, and real UI checks remain.

## Busy handoff guard test (2026-10-14)

- One approved Luna test-only slice covers the real production CSV page's return
	guard during shared preparation. A deferred reconciliation service holds the
	operation open: Back to CSV mapping is disabled, clicking cannot leave the shared
	view, and no document/patch/relationship writes occur. Settling preparation
	re-enables the button and permits returning to mapping. The gate and temporary
	service mock are released/restored in `finally`.
- Verified: the new focused test, all five `pages/csv.mapping.test.tsx` tests,
	TypeScript (`npx tsc -b`), and test-file lint pass. No application code changes,
	commits, pushes, or browser checks ran; the full suite/build was not rerun.
- Post-execution locking is now covered by the later approved slice above.
	Blocked-input gates, full file parity, and authenticated/visual checks remain.

## Standalone readiness follow-up (2026-10-14)

- User approved one bounded Luna implementation slice after read-only review.
	Non-array preparation now sets `startAtImport` from the existing mapping/schema
	validation eligibility helper using loaded records; final reconciliation and
	relationship gates and the legacy path remain unchanged.
- The production-page test now passes both shared handoffs and return to mapping,
	with no writes before handoff. All 29 tests across `pages/csv.mapping.test.tsx`
	and `csv_adapter.test.ts` pass. This is automated auth/service-double evidence,
	not authenticated, visual, busy/lock, or complete file-page parity verification.
- Two parent local repairs corrected unsupported enabled-button matchers and
	waited for second-handoff readiness. That repair allowance is exhausted.
- A separately approved Luna mock-type-only slice annotated `fetchObjectTypes`
	and `fetchObjectSchemas` with the existing object type/schema array types.
	TypeScript (`npx tsc -b`) and the same 29 focused tests now pass. No runtime
	behavior changed in that correction. Further slices still require approval.
	No commits, pushes, or browser checks ran; the full suite/build was not rerun.
- The earlier parked-test status below is historical, not the latest result.

## New session start (2026-10-14)

- Work remains on `refactor-import-process`, with uncommitted integration, test,
	and documentation edits. Check current Git state and read changed files before
	editing; preserve user/formatter changes and unrelated PAM workbook files.
- Budget concern: implementation is paused. Do not automatically retry the parked
	test or launch an agent. Give a brief status and propose one small next step for
	approval first; reuse this handoff instead of repeating broad investigation.
- One implementation agent per approved slice, exactly `GPT-6 Luna (copilot)`.
	No extra agents or model fallback without approval. Parent owns review/validation.
	Budgets are advisory, not measured usage or hard caps; do not invent token totals.
- After an initial focused failure, allow at most two local repair attempts, then
	stop and reassess with the user. No commits, pushes, or scope expansion without
	approval. Keep authenticated browser checks user-performed.
- Last passing baseline: 186 selected tests. A subsequently added production-page
	test in `pages/csv.mapping.test.tsx` is incomplete: latest run was three existing
	tests passing and one new test failing while waiting for Import 1 records after
	Prepare. The handoff assertions have not run; no production bug is established.
	The two repair attempts are exhausted. No additional repairs were approved.
- The new test uses the real CSV page/controller with test-only auth/service
	doubles. Busy/lock/gate and complete production file-page parity remain unverified.
	Do not describe the current whole suite as green or silently skip the new test.
- Preserve all CSV/XLSX mapping and relationship functionality; keep gated legacy
	paths until parity. Leave ERDDAP's read-only preview until interactive testing is
	needed. No application changes, test runs, or commits were made for this handoff.

## CSV/XLSX integration started (2026-10-14)

- On `refactor-import-process`, the CSV final import step now offers an opt-in
	Use shared import flow action. It opens the real auth-connected Import All
	controller for only this upload session; configured remote and unrelated uploaded
	sources are excluded. Legacy file execution remains available.
- This first slice permits clean standalone sources before any CSV writes. Array
	item sources, parent/child relationships, ignored relationship rows, incomplete
	mapping/validation/duplicate review, and already-started CSV execution stay on the
	legacy path with an explanation. No existing workflow has been retired.
- Back to CSV mapping is disabled during shared activity and locked after shared
	execution starts. Same-ID adapter/type/schema edits invalidate preparation/review
	evidence; changes after recorded successful writes retain results and block reuse.
	Late uploaded-source additions safely render before their plans synchronize.
- Verified: 186 selected import tests, including 28 focused UI tests, TypeScript,
	behavior-file lint, and production build. Tests exercise scoped shared-controller
	imports of mapped CSV in both modes and a genuinely parsed/selected XLSX sheet,
	source revision invalidation, retained post-write results, late uploads, and the
	busy/cancellation signal used by the handoff.
- These tests do not establish full production CSV upload/type/schema-choice or
	handoff-button UI parity. No new browser, visual, authenticated, or live-backend
	verification was performed for this slice. Parent/array/external-parent migration,
	ignored-row behavior, and full multi-file orchestration remain pending.
- Next: exercise the production file-controller/handoff controls in auth-free UI
	tests before expanding the feature gates. Preserve all config/UI mapping, fixed
	fields, worksheet, and relationship behavior. ERDDAP preview remains deferred.
- One Luna implementation agent was used; parent review added late-upload and
	activity regressions. Existing formatting edits were preserved. No commit/push or
	changes to the unrelated PAM workbook files were made in this slice.

## Committed baseline (2026-10-13)

- Continue on `refactor-import-process`. The redundant assistant-created branch
	was deleted; no commits have been pushed.
- Completed work is checkpointed in three commits:
	- `da11ff6`: shared preparation, readiness, guarded execution, and retry.
	- `438319c`: auth-free UI/source-mapping fixtures, regression tests, and documentation.
	- `a2bdec9`: Import All Simplified/Interactive mode pilot.
- Latest automated validation: 178 selected import tests, including 17 fixture
	component tests, pass. TypeScript, behavior-file lint, whitespace checks, and the
	production build pass; the dev entry and workbook are excluded from production.
	The unchanged individual-import effect lint error is not a clean full-lint result.
- Browser DOM validation reached three imported documents, two links, and zero
	errors in the auth-free fixture. Visual and authenticated/live-backend validation
	are still pending; DOM/component tests do not establish either.
- Next proposed slice: connect CSV/XLSX to shared mode progression while preserving
	config/UI mappings, sheet selection, multi-file imports, fixed fields, and
	parent/array relationships. This integration has not started and awaits approval.
- Keep ERDDAP's current read-only fixture until interactive ERDDAP UI testing is
	needed. The unrelated PAM workbook and Excel lock file were excluded from commits
	and remain untouched. No other repository changes were made.

## Current state

The import workflow now uses source-neutral adapters and source-scoped sessions. Individual source imports support canonical loading, schema validation, duplicate reconciliation, conflict policies, and batch result reporting. Import All supports real multi-source discovery, preparation, controlled execution, conflict defaults, row overrides, and per-record results.

The implementation plan and remaining work are tracked in `src/import/TODO.md`.

## Import All mode pilot (2026-10-13)

- Import All now has a Simplified/Interactive selector. Interactive is the default,
	preserving existing Discover selected, Prepare review, and Execute import actions.
	Simplified uses Import to advance through discovery/preparation, guarded documents,
	and links; pauses require correction or explicit review/type-setup actions.
- Preparation/discovery return plan snapshots used by the next stage, rather than
	reading stale rendered state. Context refresh starts with preparation marked busy
	and cannot continue after cancellation or operation replacement. New operations
	own a generation; cancellation lets the current operation retain settled and
	unattempted link results so retry remains available.
- Configured review steps have explicit acknowledgment checkboxes. The implicit
	Interactive final review is acknowledged by Execute; required inputs are never
	satisfied by a review checkbox. Mode changes clear review acknowledgments.
- Missing types still require Create missing types or existing setup actions. Then
	Import resumes without another Prepare click. This pilot does not grant automatic
	type-creation authority, add arbitrary mapping editors, or complete file integration.
- Verified: 178 selected import tests and 17 fixture component tests, TypeScript,
	behavior-file lint, production build, and auth-free browser DOM smoke reaching
	three documents/two links/zero errors. Failed-document retry is tested in both modes;
	reviews, required inputs, invalid/ambiguous data, eligibility, and cancellation are
	covered. The individual-import page has an unchanged baseline set-state-in-effect
	lint error; only its policy type declaration changed in this slice.
- Visual/authenticated UI checks, full CSV/XLSX/composite/array UI parity, optional
	additional review/input panels, and ERDDAP interactive mapping remain pending.
	Keep ERDDAP's separate read-only preview until interactive UI testing needs it.

## Blocker and document-retry UI tests (2026-10-13)

- Three new real ImportAllView component tests cover schema-invalid records,
	ambiguous existing-document matches, and failed-only document retry. The fixture
	test file now has seven tests, including the ERDDAP preparation preview.
- Invalid data exposes its field error; two seeded documents with the same type
	and slug expose an ambiguous match. Both prevent execution and every document/
	relationship write. Seeded existing documents are kept separate from new writes.
- A fail-once child write leaves the parent and sibling successful. Retry failed
	performs fresh reconciliation before its one retry write and retains their UUIDs
	and data. Links remain unwritten until the subsequent Execute action; that action
	creates both links without repeating completed document writes or patch/merge.
- Fixture-only seed/failure options and attempt/lookup tracking support these tests.
	No production code or authentication changes were needed. Fetch remains blocked;
	test cleanup runs even if the network assertion fails.
- Verified: 168 selected import tests, seven focused component tests, TypeScript,
	and scoped lint. Visual/manual and authenticated/live-backend checks remain
	pending; this slice did not add browser scenarios or attempt sign-in.

## ERDDAP schema-mapping baseline (2026-10-13)

- Open `http://127.0.0.1:4423/import-test.html?view=erddap`; Discover selected and
	Prepare review use configured MODL composite adapters, shared composite loading,
	and real schema validation. This is a read-only preparation preview, not the full
	Import All controller or a field-remapping UI. No auth provider/token is needed.
- Catalog/info responses are served in memory at exact virtual URLs. Unexpected
	URLs/methods and authentication headers reject; only the existing exact XLSX GET
	exception reaches native fetch. Normal production authentication is unchanged.
- Tests cover raw versus typed values, numeric/boolean/range coercion, normalized
	schema projection, unmapped attributes retained in sourceData, variable metadata,
	provenance/relationship rules, and catalog/composite lazy fetch-once behavior.
	Mapping does not itself validate required fields; the preparation view uses the
	real configured schemas and validator separately.
- Tests exposed an ID fallback defect: a schema field named ID received fallback
	data under lowercase id. The mapper now uses the matched schema property name.
- Verified: 165 selected tests, TypeScript, touched lint, normal production build,
	and browser DOM discovery/preparation. The preview showed typed latitude 41.25,
	range [-2.5, 32], valid dataset/variable records, and blocked unexpected requests.
- Remaining: arbitrary config/UI remapping, full ERDDAP Import All integration,
	visual verification, and export. Blocker/document-retry component tests are now
	covered above; full remote workflow integration remains pending.

## Actual XLSX file tests (2026-10-13)

- The genuine workbook lives in [testing/fixtures/csv-mapping.xlsx](testing/fixtures/csv-mapping.xlsx),
	not embedded base64. Tests load it from disk; the dev harness permits only its
	exact local GET request and still blocks backend/unexpected requests. Helpers
	asynchronously return ArrayBuffer/File. No new dependency or mocked workbook
	parser is used. The real reader returns Sites/Deployments in order and
	omits the empty worksheet; malformed bytes reject, and mapped Sites records equal
	the CSV baseline, including quoted text, numbers, fixed and relationship fields.
- The fixture's Upload XLSX workbook control parses File and offers sheet checkboxes
	plus Add selected sheets. Tests block an empty selection, exclude unselected
	sheets, switch independent mapping editors, and retain each sheet's edits/status.
	The production CSV add-selected action and fixture share selectWorkbookSheets;
	this does not test the full production selection/type/schema-choice controller.
- Verified: 162 selected tests, TypeScript, touched lint, and production build.
	Browser DOM upload parsed the real fixture, omitted Empty, and selected only
	Deployments; its canonical preview retained latitude 12.5 and parent key P-2.
	No authentication or backend calls were used. The normal build excludes the entry.
- Remaining: full production single/multi-file workflow integration and visual
	browser verification, ERDDAP mapping, and export-path identification/tests.

## CSV and worksheet mapping fixture baseline (2026-10-13)

- The existing `CSVSourceEditor` and source type are exported for fixture reuse;
	normal CSV authentication and mapping behavior are unchanged. The dev entry
	selects this real editor with `?view=csv`, seeded with a type/schema and mapping.
- Open `http://127.0.0.1:4423/import-test.html?view=csv`. The preview loads canonical
	records through the real adapter; CSV/Worksheet controls select fixture input.
	No auth provider or live services are used; unexpected fetches are rejected.
- New editor and worksheet tests cover nested/config mappings, quoted strings,
	numbers, fixed discriminator values, retained relationship keys, UI schema/role
	changes, column exclusion, and startAtImport invalidation. Config-only worksheet
	conversion and CSV produce equal canonical records. Existing object-type label
	mapping still takes precedence over a CSV label role when a mapped value exists.
- Verified: 157 selected tests, TypeScript, touched lint with no warnings/errors,
	and normal production build. Browser DOM-event checks confirmed column exclusion
	and worksheet switching. Normal browser clicks timed out at visibility/stability;
	the screenshot was blank despite visible DOM/computed styles. Do not claim visual
	verification; the real-view DOM tests are separate evidence.
- Remaining: full production single/multi-file workflow/array mapping parity,
	visual verification, ERDDAP, and export coverage. The binary XLSX fixture gap is
	addressed by the later actual-file tests above.

## Unauthenticated Import All fixture harness (2026-10-13)

- The default Import All export remains auth-connected. Its real `ImportAllView`
	accepts explicit eligibility/token, source overrides, and complete service ports.
	The fixture passes an empty token, in-memory services, and isolated Jotai context;
	it does not mount OIDC or preload the live app, and rejects unexpected fetches.
- Run `npm run dev:import-test`, then open
	`http://127.0.0.1:4423/import-test.html`. This separate development entry has a DEV
	guard and is absent from the normal production build. It uses the real screen,
	not a duplicate workflow. Refresh resets the fixture's in-memory state.
- Run `npm test -- src/import/pages/all.import-test.test.tsx` for three automatic UI
	tests: missing-type creation/preparation plus failed-link retry; partial-link
	cancellation/retry retaining completed links/documents; discovery cancel/resume.
	Tests reject unexpected network calls and need no access token or auth provider.
- Verified: 130 selected import tests, TypeScript, production build, and touched
	lint (zero errors, existing hook warning). Browser fixture smoke check imported
	three documents, showed one intentional link error, and retried to two links with
	zero errors. This is fixture UI evidence, not live-backend authorization evidence.
- Pending: CSV/XLSX and ERDDAP mapping parity, export-path identification and tests,
	validation/ambiguity and failed-document UI cases, automatic setup dialog, and
	live service/permission integration. Manual type selection/form is disabled in
	this fixture because those components still use auth-backed services.
- Dependency audit reports 13 advisories (9 high, 4 critical). Remediation was not
	included; production build also retains existing bundling warnings.

## Retry and automatic type preparation follow-up (2026-10-13)

- User reported that errors and retry work in the authenticated app, but needed
	another manual preparation pass, including after automatic type creation.
	Duplicate-write avoidance and composite/array dependencies remain unverified.
- A prepared source with execution attempts now stays on the Import step despite
	execution errors; those errors no longer automatically route the caller to review.
	Execution still passes through the existing validation/readiness gates.
- Both automatic type entry points (bulk and setup dialog) now validate and
	reconcile retained records using the returned type/schema before completing.
	They do not reload source records or write documents. Genuine validation errors
	remain visible; type/schema context refresh also runs after partial creation.
- Automated: 127 selected import tests and TypeScript pass; scoped lint has no
	errors and the existing hook warning remains. Authenticated follow-up retest
	is pending for retry without Prepare and automatic creation without Prepare.

## Task 2C relationship readiness and caller (2026-10-13)

- Relationship links run only after the selected document sources are complete;
	readiness is independent, so completed documents do not imply completed links.
	Only ready relationship plans with child, parent, and predicate UUIDs can write.
- Existing relationship duplicate checks remain active. Created/existing outcomes
	are retained; the caller's explicit retry runs only failed or unattempted ready
	links and does not invoke document persistence.
- Relationship cancellation returns completed outcomes, reports an aborted attempt
	as retryable, marks later plans unattempted, and prevents later batches. Caller
	result/progress updates are generation-guarded against superseded operations.
	Non-ready plans and missing UUIDs remain visible through the existing error view.
- Pre-aborted persistence publishes unattempted outcomes through `onResult`, so the
	caller retains retry state even when no lookup starts. Later UUID lookups fill
	only missing identities and cannot replace retained successful document UUIDs.
- Automated verification: 21 relationship-planning tests and 126 selected import
	regression tests, TypeScript, diagnostics, and whitespace checks pass. Scoped lint
	has zero errors and the existing `sourcesById` hook-dependency warning remains.
- Next: user-performed authenticated checks for cancellation, unfinished-link
	retry, duplicate avoidance, and composite/array parent dependencies.

## Task 2C document caller wiring (2026-10-12)

- `pages/all.tsx` now sends document runs and failed-record retries through
	`executePreparedImportAllSource`, passing the resolved schema, type UUID, current
	conflict default, Execute review acknowledgment, and token-based frontend
	eligibility. Backend authorization remains authoritative.
- Retries supply `retryReconciliation: { token, fetchExisting }`; the helper performs
	one refresh and rechecks readiness. The caller-side duplicate refresh is removed.
- Returned plans merge by record key, preserving prior results and UUIDs plus partial
	outcomes after cancellation. An operation generation ignores superseded work.
	Successful/ignored outcomes cannot be replaced by stale failures during merge.
	Sources run sequentially; genuine pause, block, or cancel prevents later document
	sources and relationship writes. Already-complete sources continue without writes
	on resume, allowing later unattempted sources and links to proceed.
- `importAllReadinessMessage` exposes actionable pause/block messages in the existing
	error view. A new explicit attempt clears prior execution errors but not source
	errors; schema/validation/reconciliation safety gates still apply.
- Array composition passes merged parent records through shared preparation to
	regenerate validation/reconciliation evidence. Composite loading and existing link
	retry behavior remain unchanged; relationship orchestration was not redesigned.
- Automated checks: 68 plan tests and 123 selected import regression tests,
	TypeScript, diagnostics, and whitespace checks pass. Scoped lint has zero errors
	and the existing `sourcesById` hook-dependency warning remains.
- User-performed authenticated checks: cancel after successful document writes,
	confirm retained results/UUIDs, resume without duplicate successes, retry failed
	records only, and verify paused/blocked sources show messages and stop later work.
	Check array parents validate against composed records. No browser validation ran.
- Next: user-performed authenticated cancellation/retry verification, then a
	separately scoped relationship-readiness integration if needed.

## Task 2C document cancellation/retry helper (2026-10-12)

- `executeImportAllSource` now merges attempt outcomes into retained results. An
	implicit run takes only unattempted records; explicit `recordKeys` may retry
	selected failed or unattempted records. Imported/ignored results are not rewritten;
	blocked records still require resolution and are not silently retried. Retained
	UUIDs remain available.
- `refreshImportAllSourceReconciliation` refreshes only selected failed or
	unattempted records. Guarded retries through `executePreparedImportAllSource`
	require `retryReconciliation: { token, fetchExisting }`; absent dependencies pause
	for reconciliation without writes. Readiness is checked before refresh and again
	afterward, so newly discovered ambiguity/conflicts cannot bypass review.
	Low-level callers retain responsibility for refreshing before explicit retries.
- Abort returns completed outcomes, leaves later work unattempted, and marks a
	partial prepared execution as cancelled. Successful in-flight siblings are retained
	even when another operation aborts; cancellation during late-conflict lookup does
	not start a POST. Persistence failures remain failed; non-abort errors propagate.
- Automated verification at helper completion: 65 plan tests and 120 selected import
	regression tests, scoped lint, TypeScript, diagnostics, and whitespace checks pass.
- Caller adoption was pending at helper completion; the newer section above records
	that partial plans are now adopted. Document completion does not imply relationship
	completion. Authenticated browser checks remain user-performed.
- Next at helper completion was caller adoption; see the current caller section above.

## Preparation caller wiring (2026-10-12)

- Document-source `prepareSelected` in `pages/all.tsx` now calls
	`progressImportAllSourcePreparation`; the preparation action still does no
	document writes. Array composition now also uses shared preparation after merging.
- The helper accepts optional preloaded records. Remote sources use the existing
	loader once; composites pass records from the existing fetch-once fan-out.
	Validation after type setup reuses retained records rather than loading again.
- The caller adopts the returned plan and filtered review acknowledgments. Existing
	type/schema context remains authoritative; validation evidence retains those
	resolved values. Reloaded changed records invalidate prior reviews after loading.
- Authorization policy preserves existing behavior: an authenticated token makes
	frontend operations eligible, while backend policies enforce actual permissions.
	No capability mapping exists in the auth hook; token presence is not proof of
	document-write or type-creation rights. No new role/scope restrictions were added.
- Preparation passes `allowAutomaticTypeCreation: false` and `canCreateType: false`.
	The shared creation adapter is supplied but cannot run implicitly. Existing
	explicit creation buttons remain unchanged by this caller wiring.
- The Luna delegate stopped on the missing capability mapping without edits.
	Coordinator implementation preserved the existing backend-enforced policy and
	completed this bounded preparation-only wiring; no additional agent was launched.
- Automated checks: 60 plan tests and 115 selected import regression tests,
	TypeScript, diagnostics, and whitespace checks pass. Scoped lint has no errors
	and the existing `sourcesById` hook-dependency warning remains.
- User-performed UI checks pending: prepare remote and composite records; confirm
	schema/error reporting, missing-type inference and explicit creation, cancellation,
	and resume. No authenticated browser validation was attempted.
- Next at preparation completion: Task 2C execution/retry caller wiring, now recorded
above, followed by separately scoped mode and explicit type-creation work.

## Real type-creation adapter (2026-10-12)

- `createImportAllTypeCreationAdapter` in `create_import_object_type.ts` implements
	the injected creation contract with existing object-type/schema services. Default
	services load lazily; tests/callers may inject them. Token and signal are forwarded.
- Existing automatic-creation buttons in `pages/all.tsx` now reuse this adapter;
	layout, mode controls, and progression wiring are unchanged.
- The adapter looks up the source type first, creates only when missing, recovers
	only the `object_type_slug_unique` race, and resolves defaults by owning type UUID.
	Supplied schemas are preserved; otherwise existing defaults or no-enum inference
	are used. No existing default is overwritten.
- A created default must be present in refreshed owned schemas before success is
	reported. Cancellation prevents subsequent operations/writes; unrelated creation
	errors propagate. Partial type creation is recoverable through the initial lookup.
- Automated checks: eight creation tests and 100 selected import regression tests,
	TypeScript, diagnostics, and whitespace checks pass. Scoped lint has no errors;
	an existing `sourcesById` hook-dependency warning remains in `pages/all.tsx`.
- Authenticated UI validation remains user-performed: create a missing type and
	inspect its inferred schema for enum removal; check existing-type reuse, schema
	availability after context reload, and visible error recovery.
- Next: connect this adapter and returned preparation/review state to the real
	progression caller. The callback is callable and used by creation buttons, but
	`progressImportAllSourcePreparation` now has preparation-only caller wiring;
	automatic creation through that caller is deliberately disabled (see above).

## Injected type creation and review state (2026-10-12)

- `progressImportAllSourcePreparation` now accepts `createTypeIfMissing` and returns
	effective `objectTypeUuid`, `schema`, and filtered `completedReviewSteps` alongside
	the plan/decision and invalidations. Callers must adopt this returned state before
	resume; acknowledgments are not duplicated in plan/session state.
- The callback runs only for missing type setup with explicit automatic-creation
	policy, real creation/write permissions, and completed opted-in schema review.
	It receives source, prepared plan, schema, token, and abort signal. It must reuse
	existing type-creation behavior: lookup the source type first, handle unique-slug
	races by reusing existing types, and return the owning type UUID and usable schema.
	The real-service adapter is now available; see the section above for current
	creation-button wiring and pending progression-caller integration.
- Schema precedence: explicitly supplied caller schema, then adapter fallback,
	then the callback's returned schema when neither was supplied. Callers must pass
	their resolved pinned schema rather than an unrelated default schema.
- Creation is one step, never document execution. Errors/pre-abort pause safely;
	cancellation after a successful callback retains its returned type identity so
	resume does not create it again. Returned state must be retained even on pause.
- Type/schema changes invalidate dependent reviews; callers receive acknowledgments
	with those invalidations consumed and may opt back into the required review.
- Automated checks: 56 plan tests, 92 selected import regression tests, TypeScript,
	touched-file lint, diagnostics, and whitespace checks pass. No authenticated UI
	validation or existing UI entry-point changes in this slice.
- Next: wire the real-service/caller boundary, then proceed with Task 2C
	cancellation/retry/relationship orchestration before the remote pilot.

## Preparation progression slice (2026-10-12)

- `progressImportAllSourcePreparation` and `ImportAllPreparationDecision` in
	`import_all_plan.ts` perform one preparation/validation/reconciliation step with
	preloaded canonical records. They never write documents or loop through stages.
- `ImportAllSourcePlan` owns workflow evidence/results. Callers own review
	acknowledgments and must remove returned `invalidatedReviewSteps` before resume;
	no mirrored session state was introduced. Callers apply mapping/override changes
	to canonical records before invoking progression.
- Caller-supplied type/schema remain authoritative, including pinned schemas.
	Record/type/schema edits clear stale validation/reconciliation before evaluating
	readiness. Corrected invalid records can recover; disabled/completed work stays
	idle. Required or renewed optional reviews pause before dependent validation.
- Type creation without an injected callback and document execution pause explicitly.
	Existing type creation services and UI/session wiring remain deferred.
- A `GPT-6 Luna` sub-agent implemented the helper; coordinator review added invalid
	record recovery, in-place edit invalidation, and settled-plan regression checks.
- Automated checks: 51 plan tests and 87 selected import regression tests pass,
	along with TypeScript, touched-file lint, diagnostics, and whitespace checks.
	Authenticated UI validation remains pending integration.
- Next: finish Task 2B's injected type-creation and review-invalidation boundary
	before starting Task 2C retry/relationship orchestration.

## Prepared-source execution slice (2026-10-12)

- `executePreparedImportAllSource` in `import_all_plan.ts` gates existing execution
	through `evaluateImportSourceReadiness` and aligns explicit policy conflict defaults.
- It returns an updated plan plus a paused/executed decision. Unsupported advance
	stages pause explicitly; execution results include freshly evaluated readiness.
- Successful document completion and failed/blocked execution are distinct. This
	helper does not implement acquisition, type creation, retry orchestration, or UI.
- A `GPT-6 Luna` sub-agent implemented the execution-only slice; coordinator review
	added post-execution readiness and direct no-write/failure regression coverage.
- Automated checks: 44 focused plan tests, TypeScript, touched-file lint, and
	whitespace checks pass. Authenticated UI validation is pending integration.
- Next: Task 2B in [REFACTOR_PLAN.md](REFACTOR_PLAN.md), preparation and state
	ownership. Existing UI execution entry points remain unchanged by this slice.

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

### ERDDAP metadata imports

- **In progress:** `/import/modl` is a dedicated targeted ERDDAP composite view for the MODL dataset and grouped variable-metadata record; `/import/erddap_metadata` remains the separate generic ERDDAP metadata view. All ERDDAP sources are excluded from `/import/all`. The composite keeps separate dataset and child plans for type-specific validation and duplicate review. Discovery runs once, and each selected dataset's full metadata is loaded once before projecting both records. The existing relationship planner persists their `has_parent` link after both documents are available. The user confirmed that the composite created and related `modl` and `modl_variable_metadata` records; remaining authenticated cases are listed in `src/import/TODO.md`.
- `/import/erddap_metadata` accepts one dataset metadata URL (`/info/{datasetID}/index.json`), a server catalog URL (`/info/index.json`), or a search URL (`/search/index.json?...`). Catalog and search results use the ERDDAP table response shape; selected records load metadata from `/info/{datasetID}/index.json`.
- Catalog discovery creates one candidate per `Dataset ID`, using the catalog `Title` and `Summary`. Full per-dataset metadata is fetched only when candidates are preloaded; single-dataset imports use the same canonical-record path.
- ERDDAP metadata is normalized into `dataset_id`, `metadata_url`, `global_attributes`, and `variables`. Global attributes and variable attributes remain separate in canonical record data.
- The targeted `ERDDAP MODL Dataset` source projects `NC_GLOBAL` attributes onto matching MODL schema properties (case-insensitive), converts ERDDAP numeric/boolean values, and falls back to the ERDDAP dataset ID for `id`. It pins object schema slug `modl` and resolves that schema's owning object type rather than using the type's default schema.
- `src/import/schemas/erddap_variable_metadata.schema.json` mirrors the `modl_variable_metadata` schema: a dataset-level `dataset_id` and a `variables` object keyed by variable name, with each value containing that variable's attributes and `variable_name`.
- The `Overrides` step exposes configured text overrides for `dataset_id`, `global_attributes.id`, and `global_attributes.platform_name`. Changing an override clears prior validation and reconciliation state.
- The remote preload list can be searched by label, identifier, or description. Select-all and random selection apply to visible search results; selections outside the filter are preserved.
- ERDDAP imports continue through shared type/schema selection, validation, duplicate reconciliation, and persistence. Browser requests require the ERDDAP server to permit cross-origin access.
- Automated tests cover single-dataset loading, catalog/search discovery, lazy full-metadata loading, schema-targeted mapping, and metadata table parsing. Authenticated browser verification against the live single-dataset, catalog, and targeted schema flows remains open.

### CSV imports

- `/import/csv` reuses the existing CSV file uploader and parser.
- Known-schema CSV sources with confident mappings are validated and duplicate-checked automatically; one explicit session-level Import action starts the ready document sources in dependency order. Mapping uncertainty, validation errors, or conflicts remain in review.
- Configured known-type sources expose optional upload slots for schema-optional object arrays. These generated slots reuse the existing parent source, array path, and lookup-column controls; variant-specific array slots remain supported.
- `.xlsx` workbooks can be uploaded from the CSV Upload step. Users explicitly select worksheets, and each selected sheet becomes an independent source using the existing CSV adapter, mapping, validation, and reconciliation pipeline. The current picker accepts `.xlsx`; legacy `.xls` is not enabled.
- Every CSV import view now begins with a CSV-files or Excel-workbook (.xlsx) choice; upload controls for the other format remain hidden, and the choice locks after a source is added.
- In workbook mode, templated source cards stay hidden until worksheets are added. Before adding, the worksheet selector shows each sheet's configured type or `None`, and any required schema discriminator is selected inline before Add is enabled.
- The pre-add type assumption is editable from the existing object types; array sheets show the destination path, such as `pam_deployment.recordings[]`. The wider sheet list scrolls horizontally to keep selectors from overlapping.
- The workbook chooser is a styled button that displays the selected filename, sits above compact source rows, and has a remove action that clears pending sheets and all sources created from that workbook.
- Schema discriminator choices are generic view configuration: each source binds a configured choice key to a schema branch path and emitted value path, while the view supplies the label, placeholder, and options.
- Configured document tabs can be optional, allowing partial source imports. PAM opts into exact existing-parent lookup for its project/site and site/deployment relations; a unique match resolves automatically, while multiple matches require a parent selection.
- A missing-parent child row can be excluded from the import set with `Ignore child row`; ignored rows can be restored. `Add parent source` returns to upload. Generic CSV views show detailed planner diagnostics, while PAM uses the guided summary.
- Array-only imports remain blocked unless the configured parent source is uploaded in the same session. The parent is resolved by the array target's configured source key, including PAM deployment array rows.
- The uploaded filename supplies the default object-type slug and label. For example, `test-metadata.csv` becomes `test-metadata` and `Test Metadata`.
- CSV rows are previewed before import and can be mapped to label, slug, external ID, description, and document-data columns.
- CSV rows are discovered and canonical-loaded immediately after continuing; the remote-source preload step is skipped because the file is already local.
- CSV imports use the shared type selection, schema validation, reconciliation, and persistence workflow.
- CSV sources can choose an existing object type and its default schema instead of relying only on filename-based type inference.
- Generic CSV sources can explicitly be assigned `Standalone documents`, `Parent documents`, `Child documents`, or `Array items on a parent` roles during mapping.
- Generic child and array sources select their related parent source explicitly; role match fields are preserved in canonical data automatically.
- Object types selected or created from the CSV import step are synchronized back to the CSV source, so relationship planning uses the actual selected type slugs rather than filename-derived slugs.
- Generic parent/child relationship setup now starts on the Upload step: choose object types, select a child CSV from the parent row, select parent/child lookup columns, and choose the database predicate. The Mapping step no longer repeats generic relationship setup.
- The CSV import step shows an on-screen planner snapshot with source roles, selected type IDs, relationship rules, loaded record counts, and ready/blocking relationship plans.
- Multi-file CSV Import now renders one independent import panel per document source, so users can choose types, validate, reconcile, and import all uploaded document sources without switching back to Mapping between files. Array-item sources remain attached to their parent panel.
- Array-item CSV sources can now be declared on the Upload step alongside parent/child sources by choosing `Array items`, selecting the parent CSV, and setting the parent array path and lookup columns. The existing parent merge flow remains responsible for embedding the rows.
- Verified workflow: upload a parent CSV and array-item CSV, set the parent role to `Parent`, set the array source role to `Array items`, select the parent CSV, configure the array path and lookup columns, and complete the import successfully.
- PAM authenticated workflow confirmed on 2026-10-06: `pam_project`, `pam_site`, and `pam_deployment` imported; recordings and analyses were embedded in deployment records; configured project -> site -> deployment relationships were created.
- PAM relationship planning excludes array rows from document candidates, resolves cascade rules by matching source type, and prefers configured lookup rules over sparse duplicate backend metadata. Focused CSV, relationship planning, Import All, and Oikos validation passed (53 tests).
- The workbook parser uses `read-excel-file` and converts selected worksheet rows into the existing parsed-CSV source shape; parser conversion and multi-sheet separation have focused unit coverage.
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
- CSV relationship selectors can be cleared after a related source is selected.
- Selecting a related CSV mirrors the relationship rule and child role onto the counterpart source; lookup fields and predicates remain synchronized when edited.
- CSV relationship planner diagnostics collapse mirrored source rules into one canonical rule before logging and planning.
- Automatically created object types select their refreshed default schema after the context reloads.

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
- CSV sources are loaded together for a CSV-local relationship review. The review reports ready and blocked relationships and can persist links with duplicate detection without routing to Import All.
- The preview is bounded for narrower windows and the mapping section no longer overlaps it; additional scrollbar cleanup remains open.
- CSV array and document-source orchestration is isolated in `src/import/csv_orchestration.ts`. Focused tests cover configured and generic-style array composition, unmatched-row blocking, and excluding array sources from standalone document panels.

CSV workflow boundary: `/import/csv` is self-contained from the user's perspective. CSV relationships and array composition must be planned, persisted, diagnosed, and retried through the CSV workflow. Shared wizard, adapter, validation, relationship, and persistence code is allowed, but CSV users are never sent to `/import/all`; that remains a separate remote-source workflow.

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

Latest automated verification on 2026-10-07:

```text
npm test       # 137 tests passed
npm run build  # passed; existing Vite quicktype/browser-externalization and chunk-size warnings remain
```

Authenticated browser verification of the ERDDAP single-dataset and catalog workflows is still pending.

Latest verification on 2026-09-29:

```text
npm test -- src/import  # 92 tests passed across 15 files
npm run build           # passed
git diff --check        # passed
```

Latest verification on 2026-09-30:

```text
npm test -- src/import/csv_orchestration.test.ts  # 3 tests passed
npm test -- src/import                       # 92 passed, 3 existing Oikos schema failures
npm run build                                  # blocked by existing CSV OptionView and Oikos validation errors
```

The new orchestration tests pass. The full import suite currently contains 95 tests across 16 files; the three failing Oikos schema tests call the shared validation helper as though it always returns an array. The build reports the same `OptionView` type error in the CSV UI and possibly-undefined validation results in those Oikos tests. These failures were not introduced by the CSV orchestration extraction.

The build still reports the existing Quicktype Node-module browser-externalization warnings and large-chunk warnings. Full lint has not been rerun for this checkpoint; earlier lint failures are listed below.

The full lint command currently reports unrelated errors in:

- `src/app-variants/modl/create_document_entry.tsx`
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

Authenticated CSV checks confirmed on 2026-09-29:

- Filename-derived type/schema naming, automatic creation, refreshed default-schema selection, and duplicate-slug blocking.
- Existing-type default-schema loading and the unified mapping table for label, slug, external ID, description, inclusion, and schema paths.
- Schema fields cannot be assigned to multiple CSV columns; nested and array-item paths produce structured document data.
- Multi-file mappings remain isolated. After correcting an invalid mapping, `Continue to import` reloads and revalidates the records.
- Related CSV lookup fields and predicate mirror to one canonical rule; clearing and reselecting the related file clears and repopulates `rules`.
- CSV-local relationship persistence created three links. Blocking then restoring `/relationship` requests verified retry without rerunning document imports.
- At narrow width, the table scrolls without browser-level horizontal overflow while the sidebar is expanded.

Authenticated CSV array checks completed on 2026-09-30:

- Configured and generic array-item uploads embedded matched rows in their parent documents.
- Unmatched array rows blocked access to Import records rather than being written as standalone documents.

Current upload-format and existing-parent validation:

```text
Focused CSV, workbook, relationship, reconciliation, and PAM tests: 65 passed
npm run build: passed; existing quicktype-core browser externalization and large-chunk warnings remain
```

Authenticated UI validation remains open for choosing both formats on generic and PAM routes, partial PAM imports against existing parents, resolving ambiguous matches, ignoring/restoring missing-parent rows, and array-only parent-source blocking. These scenarios are tracked in `src/import/TODO.md`.
- The unmatched-row diagnostic was browser-verified at `/import/csv/test-array`; it identifies an array-composition blocker and suggests correcting lookup columns or adding missing parent rows.
- Short and narrow preview layouts showed no overlap or problematic nested vertical scrollbars.

## Resume point

The authenticated CSV array and responsive-layout checks are complete, including a browser check of the revised unmatched-row wording.

The CSV mapping, existing/generated type setup, multi-file source isolation, relationship rule editing/clearing, CSV-local link persistence/retry, configured and generic array composition, unmatched-row blocking, responsive layout, and expanded-sidebar table scrolling are now manually verified. Automated CSV orchestration coverage includes configured and generic-style array composition, unmatched-row blocking, and array-source exclusion from standalone document panels. Dependency-aware multi-file document execution remains deferred. The latest `npm run build` passes; older failure notes above describe superseded checkpoints.

Import follow-up is paused while branding architecture is explored. When import work resumes, choose between the deferred known-schema configured views and dependency-aware multi-file CSV document execution based on product priority.

The CSV user flow remains self-contained: single and multiple file sessions use `Upload files` -> `Map fields` -> `Import records`; multiple files keep independent mappings and import sessions, with relationship setup in the CSV workflow.

### Explicit continuation point

The current `CSVImportViewConfig` in `src/import/pages/csv.tsx` still supports initial `sourceConfigs` upload slots. Generic uploads now also provide explicit per-source roles, so a session can identify a parent CSV, child CSV, or array-item CSV without relying on filenames or inferred type relationships. Configured slots remain compatible with this role model.

The first-level array-field slice is now implemented and manually verified: an array source carries an explicit parent source key, array field path, parent match field, and row match field. The CSV workflow loads those rows, embeds them into matching parent records, validates/reconciles the merged parent, and skips standalone array-source document writes. Do not import an array spreadsheet as separate documents once that role is selected.

UI verification is still needed for the configured array upload slot and the final parent document shape. Nested arrays, multiple spreadsheets contributing to one array, and item-level retry remain deferred.

The ordinary `/import/csv` workflow now exposes the array role and target fields. Live verification remains needed for the final parent array shape and unmatched-row diagnostics.

Known uploaded files are identified by explicit user-selected source roles. Do not create separate page implementations for the parent and child.

### Deferred known-schema upload views

The next requested import branch is a small set of production upload forms for known backend schemas. It is deferred until the schemas and object types are ready.

- Reuse `CSVImportPage` with a route-specific `CSVImportViewConfig` and `sourceConfigs`, following `/import/csv/test-array` as the reference implementation.
- Keep document loading, array composition, validation, reconciliation, and persistence in the shared CSV workflow; production views should be declarative configurations, not copies of the test page.
- Required inputs are backend object-type slugs, source keys and user-facing labels/descriptions, expected filenames or columns, mapping mode, and fixed roles, relationships, or array targets.
- Backend default schemas are resolved from object-type slugs. Local schema files are unnecessary when the corresponding backend object types and default schemas already exist.
- Keep configured-view registration compatible with the upcoming branding work so branded applications can provide or discover their own known-schema upload definitions.

Additional CSV requirements for the next design:

- A known-type upload session may include an additional spreadsheet that populates an array field, not only spreadsheets connected by parent/child relationships.
- Known-type workflows should provide targeted upload slots with labels and descriptions for expected relationship sources and specific array fields.
- Each spreadsheet row should become one object in the parent document's array. The parent and its array items should be created together; individual array-item retries are not required.
- Array spreadsheet columns map to the parent field's existing `items` schema, rather than creating a separate document type/schema for array items.
- Multiple spreadsheets contributing to the same array are possible but deferred until needed.
- Nested arrays are a future task. They will require child/parent lookup and nested relationship planning, but are intentionally out of scope for the first array-of-objects implementation.

### Next CSV design follow-ups

- When no object type matches a CSV filename, default to creating a new object type from the CSV data.
- Let the Import step create that new type automatically without requiring the user to select a checkbox or scroll past generated schema output; make schema review and object-type creation an optional modal step.
- When an array-item source selects a parent CSV, automatically assign the parent source the `Parent` role instead of requiring a second manual role selection.
- Simplify the Import step further after the multi-source panels have been exercised in the UI.
- Test one parent CSV with array items and two ordinary parent/child relationships; update planning or source-role modeling if the combined case exposes limitations.

Before or alongside the wizard work, verify failed relationship-link retry when a suitable failure scenario is available.

The relationship ordering investigation is now part of the next relationship-design task rather than a separate deferred item.

## Changes outside `src/import`

- `package.json` and `package-lock.json`: Vitest and the test script.
- `package.json` and `package-lock.json`: Vitest/test configuration and removal of the temporary direct Ajv dependency; Ajv remains transitively installed.
- `vitest.config.ts`: test configuration.
- `src/config/config.ts`: optional import merge RPC runtime setting.

No shared PostgREST or document service implementation was changed.

## Resume note: PAM known-type CSV import (2026-10-02)

Completed groundwork in this session:

- `App.tsx` mounts known CSV views registered on the active app variant as routes.
- `app-sidebar.tsx` lists those registered views under Imports.
- The PAM-specific view is registered at `/import/csv/pam` from `src/app-variants/pam/index.tsx`, reusing `CSVImportPage` and the configured upload slots.
- Document create/edit now share mapped label/description resolution. Edit validation resolves schema `$ref`s through a tested helper; the app-level edit label and validation flow were verified by the user.

PAM workflow details supplied by the user:

- Primary known type and filename: `pam_project`, `pam_project.csv`.
- Document hierarchy: `pam_project` has child type `pam_site`; `pam_site` has child type `pam_deployment`.
- `pam_deployment` has array fields `recordings` and `analyses`, each to be populated from its own CSV source and embedded into the deployment document. Array item headers should be discovered at upload time and mapped against the backend array-item schema as closely as possible.

Backend definitions were confirmed on 2026-10-04 through PostgREST at `http://localhost:3345`. All three object types have default schemas; `pam_project.expected_child_types` declares `pam_site`, and `pam_site.expected_child_types` declares `pam_deployment`, both using `to_parent_predicate: has_child` (the child-side predicate is `has_parent`). The deployment schema defines `recordings` and `analyses` as arrays with object item schemas. This endpoint is machine-local; on another machine, verify the active API environment points to the intended backend before relying on these records.

Confirmed CSV join fields:

- Project to site: parent `pam_project.project` matches child `pam_site.project`.
- Site to deployment: parent `pam_site.siteOrCruiseName` matches child `pam_deployment.site`.
- Deployment to recordings array: parent `pam_deployment.deploymentTitle` matches the recordings row `deploymentTitle`.
- Deployment to analyses array: parent `pam_deployment.deploymentTitle` matches the analyses row `deploymentTitle`.

The relationship planner supports explicit parent/child match fields, and configured array targets accept parent and row match fields. Exact filenames for the site, deployment, and array CSVs are not required for configured upload slots, which accept files directly.

Agreed site-location workflow: use one PAM CSV entry page with four clear `locationDetail` choices: stationary marine, stationary terrestrial, mobile marine, and multipoint stationary marine. The selected branch should guide field mapping and construct the corresponding discriminator/value shape while retaining the backend schema as the validation source. Do not add four separately maintained routes unless later usability testing calls for that.

Dependency-aware multi-file CSV execution is implemented: document panels are ordered by relationship dependencies, and child write steps wait for uploaded parent sources to finish an import attempt. Missing parent sources remain available for relationship diagnostics. The PAM CSV view is now configured with project, site, deployment, recordings, and analyses slots, confirmed joins/array targets, and one selector for the four `locationDetail` branches. Mapping fields are derived from the selected backend `oneOf` branch; the selected discriminator is emitted as `locationDetail.type`. Remaining validation: confirm real site CSV headers/value shapes, especially mobile navigation URI lists and multiple multipoint locations, then perform authenticated end-to-end import validation against the intended backend.

Schema-derived synthetic CSV examples are in `public/pam/`: `pam_project.csv`, `pam_site_stationary_marine.csv`, `pam_site_stationary_terrestrial.csv`, `pam_site_mobile_marine.csv`, `pam_site_multipoint_stationary_marine.csv`, `pam_deployment.csv`, `pam_recordings.csv`, and `pam_analyses.csv`. They were checked against the `json_schema` fields from the live `object_schema` rows for `pam_project`, `pam_site`, and `pam_deployment`. PAM imports now derive canonical metadata from mapped data using `object_type.data.field_mappings`; current backend mappings set `label` to `project`, `siteOrCruiseName`, and `dataCollectionName` respectively. No slug or description paths are configured, so slug is generated from the mapped label and description defaults to empty unless supplied by an explicit CSV description role. The fixtures intentionally omit generic metadata columns. The project example covers contributor and related-project arrays. The site examples use one navigation URI and one multipoint location; these satisfy schema minima but do not establish the real producer's CSV conventions for multiple values.

Latest verification before handoff: 23 focused CSV adapter tests pass; the focused orchestration/relationship tests and production build pass, with existing Quicktype browser-externalization and large-chunk warnings. All eight PAM fixture files parse with consistent row widths and their headers match the live schemas (excluding configured relationship keys). Dependency ordering, scalar array mapping, object-type metadata derivation, and all four location branch choices have automated coverage. Real PAM CSV convention validation and authenticated end-to-end PAM import validation remain outstanding.

## Latest checkpoint (2026-10-06)

- The CSV Import records step now uses dependency-ordered source rows instead of import cards. Rows show the selected type, validation counts, and duplicate handling; `Edit type & validate` opens the existing type/schema editor and validator in a dialog.
- Automatic duplicate reconciliation runs for import-ready CSV sources without requiring the dialog to be opened. The global import count includes actionable create, overwrite, and merge records, and excludes ignored or ambiguous records.
- The user reports that documents imported in the latest CSV attempt, but their relationships did not link. The cause and result/error details are not yet known. Treat the earlier `3 created` and retry checks above as historical successes, not confirmation that the latest attempt linked successfully.
- Next, inspect the CSV relationship review counts and plan statuses, then capture the link result (`created`, `existing`, `blocked`, or `failed`), displayed error, and relationship request response. Verify the selected document UUIDs and predicate before retrying. Do not rerun document imports just to investigate linking.
- Automated validation for the latest import-row and duplicate-readiness changes: 72 focused CSV, workbook, PAM, reconciliation, session, and orchestration tests passed; focused ESLint, TypeScript, and `git diff --check` passed. Production build passed with existing Quicktype browser-externalization and large-chunk warnings.

## Latest checkpoint (2026-10-07)

- Code inspection of the user's `Import started` report found that the main CSV action updated `startImportRequest`, but its consumer (`ImportRecordsPage` and `BatchLoadDocuments`) was nested inside the closed validation dialog and therefore unmounted. The document-write requests could not start. A hidden, persistent execution instance now consumes that request outside the dialog; the visible dialog remains responsible for type/schema editing.
- Once all dependency-ordered document source attempts complete, CSV relationship persistence starts automatically. The manual `Link relationships` action remains available for retry and is disabled until all source attempts complete.
- Automated validation for the persistent executor and linking flow: 37 focused batch/import-state/orchestration/relationship tests passed; focused ESLint, TypeScript, `git diff --check`, and production build passed. Build warnings remain the existing Quicktype browser-externalization and large-chunk warnings.
- Authenticated end-to-end verification completed per user report on 2026-10-07: pressing Import worked and the relationships linked. This confirms the persistent executor and automatic relationship phase in the user's environment. No request counts or backend response details were provided.
