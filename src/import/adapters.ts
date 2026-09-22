import type {
    CanonicalImportRecord,
    IDocumentImport,
    IFullDocForImport,
    ImportSourceAdapter,
} from ***REMOVED***./types***REMOVED***
import type { JSONSchema6 } from ***REMOVED***json-schema***REMOVED***

type LegacyDiscover = (options: {
    url: string
    signal: AbortSignal
}) => Promise<IDocumentImport<unknown>[]>

type LegacyLoad = (options: {
    doc: IDocumentImport
    url?: string
    signal?: AbortSignal
    serviceRoot?: string
}) => Promise<IFullDocForImport>

export type RemoteImportAdapterOptions = {
    id: string
    defaultImportUrl: string
    defaultDetailRoot?: string
    discover: LegacyDiscover
    load: LegacyLoad
    getExternalId?: (candidate: IDocumentImport) => string
    relationshipRules?: ImportSourceAdapter[***REMOVED***relationshipRules***REMOVED***]
    schema?: JSONSchema6
}

export const createRemoteImportAdapter = ({
    id,
    defaultImportUrl,
    defaultDetailRoot,
    discover,
    load,
    getExternalId = (candidate) => candidate.uuid,
    relationshipRules,
    schema,
}: RemoteImportAdapterOptions): ImportSourceAdapter => ({
    id,
    defaultImportUrl,
    defaultDetailRoot,
    relationshipRules,
    schema,
    discover: async (options) => {
        const candidates = await discover(options)
        return candidates.map((candidate) => ({
            ...candidate,
            provenance: {
                sourceId: id,
                externalId: getExternalId(candidate),
            },
        }))
    },
    load: async ({ candidate, detailRoot, signal }) => {
        const fullDocument = await load({
            doc: candidate,
            signal,
            serviceRoot: detailRoot,
        })

        return {
            ...fullDocument,
            uuid: candidate.uuid,
            provenance: candidate.provenance,
            sourceData: candidate.data,
        } as CanonicalImportRecord
    },
})