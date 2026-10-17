import ShareDocument from '@/components/custom/share-document'
import ExpectedChildTypeLoader from '@/manage/components/expected_child_types_loader'
import Link from '@/manage/components/link'
import MODLChildTypeActions, {
  type MODLChildTypeActionsProps,
} from './modl_child_type_actions'
import { fetchDocumentWithPermissions } from '@/manage/document/services'
import { fetchRelationships } from '@/manage/relationship/services'
import { useObjectTypeList } from '@/manage/object_type/useObjectTypeList'
import { useAuth } from '@/auth/useAuth'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import contextStateAtom from '@/state/contextStateAtom'
import type { IDocument, IObjectType } from '@/types/types'
import { Button, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Share } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { useAtom } from 'jotai'

type MODLDocument = IDocument<unknown> & { can_modify: boolean }

type MODLRecords = {
  parents: MODLDocument[]
  childrenByParent: Record<string, MODLDocument[]>
}

const MODLDocuments = ({
  Heading,
  excludeDocumentUUID,
}: {
  Heading?: ReactNode
  excludeDocumentUUID?: string
}): ReactElement => {
  const auth = useAuth()
  const [context] = useAtom(contextStateAtom)
  const { data: objectTypes, isLoading: isLoadingObjectTypes, error: objectTypesError } =
    useObjectTypeList({
      params: {
        filters: [{ column: 'slug', operator: 'eq', value: 'modl' }],
      },
    })
  const objectType = objectTypes?.find((type) => type.slug === 'modl')

  const { data, isLoading, error } = useQuery({
    queryKey: ['modl-records', objectType?.uuid, excludeDocumentUUID],
    enabled: !!objectType,
    queryFn: async ({ signal }): Promise<MODLRecords> => {
      if (!objectType) {
        throw new Error('MODL object type is not available')
      }

      const parents = await fetchDocumentWithPermissions({
        params: {
          filters: [
            { column: 'object_type_uuid', operator: 'eq', value: objectType.uuid },
            ...(excludeDocumentUUID
              ? [{ column: 'uuid', operator: 'neq' as const, value: excludeDocumentUUID }]
              : []),
          ],
          order: [{ column: 'created_at', dir: 'desc' }],
          limit: 100,
        },
        token: auth.user?.access_token ?? '',
        signal,
      })

      if (parents.length === 0) {
        return { parents, childrenByParent: {} }
      }

      const expectedPredicateUUIDs = new Set(
        (objectType.data?.expected_child_types ?? []).flatMap(({ to_parent_predicate }) => {
          if (!to_parent_predicate) {
            return []
          }
          const predicate =
            context.predicate_by_predicate[to_parent_predicate] ??
            context.predicate_by_uuid[to_parent_predicate]
          return predicate ? [predicate.uuid] : []
        })
      )
      if (expectedPredicateUUIDs.size === 0) {
        return {
          parents,
          childrenByParent: Object.fromEntries(parents.map((parent) => [parent.uuid, []])),
        }
      }

      const relationships = await fetchRelationships({
        params: {
          filters: [
            {
              column: 'to_document_uuid',
              operator: 'in',
              value: parents.map((parent) => parent.uuid),
            },
          ],
          limit: 500,
        },
        token: auth.user?.access_token ?? '',
        signal,
      })
      const childRelationships = relationships.filter((relationship) =>
        expectedPredicateUUIDs.has(relationship.predicate_uuid)
      )
      const childUUIDs = [
        ...new Set(childRelationships.map((relationship) => relationship.from_document_uuid)),
      ]
      const children = childUUIDs.length
        ? await fetchDocumentWithPermissions({
          params: {
            filters: [{ column: 'uuid', operator: 'in', value: childUUIDs }],
            order: [{ column: 'created_at', dir: 'desc' }],
            limit: 500,
          },
          token: auth.user?.access_token ?? '',
          signal,
        })
        : []
      const childrenByUUID = new Map(children.map((child) => [child.uuid, child]))

      return {
        parents,
        childrenByParent: Object.fromEntries(
          parents.map((parent) => [
            parent.uuid,
            childRelationships
              .filter((relationship) => relationship.to_document_uuid === parent.uuid)
              .map((relationship) => childrenByUUID.get(relationship.from_document_uuid))
              .filter((child): child is MODLDocument => child !== undefined),
          ])
        ),
      }
    },
  })

  if (!objectType && !isLoadingObjectTypes && !objectTypesError) {
    return <p>MODL record type is not available.</p>
  }

  return (
    <ViewWithLoader
      isLoading={isLoadingObjectTypes || (!!objectType && isLoading)}
      error={objectTypesError ?? error}
      data={objectTypes && data}
    >
      {data && objectType && (
        <div className="flex flex-col gap-4">

          {data.parents.length === 0 ? (
            <></>
          ) : (
            <>
              {Heading}
              {data.parents.map((parent) => (
                <MODLRecord
                  key={parent.uuid}
                  document={parent}
                  objectType={objectType}
                  children={data.childrenByParent[parent.uuid] ?? []}
                />
              ))}
            </>
          )
          }
        </div>
      )}
    </ViewWithLoader>
  )
}

const MODLRecord = ({
  document,
  objectType,
  children,
}: {
  document: MODLDocument
  objectType: IObjectType
  children: MODLDocument[]
}): ReactElement => {
  const RecordChildTypeActions = (props: MODLChildTypeActionsProps) => (
    <MODLChildTypeActions {...props} layout="record" existingChildren={children} />
  )

  return (
    <Collapsible defaultOpen={false}>
      <section className="rounded-md bg-slate-100 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {document.can_modify && document.lock_sub === null ? (
            <Link
              to={{
                pathname: `/edit-document/${document.uuid}`,
                search: new URLSearchParams({
                  returnToOnSuccess: `/create-document-success?uuid=${document.uuid}&action=edit`,
                }).toString(),
              }}
              className="font-bold"
            >
              {document.label}
            </Link>
          ) : (
            <Link to={`/documents/${document.uuid}`} className="font-bold">
              {document.label}
            </Link>
          )}
          <ShareDocument
            document={document}
            SelectButton={
              <Button size="xs" variant="outline">
                Share <Share />
              </Button>
            }
          />
          <span className="text-xs text-slate-600">Owner: {document.owner_sub}</span>
          <CollapsibleTrigger
            aria-label={`Toggle related metadata for ${document.label}`}
            className="ml-auto rounded p-1 hover:bg-slate-200"
          >
            <ChevronDown className="size-4 transition-transform data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="mt-3 flex flex-col gap-3 pt-3">
            <ExpectedChildTypeLoader
              parentDocument={document}
              objectType={objectType}
              View={RecordChildTypeActions}
            />
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  )
}

export default MODLDocuments
