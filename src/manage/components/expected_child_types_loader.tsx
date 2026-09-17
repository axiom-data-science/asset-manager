import { fetchObjectTypes } from '@/manage/object_type/services'
import type { IObjectType, IDocument, IHydratedExpectedChildType } from '@/types/types'
import { SelectInput, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { useQuery } from '@tanstack/react-query'
import { useState, type ReactElement } from 'react'
import { useAuth } from 'react-oidc-context'
import ButtonLink from './button_link'
import { buildStringFromTemplate } from '@/lib/utils'


const DefaultChildTypeSelector = ({
  parentDocument,
  expectedChildTypes,
  createViewPath,
}: {
  parentDocument?: IDocument<unknown>
  objectType: IObjectType
  expectedChildTypes?: IHydratedExpectedChildType[]
  createViewPath?: string
}): ReactElement => {
  return (
    <div>
      {expectedChildTypes?.map((ect, index) => {
        return (
          <div key={index} className="flex flex-col gap-2 text-left">
            <h4 className="font-medium">{ect.label}</h4>
            {
              ect?.description && <p className='text-sm text-gray-700'>{ect.description}</p>
            }
            <div className="flex flex-row gap-4">
              {ect?.object_types?.map((ot) => {
                return (
                  <ButtonLink
                    to={createViewPath ? buildStringFromTemplate(createViewPath, {
                      object_type_uuid: ot.uuid,
                      parentDocumentUUID: parentDocument?.uuid,
                      toParentPredicate: ect.to_parent_predicate,
                      parentObjectTypeUUID: parentDocument?.object_type_uuid,
                      returnToOnSuccess: '/create-document-success',
                    }) : `/create-document/${ot.uuid}/object_type?parentDocumentUUID=${parentDocument?.uuid}&toParentPredicate=${ect.to_parent_predicate}&parentObjectTypeUUID=${parentDocument?.object_type_uuid}&returnToOnSuccess=/create-document-success`}
                    key={ot.uuid}
                  >
                    Create {ot.label}
                  </ButtonLink>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const ExpectedChildTypeLoader = ({
  parentDocument,
  objectType,
  //createViewPath,
  View = DefaultChildTypeSelector,
}: {
  parentDocument?: IDocument<unknown>
  objectType: IObjectType
  createViewPath?: string
  View?: React.FC<{
    parentDocument?: IDocument<unknown>
    objectType: IObjectType
    expectedChildTypes?: IHydratedExpectedChildType[]
    createViewPath?: string
  }>
}): ReactElement => {
  const auth = useAuth()
  const expectedChildTypes = objectType.data?.expected_child_types ?? []

  const { data, isLoading, error } = useQuery({
    queryKey: ['expected-child-types', objectType.uuid],
    queryFn: async () => {
      const childTypes = await Promise.all(
        expectedChildTypes.map(async (ect) => {
          if (ect.object_type_slug || ect.object_type_query) {
            const childObjectTypes = await fetchObjectTypes({
              params: ect.object_type_slug
                ? { filters: [{ column: 'slug', operator: 'eq', value: ect.object_type_slug }] }
                : undefined,
              queryString: ect.object_type_query,
              token: auth.user?.access_token ?? '',
            })

            return {
              ...ect,
              object_types: childObjectTypes,
            }
          }
        })
      )
      return childTypes.filter((ect) => ect !== undefined) as IHydratedExpectedChildType[]
    },
  })

  if (expectedChildTypes.length === 0) {
    return <View parentDocument={parentDocument} objectType={objectType} />
  }

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data && (
        <View parentDocument={parentDocument} objectType={objectType} expectedChildTypes={data} />
      )}
    </ViewWithLoader>
  )
}

const CreateCollectionMetadataButton = ({
  document,
  objectType,
  label,
  createViewPath,
}: {
  document?: IDocument<unknown>
  objectType: IObjectType
  label: string
  createViewPath?: string
}): ReactElement => {
  const collectionMetadataLink = createViewPath
    ? buildStringFromTemplate(createViewPath, {
      object_type_uuid: objectType.uuid,
      object_type_slug: objectType.slug,
      document_uuid: document?.uuid,
      document_slug: document?.slug,
    })
    : `/document/create/${objectType.uuid}/object_type?${document !== undefined ? `returnToOnSuccess=/document/edit/${document.uuid}` : ''}`
  // const collectionMetadataLink = `/document/create/${collectionMetadataObjectTypeUUID}/object_type/${collectionMetadataObjectTypeUUID}/form?returnToOnSuccess=/document/edit/${document.uuid}`
  return (
    <ButtonLink
      to={collectionMetadataLink}
      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
    >
      {label}
    </ButtonLink>
  )
}

export const SelectChildTypeForCreation = ({
  document,
  objectType,
  expectedChildTypes,
  createViewPath,
}: {
  document?: IDocument<unknown>
  objectType: IObjectType
  expectedChildTypes: IObjectType[]
  createViewPath?: string
}): ReactElement => {
  const childTypeMap = Object.fromEntries(expectedChildTypes.map((ect) => [ect.uuid, ect]))
  const [selectedChildTypeUUID, setSelectedChildTypeUUID] = useState<string | null>(null)
  return (
    <>
      <SelectInput
        id={`expected-child-type-${objectType.uuid}`}
        testId={`expected-child-type-${objectType.uuid}`}
        options={expectedChildTypes.map((ot) => ({ value: ot.uuid, label: ot.label }))}
        onChange={(e) => {
          setSelectedChildTypeUUID(e?.value ? String(e.value) : null)
        }}
      />
      {selectedChildTypeUUID !== null && (
        <CreateCollectionMetadataButton
          document={document}
          objectType={childTypeMap[selectedChildTypeUUID]}
          label={`Create ${childTypeMap[selectedChildTypeUUID]?.label ?? 'Create child record'}`}
          createViewPath={createViewPath}
        />
      )}
    </>
  )
}

export const ExpectedChildTypeSelector = ({
  parentDocument,
  objectType,
  createViewPath,
}: {
  parentDocument: IDocument
  objectType: IObjectType
  createViewPath?: string
}): ReactElement => {
  return (
    <ExpectedChildTypeLoader
      parentDocument={parentDocument}
      objectType={objectType}
      createViewPath={createViewPath}
    /* View={({
      parentDocument,
      objectType,
      expectedChildTypes,
    }: {
      parentDocument?: IDocument<unknown>
      objectType: IObjectType
      expectedChildTypes?: IHydratedExpectedChildType[]
    }) => {
      if (expectedChildTypes === undefined || expectedChildTypes.length === 0) {
        return <p>No expected child types</p>
      }
      return expectedChildTypes?.map((ect, index) => {
        return (
          <div key={index} className="flex flex-col gap-2">
            {
              ect?.label && <h4 className="font-medium">{ect.label}</h4>
            }
            {
              ect?.description && <p className='text-sm text-gray-700'>{ect.description}</p>
            }
            {ect?.object_types &&
              ect.object_types.length > 0 &&
              (ect.object_types.length === 1 ? (
                <CreateCollectionMetadataButton
                  document={parentDocument}
                  objectType={ect.object_types[0]}
                  label={`Create ${ect.object_types[0].label}`}
                  createViewPath={createViewPath}
                />
              ) : (
                <SelectChildTypeForCreation
                  document={parentDocument}
                  objectType={objectType}
                  expectedChildTypes={ect.object_types}
                  createViewPath={createViewPath}
                />
              ))}
          </div>
        )
      })
    }} */
    />
  )
}

export default ExpectedChildTypeLoader
