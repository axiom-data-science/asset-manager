import type { IDocument, IObjectType } from ***REMOVED***@/types/types***REMOVED***
import { Checkbox, Input, Loader, Tabs } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***

import { TableVirtuoso, type TableComponents } from ***REMOVED***react-virtuoso***REMOVED***
import {
  forwardRef,
  useMemo,
  useState,
  type ForwardRefExoticComponent,
  type ReactElement,
  type RefAttributes,
} from ***REMOVED***react***REMOVED***
import { Button } from ***REMOVED***@/components/ui/button***REMOVED***
import type {
  CanonicalImportRecord,
  IDocumentImport,
  ImportCandidate,
  ImportSourceAdapter,
} from ***REMOVED***@/import/types***REMOVED***
import SelectObjectTypeForImport from ***REMOVED***./select_object_type_for_import/index.tsx***REMOVED***
import { SelectObjectTypeForImportTab } from ***REMOVED***./select_object_type_for_import/index.tsx***REMOVED***
import {
  filterImportEligibleRecords,
  canSkipImportTypeStep,
  isValidationComplete,
  useImportSession,
} from ***REMOVED***@/import/state/importState***REMOVED***
import BatchLoadDocuments from ***REMOVED***@/import/components/batch_load_documents***REMOVED***
import ReconciliationReview from ***REMOVED***@/import/components/reconciliation_review***REMOVED***
import { patchDocument, postDocument } from ***REMOVED***@/manage/document/services***REMOVED***
import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { pick } from ***REMOVED***lodash-es***REMOVED***
import type { LucideProps } from ***REMOVED***lucide-react***REMOVED***
import { importRecordKey } from ***REMOVED***@/import/state/importState***REMOVED***
import { mergeIncomingNonEmpty, withImportProvenance } from ***REMOVED***@/import/reconciliation***REMOVED***
import {
  fetchExistingDocumentBySlug,
  mergeImportDocumentViaRpc,
} from ***REMOVED***@/import/reconciliation_service***REMOVED***
import { IMPORT_MERGE_RPC } from ***REMOVED***@/config/config***REMOVED***
import { classifyImportError } from ***REMOVED***@/import/import_errors***REMOVED***

const TableComponentsOverride: TableComponents<IDocumentImport> = {
  Table: (props) => (
    <table
      {...props}
      className="w-full border-collapse text-left text-sm text-gray-600 dark:text-gray-300"
    />
  ),
  TableHead: forwardRef((props, ref) => (
    <thead
      {...props}
      ref={ref}
      className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 sticky top-0 z-10 shadow-sm"
    />
  )),
  TableRow: (props) => (
    <tr
      {...props}
      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 odd:bg-white even:bg-gray-50/50 dark:odd:bg-gray-900 dark:even:bg-gray-800/40 border-b border-gray-200 dark:border-gray-700 transition-colors"
    />
  ),
  TableBody: forwardRef((props, ref) => <tbody {...props} ref={ref} />),
}

const ListRow = ({ label, slug }: { index: number; uuid: string; label: string; slug: string }) => {
  return (
    <>
      <td className="px-6 py-4">
        <strong>{label}</strong>
      </td>
      <td className="px-6 py-4">{slug}</td>
    </>
  )
}

const ListRecords = ({ documents }: { documents: IDocumentImport<unknown>[] }) => {
  return (
    <>
      <TableVirtuoso
        className="min-h-80 w-full bg-slate-100"
        style={{ minHeight: 320 }}
        data={documents}
        components={TableComponentsOverride}
        fixedHeaderContent={() => (
          <tr>
            <th className="px-6 py-3">Label</th>
            <th className="px-6 w-[50%] py-3">Identifier</th>
          </tr>
        )}
        itemContent={(index, doc) => <ListRow {...doc} index={index} />}
      />
    </>
  )
}

const isAbortError = (error: unknown, signal?: AbortSignal) =>
  (error instanceof DOMException && error.name === ***REMOVED***AbortError***REMOVED***) || !!signal?.aborted

