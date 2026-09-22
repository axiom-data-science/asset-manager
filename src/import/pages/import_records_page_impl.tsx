import type { IDocument, IObjectType } from '@/types/types'
import { Checkbox, Input, Loader, Tabs } from '@axdspub/axiom-ui-utilities'
import { useQuery } from '@tanstack/react-query'

import { TableVirtuoso, type TableComponents } from 'react-virtuoso'
import {
  forwardRef,
  useMemo,
  useState,
  type ForwardRefExoticComponent,
  type ReactElement,
  type RefAttributes,
} from 'react'
import { Button } from '@/components/ui/button'
import type {
  CanonicalImportRecord,
  IDocumentImport,
  ImportCandidate,
  ImportSourceAdapter,
} from '@/import/types'
import SelectObjectTypeForImport from './select_object_type_for_import/index.tsx'
import { SelectObjectTypeForImportTab } from './select_object_type_for_import/index.tsx'
import {
  filterImportEligibleRecords,
  canSkipImportTypeStep,
  isValidationComplete,
  useImportSession,
} from '@/import/state/importState'
import BatchLoadDocuments from '@/import/components/batch_load_documents'
import ReconciliationReview from '@/import/components/reconciliation_review'
import { patchDocument, postDocument } from '@/manage/document/services'
import { useAuth } from '@/auth/useAuth'
import { pick } from 'lodash-es'
import type { LucideProps } from 'lucide-react'
import { importRecordKey } from '@/import/state/importState'
import { mergeIncomingNonEmpty, withImportProvenance } from '@/import/reconciliation'
import {
  fetchExistingDocumentBySlug,
  mergeImportDocumentViaRpc,
} from '@/import/reconciliation_service'
import { IMPORT_MERGE_RPC } from '@/config/config'
import { classifyImportError } from '@/import/import_errors'

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
  (error instanceof DOMException && error.name === 'AbortError') || !!signal?.aborted

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
        console.error('Error fetching documents:', error)
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
            onDetailRootActivated(draftDetailUrl ?? defaultDetailRoot ?? '')
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
  icon: ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>
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
        ?.filter(({ action, status }) => status !== 'ambiguous' && action !== 'ignore')
        .map(({ record }) => record) ?? [],
    [session.reconciliations]
  )
  const unresolvedCount =
    session.reconciliations?.filter(
      ({ status, action }) => status === 'ambiguous' || action === undefined
    ).length ?? 0
  const writeFailures = useMemo(
    () =>
      Object.entries(session.recordResults)
        .filter(([, result]) => result.stage === 'failed' && result.error)
        .map(([key, result]) => ({ key, result })),
    [session.recordResults]
  )

  const auth = useAuth()
  const [selectedTab, setSelectedTab] = useState(
    startAtImport && canSkipImportTypeStep(session) ? 'import' : csvSource ? 'type' : 'records'
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

  /* const state = useMemo<'idle' | 'loading' | 'success' | 'error'>(() => {
                if (!activeUrl) return 'idle'
                if (isError) return 'error'
                if (isPending || isFetching) return 'loading'
                if (isSuccess) return 'success'
                return 'idle'
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
                  ? [{ id: 'records', label: '1. Preload records', disabled: false }]
                  : []),
                {
                  id: 'type',
                  label: csvSource ? '1. Choose type and validate' : '2. Choose type and validate',
                  disabled: false,
                },
                {
                  id: 'import',
                  label: csvSource ? '2. Import' : '3. Import',
                  disabled: !validationComplete || !eligibleRecords.length || !objectTypeForRecords,
                },
              ].map((step) => (
                <Button
                  key={step.id}
                  size="xs"
                  variant={selectedTab === step.id ? 'default' : 'outline'}
                  disabled={step.disabled}
                  onClick={() => setSelectedTab(step.id)}
                >
                  {step.label}
                </Button>
              ))}
              <span className="ml-auto text-xs text-gray-500">
                {selectedTab === 'records' && 'Load the complete records you want to import.'}
                {selectedTab === 'type' && 'Select a type, then validate the loaded records.'}
                {selectedTab === 'import' && 'Review conflicts and import the validated records.'}
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
                        id: 'records',
                        label: 'Available Records',
                        content: <ListRecords documents={previewRecordsToImport} />,
                      },
                    ]
                  : []),
                {
                  id: 'type',
                  label: 'Object type',
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
                  id: 'import',
                  label: validationComplete ? 'Import Records' : 'Import Records (validate first)',
                  disabled: !validationComplete || !eligibleRecords.length || !objectTypeForRecords,
                  content: (
                    <div className="flex flex-col h-full gap-2">
                      <div>
                        Importing {eligibleRecords.length} validated records with object type{' '}
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
                          token={auth.user?.access_token ?? ''}
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
                                {result.errorKind === 'duplicate-type-slug' && failedRecord && (
                                  <>
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      onClick={() => {
                                        setConflictAction(failedRecord, 'ignore')
                                        setRecordResult(failedRecord, { stage: 'reconciled' })
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
                              if (!reconciliation?.action || reconciliation.action === 'ignore')
                                return

                              const attrs = withImportProvenance(doc.attrs, doc.provenance)
                              const docToSave = {
                                object_type_uuid: objectTypeForRecords.uuid,
                                ...pick(doc, ['label', 'description', 'slug', 'data']),
                                attrs,
                              } as Omit<IDocument, 'uuid' | 'created_at' | 'updated_at'>
                              if (reconciliation.action === 'create') {
                                const existingDocument = await fetchExistingDocumentBySlug({
                                  slug: doc.slug,
                                  objectTypeUuid: objectTypeForRecords.uuid,
                                  token: auth.user?.access_token ?? '',
                                  signal,
                                })
                                if (existingDocument) {
                                  throw new Error(
                                    `Document "${doc.slug}" already exists. Check existing documents again to choose ignore, merge, or overwrite.`
                                  )
                                }
                                await postDocument({
                                  document: docToSave,
                                  token: auth.user?.access_token ?? '',
                                  signal,
                                })
                                return
                              }

                              const existingDocument = reconciliation.existingDocuments[0]
                              if (!existingDocument)
                                throw new Error('Existing document was not found')
                              if (
                                reconciliation.action === 'merge' &&
                                session.mergeStrategy === 'postgrest-rpc'
                              ) {
                                await mergeImportDocumentViaRpc({
                                  rpcPath: IMPORT_MERGE_RPC,
                                  documentUuid: existingDocument.uuid,
                                  incomingDocument: docToSave,
                                  token: auth.user?.access_token ?? '',
                                  signal,
                                })
                                return
                              }
                              const document =
                                reconciliation.action === 'merge'
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
                                token: auth.user?.access_token ?? '',
                                signal,
                              })
                            }
                          }}
                          onAllFullDocsLoaded={async (fullDocs, summary) => {
                            console.log('All full docs loaded:', fullDocs)
                            if (summary.failed === 0) clearReconciliations()
                          }}
                          onRecordResult={(record, result) => {
                            const error =
                              result.status === 'rejected'
                                ? classifyImportError(result.reason)
                                : undefined
                            setRecordResult(
                              record,
                              result.status === 'fulfilled'
                                ? { stage: 'imported' }
                                : {
                                    stage: 'failed',
                                    error: error?.message,
                                    errorKind: error?.kind,
                                  }
                            )
                          }}
                          onIgnoreConflict={(record) => setConflictAction(record, 'ignore')}
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