const RemoteSourceImport = ({
  adapter,
  pluralLabel,
  type,
  onDetailRootActivated,
}: {
  adapter: ImportSourceAdapter
  type: string
  label: string
  pluralLabel: string
  onDetailRootActivated: (detailRoot: string) => void
}): ReactElement => {
  const { defaultImportUrl, defaultDetailRoot } = adapter

  const [draftUrl, setDraftUrl] = useState<string | undefined>(defaultImportUrl)
  const [draftDetailUrl, setDraftDetailUrl] = useState<string | undefined>(defaultDetailRoot)
  const [activeUrl, setActiveUrl] = useState<string | undefined>(undefined)
  const [loadCount, setLoadCount] = useState(0)

  const { resetSession, setCandidates } = useImportSession(adapter.id)

  const [prevDefaultImportUrl, setPrevDefaultImportUrl] = useState(defaultImportUrl)
  const [prevDefaultDetailRoot, setPrevDefaultDetailRoot] = useState(defaultDetailRoot)
  if (prevDefaultImportUrl !== defaultImportUrl || prevDefaultDetailRoot !== defaultDetailRoot) {
    setPrevDefaultImportUrl(defaultImportUrl)
    setPrevDefaultDetailRoot(defaultDetailRoot)
    setActiveUrl(undefined)
    setDraftUrl(defaultImportUrl)
    setDraftDetailUrl(defaultDetailRoot)
    setLoadCount(0)
  }

  const {
    //data: documents,
    error,
    isError,
    isFetching,
    //isSuccess,
    //isPending,
  } = useQuery({
    queryKey: [type, activeUrl, loadCount],
    enabled: !!activeUrl,
    queryFn: async ({ signal }) => {
      try {
        const docs = await adapter.discover({ signal, url: activeUrl! })
        setCandidates(docs)
        return docs
      } catch (error) {
        if (isAbortError(error, signal)) {
          // cancellation is expected when query is replaced/unmounted
          // do not log as an error and do not convert to failed state
          return []
        }
        console.error(***REMOVED***Error fetching documents:***REMOVED***, error)
        throw error
      }
    },
    placeholderData: (previousData) => previousData,
  })

  return (
    <>
      <div className="flex flex-row gap-4 items-end">
        <Input
          id="import-url"
          label="Import URL"
          testId="import-url"
          className="w-90"
          size="sm"
          value={draftUrl}
          onChange={(e) => setDraftUrl(e)}
        />
        <Input
          id="detail-root-url"
          label="Detail Root URL"
          testId="detail-root-url"
          className="w-90"
          size="sm"
          value={draftDetailUrl}
          onChange={(e) => setDraftDetailUrl(e)}
        />
        <Button
          disabled={!draftUrl || isFetching}
          onClick={() => {
            resetSession()
            setActiveUrl(draftUrl)
            onDetailRootActivated(draftDetailUrl ?? defaultDetailRoot ?? ***REMOVED******REMOVED***)
            setLoadCount((n) => n + 1)
          }}
        >
          Load {pluralLabel}
        </Button>
      </div>
      {isFetching && (
        <div className="flex items-center justify-center p-6">
          <Loader size="sm" />
        </div>
      )}
      {isError && (
        <div className="text-sm text-red-700" role="alert">
          Unable to load {pluralLabel}: {error instanceof Error ? error.message : String(error)}
        </div>
      )}
    </>
  )
}

export type IImportPageProps = {
  type: string
  objectTypeSlug?: string
  label: string
  pluralLabel?: string
  sourceAdapter?: ImportSourceAdapter
  objectType?: IObjectType
  csvSource?: boolean
  startAtImport?: boolean
  icon: ForwardRefExoticComponent<Omit<LucideProps, ***REMOVED***ref***REMOVED***> & RefAttributes<SVGSVGElement>>
}

const ImportRecordsPage = ({
  label,
  pluralLabel,
  type,
  objectTypeSlug,
  sourceAdapter,
  csvSource = false,
  startAtImport = false,
  // objectType
}: IImportPageProps): ReactElement => {
  pluralLabel = pluralLabel || `${label}s`
  const sourceId = sourceAdapter?.id ?? type
  const typeSlug = objectTypeSlug ?? type
  const {
    session,
    clearReconciliations,
    setConflictAction,
    setIncludeInvalidRecords,
    setMergeStrategy,
    setReconciliations,
    setRecordResult,
  } = useImportSession(sourceId)
  const { candidates: previewRecordsToImport, selectedObjectType: objectTypeForRecords } = session
  const validationComplete = isValidationComplete(session)
  const eligibleRecords = useMemo(
    () =>
      filterImportEligibleRecords(
        session.records,
        session.validationResults,
        session.includeInvalidRecords
      ),
    [session.includeInvalidRecords, session.records, session.validationResults]
  )
  const invalidCount = Object.values(session.validationResults).filter(
    (validation) => !validation.isValid
  ).length
  const recordsToPersist = useMemo(
    () =>
      session.reconciliations
        ?.filter(({ action, status }) => status !== ***REMOVED***ambiguous***REMOVED*** && action !== ***REMOVED***ignore***REMOVED***)
        .map(({ record }) => record) ?? [],
    [session.reconciliations]
  )
  const unresolvedCount =
    session.reconciliations?.filter(
      ({ status, action }) => status === ***REMOVED***ambiguous***REMOVED*** || action === undefined
    ).length ?? 0
  const writeFailures = useMemo(
    () =>
      Object.entries(session.recordResults)
        .filter(([, result]) => result.stage === ***REMOVED***failed***REMOVED*** && result.error)
        .map(([key, result]) => ({ key, result })),
    [session.recordResults]
  )

  const auth = useAuth()
  const [selectedTab, setSelectedTab] = useState(
    startAtImport && canSkipImportTypeStep(session) ? ***REMOVED***import***REMOVED*** : csvSource ? ***REMOVED***type***REMOVED*** : ***REMOVED***records***REMOVED***
  )
  const [activeDetailRoot, setActiveDetailRoot] = useState(sourceAdapter?.defaultDetailRoot)
  const getFullDoc = sourceAdapter
    ? ({
        doc,
        signal,
        serviceRoot,
      }: {
        doc: IDocumentImport
        signal?: AbortSignal
        serviceRoot?: string
      }) =>
        sourceAdapter.load({ candidate: doc as ImportCandidate, signal, detailRoot: serviceRoot })
    : (d: { doc: IDocumentImport }) =>
        Promise.resolve({
          uuid: d.doc.uuid,
          slug: d.doc.slug,
          label: d.doc.label,
          data: d.doc.data,
          attrs: {},
          description: d.doc.description,
          provenance: { sourceId: type, externalId: d.doc.uuid },
          sourceData: d.doc.data,
        } as CanonicalImportRecord)

  /* const state = useMemo<***REMOVED***idle***REMOVED*** | ***REMOVED***loading***REMOVED*** | ***REMOVED***success***REMOVED*** | ***REMOVED***error***REMOVED***>(() => {
                if (!activeUrl) return ***REMOVED***idle***REMOVED***
                if (isError) return ***REMOVED***error***REMOVED***
                if (isPending || isFetching) return ***REMOVED***loading***REMOVED***
                if (isSuccess) return ***REMOVED***success***REMOVED***
                return ***REMOVED***idle***REMOVED***
        }, [activeUrl, isError, isPending, isFetching, isSuccess]) */

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <h1 className="shrink-0 text-lg font-semibold">Import {pluralLabel}</h1>

      {sourceAdapter && !csvSource && (
        <RemoteSourceImport
          adapter={sourceAdapter}
          label={label}
          type={type}
          pluralLabel={pluralLabel}
          onDetailRootActivated={setActiveDetailRoot}
        />
      )}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {previewRecordsToImport && previewRecordsToImport.length > 0 && (
          <>
            <nav
              className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-white py-1"
              aria-label="Import steps"
            >
              {[
                ...(!csvSource
                  ? [{ id: ***REMOVED***records***REMOVED***, label: ***REMOVED***1. Preload records***REMOVED***, disabled: false }]
                  : []),
                {
                  id: ***REMOVED***type***REMOVED***,
                  label: csvSource ? ***REMOVED***1. Choose type and validate***REMOVED*** : ***REMOVED***2. Choose type and validate***REMOVED***,
                  disabled: false,
                },
                {
                  id: ***REMOVED***import***REMOVED***,
                  label: csvSource ? ***REMOVED***2. Import***REMOVED*** : ***REMOVED***3. Import***REMOVED***,
                  disabled: !validationComplete || !eligibleRecords.length || !objectTypeForRecords,
                },
              ].map((step) => (
                <Button
                  key={step.id}
                  size="xs"
                  variant={selectedTab === step.id ? ***REMOVED***default***REMOVED*** : ***REMOVED***outline***REMOVED***}
                  disabled={step.disabled}
                  onClick={() => setSelectedTab(step.id)}
                >
                  {step.label}
                </Button>
              ))}
              <span className="ml-auto text-xs text-gray-500">
                {selectedTab === ***REMOVED***records***REMOVED*** && ***REMOVED***Load the complete records you want to import.***REMOVED***}
                {selectedTab === ***REMOVED***type***REMOVED*** && ***REMOVED***Select a type, then validate the loaded records.***REMOVED***}
                {selectedTab === ***REMOVED***import***REMOVED*** && ***REMOVED***Review conflicts and import the validated records.***REMOVED***}
              </span>
            </nav>
            <Tabs
              className="h-full min-h-0 flex-1"
              defaultContentClassName="h-full min-h-0 flex-1 overflow-auto py-3 flex-col gap-2"
              navClassName="hidden"
              selectedTab={selectedTab}
              onChange={(tabId) => setSelectedTab(tabId)}
              tabs={[
                ...(!csvSource
                  ? [
                      {
                        id: ***REMOVED***records***REMOVED***,
                        label: ***REMOVED***Available Records***REMOVED***,
                        content: <ListRecords documents={previewRecordsToImport} />,
                      },
                    ]
                  : []),
                {
                  id: ***REMOVED***type***REMOVED***,
                  label: ***REMOVED***Object type***REMOVED***,
                  content: csvSource ? (
                    <SelectObjectTypeForImportTab
                      documents={session.records}
                      type={typeSlug}
                      sourceId={sourceId}
                      label={label}
                      sourceSchema={sourceAdapter?.schema}
                    />
                  ) : (
                    <SelectObjectTypeForImport
                      documents={previewRecordsToImport}
                      getFullDoc={getFullDoc}
                      detailRoot={activeDetailRoot}
                      label={label}
                      type={typeSlug}
                      sourceId={sourceId}
                    />
                  ),
                },
                {
                  id: ***REMOVED***import***REMOVED***,
                  label: validationComplete ? ***REMOVED***Import Records***REMOVED*** : ***REMOVED***Import Records (validate first)***REMOVED***,
                  disabled: !validationComplete || !eligibleRecords.length || !objectTypeForRecords,
                  content: (
                    <div className="flex flex-col h-full gap-2">
                      <div>
                        Importing {eligibleRecords.length} validated records with object type{***REMOVED*** ***REMOVED***}
                        {objectTypeForRecords?.label}
                      </div>
                      {invalidCount > 0 && !session.includeInvalidRecords && (
                        <div className="text-sm text-amber-800">
                          {invalidCount} invalid records are excluded from this import.
                        </div>
                      )}
                      {auth.isAdmin && invalidCount > 0 && (
                        <Checkbox
                          id="include-invalid-records"
                          testId="include-invalid-records"
                          label="Include invalid records"
                          value={session.includeInvalidRecords}
                          onChange={setIncludeInvalidRecords}
                        />
                      )}
                      {objectTypeForRecords && (
                        <ReconciliationReview
                          records={eligibleRecords}
                          objectTypeUuid={objectTypeForRecords.uuid}
                          token={auth.user?.access_token ?? ***REMOVED******REMOVED***}
                          reconciliations={session.reconciliations}
                          mergeStrategy={session.mergeStrategy}
                          serverMergeAvailable={IMPORT_MERGE_RPC.trim().length > 0}
                          onReconciled={setReconciliations}
                          onActionChange={setConflictAction}
                          onMergeStrategyChange={setMergeStrategy}
                        />
                      )}
                      {session.reconciliations && unresolvedCount > 0 && (
                        <div className="text-sm text-red-700">
                          {unresolvedCount} records have ambiguous matches and will not be imported.
                        </div>
                      )}
                      {writeFailures.length > 0 && (
                        <div
                          className="flex flex-col gap-2 border border-red-300 bg-red-50 p-3"
                          role="alert"
                        >
                          <strong className="text-sm text-red-800">
                            {writeFailures.length} records could not be saved
                          </strong>
                          {writeFailures.map(({ key, result }) => {
                            const failedRecord = eligibleRecords.find(
                              (record) => importRecordKey(record) === key
                            )
                            return (
                              <div
                                key={key}
                                className="flex flex-wrap items-center gap-2 text-sm text-red-800"
                              >
                                <span>
                                  {failedRecord?.label ?? key}: {result.error}
                                </span>
                                {result.errorKind === ***REMOVED***duplicate-type-slug***REMOVED*** && failedRecord && (
                                  <>
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      onClick={() => {
                                        setConflictAction(failedRecord, ***REMOVED***ignore***REMOVED***)
                                        setRecordResult(failedRecord, { stage: ***REMOVED***reconciled***REMOVED*** })
                                      }}
                                    >
                                      Ignore record
                                    </Button>
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      onClick={clearReconciliations}
                                    >
                                      Return to duplicate check
                                    </Button>
                                  </>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {session.reconciliations && recordsToPersist.length === 0 && (
                        <div className="text-sm text-gray-700">
                          No records are selected for creation or update.
                        </div>
                      )}
                      {session.reconciliations && recordsToPersist.length > 0 && (
                        <BatchLoadDocuments
                          documents={recordsToPersist}
                          getFullDoc={async ({ doc }) => {
                            const record = recordsToPersist.find(
                              (candidate) =>
                                candidate.provenance.externalId === doc.provenance.externalId
                            )
                            if (!record) throw new Error(`Preloaded record not found: ${doc.label}`)
                            return record
                          }}
                          detailRoot={activeDetailRoot}
                          onFullDocLoaded={async (doc, { signal }) => {
                            if (objectTypeForRecords !== undefined) {
                              const reconciliation = session.reconciliations?.find(
                                ({ record }) => importRecordKey(record) === importRecordKey(doc)
                              )
                              if (!reconciliation?.action || reconciliation.action === ***REMOVED***ignore***REMOVED***)
                                return

                              const attrs = withImportProvenance(doc.attrs, doc.provenance)
                              const docToSave = {
                                object_type_uuid: objectTypeForRecords.uuid,
                                ...pick(doc, [***REMOVED***label***REMOVED***, ***REMOVED***description***REMOVED***, ***REMOVED***slug***REMOVED***, ***REMOVED***data***REMOVED***]),
                                attrs,
                              } as Omit<IDocument, ***REMOVED***uuid***REMOVED*** | ***REMOVED***created_at***REMOVED*** | ***REMOVED***updated_at***REMOVED***>
                              if (reconciliation.action === ***REMOVED***create***REMOVED***) {
                                const existingDocument = await fetchExistingDocumentBySlug({
                                  slug: doc.slug,
                                  objectTypeUuid: objectTypeForRecords.uuid,
                                  token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
                                  signal,
                                })
                                if (existingDocument) {
                                  throw new Error(
                                    `Document "${doc.slug}" already exists. Check existing documents again to choose ignore, merge, or overwrite.`
                                  )
                                }
                                await postDocument({
                                  document: docToSave,
                                  token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
                                  signal,
                                })
                                return
                              }

                              const existingDocument = reconciliation.existingDocuments[0]
                              if (!existingDocument)
                                throw new Error(***REMOVED***Existing document was not found***REMOVED***)
                              if (
                                reconciliation.action === ***REMOVED***merge***REMOVED*** &&
                                session.mergeStrategy === ***REMOVED***postgrest-rpc***REMOVED***
                              ) {
                                await mergeImportDocumentViaRpc({
                                  rpcPath: IMPORT_MERGE_RPC,
                                  documentUuid: existingDocument.uuid,
                                  incomingDocument: docToSave,
                                  token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
                                  signal,
                                })
                                return
                              }
                              const document =
                                reconciliation.action === ***REMOVED***merge***REMOVED***
                                  ? {
                                      label: mergeIncomingNonEmpty(
                                        existingDocument.label,
                                        doc.label
                                      ) as string,
                                      description: mergeIncomingNonEmpty(
                                        existingDocument.description,
                                        doc.description
                                      ) as string,
                                      slug: mergeIncomingNonEmpty(
                                        existingDocument.slug,
                                        doc.slug
                                      ) as string,
                                      data: mergeIncomingNonEmpty(existingDocument.data, doc.data),
                                      attrs: withImportProvenance(
                                        mergeIncomingNonEmpty(existingDocument.attrs, doc.attrs),
                                        doc.provenance
                                      ),
                                    }
                                  : docToSave
                              await patchDocument({
                                uuid: existingDocument.uuid,
                                document,
                                token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
                                signal,
                              })
                            }
                          }}
                          onAllFullDocsLoaded={async (fullDocs, summary) => {
                            console.log(***REMOVED***All full docs loaded:***REMOVED***, fullDocs)
                            if (summary.failed === 0) clearReconciliations()
                          }}
                          onRecordResult={(record, result) => {
                            const error =
                              result.status === ***REMOVED***rejected***REMOVED***
                                ? classifyImportError(result.reason)
                                : undefined
                            setRecordResult(
                              record,
                              result.status === ***REMOVED***fulfilled***REMOVED***
                                ? { stage: ***REMOVED***imported***REMOVED*** }
                                : {
                                    stage: ***REMOVED***failed***REMOVED***,
                                    error: error?.message,
                                    errorKind: error?.kind,
                                  }
                            )
                          }}
                          onIgnoreConflict={(record) => setConflictAction(record, ***REMOVED***ignore***REMOVED***)}
                          onResolveConflict={clearReconciliations}
                        />
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default ImportRecordsPage
