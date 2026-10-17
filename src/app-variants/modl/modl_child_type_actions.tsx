import { buildStringFromTemplate } from '@/lib/utils'
import ButtonLink from '@/manage/components/button_link'
import Link from '@/manage/components/link'
import type { IDocument, IHydratedExpectedChildType, IObjectType } from '@/types/types'
import type { ReactElement } from 'react'

export type MODLChildTypeActionsProps = {
  parentDocument?: IDocument<unknown>
  objectType: IObjectType
  expectedChildTypes?: IHydratedExpectedChildType[]
  createViewPath?: string
  existingChildren?: (IDocument<unknown> & { can_modify: boolean })[]
  layout?: 'default' | 'success' | 'record'
}

type ChildAction = {
  expectedChildType: IHydratedExpectedChildType
  childType: IObjectType
}

const isDataCollectionType = (slug: string) =>
  /collector|collection|^modl_coll(?:_|$)/i.test(slug)

const isVariableMetadataType = (slug: string) => /variable_metadata/i.test(slug)

const getChildActions = (
  expectedChildTypes: IHydratedExpectedChildType[],
  matches: (slug: string) => boolean
): ChildAction[] =>
  expectedChildTypes.flatMap((expectedChildType) =>
    (expectedChildType.object_types ?? [])
      .filter((childType) => matches(childType.slug))
      .map((childType) => ({ expectedChildType, childType }))
  )

const MODLChildTypeActions = ({
  parentDocument,
  expectedChildTypes = [],
  createViewPath,
  existingChildren = [],
  layout = 'default',
}: MODLChildTypeActionsProps): ReactElement => {
  const variableMetadataActions = getChildActions(expectedChildTypes, isVariableMetadataType)
  const dataCollectionActions = getChildActions(expectedChildTypes, isDataCollectionType)
  const otherActions = getChildActions(
    expectedChildTypes,
    (slug) => !isDataCollectionType(slug) && !isVariableMetadataType(slug)
  )
  const childActionLink = ({ expectedChildType, childType }: ChildAction) =>
    createViewPath
      ? buildStringFromTemplate(createViewPath, {
        object_type_uuid: childType.uuid,
        parentDocumentUUID: parentDocument?.uuid,
        toParentPredicate: expectedChildType.to_parent_predicate,
        parentObjectTypeUUID: parentDocument?.object_type_uuid,
        returnToOnSuccess: '/create-document-success',
      })
      : `/create-document/${childType.uuid}/object_type?parentDocumentUUID=${parentDocument?.uuid}&toParentPredicate=${expectedChildType.to_parent_predicate}&parentObjectTypeUUID=${parentDocument?.object_type_uuid}&returnToOnSuccess=/create-document-success`
  const renderButtons = (items: ChildAction[], className?: string) =>
    items.map(({ expectedChildType, childType }) => (
      <ButtonLink
        key={`${expectedChildType.to_parent_predicate}-${childType.uuid}`}
        className={className ?? 'max-w-full !whitespace-normal [overflow-wrap:anywhere] text-center'}
        to={childActionLink({ expectedChildType, childType })}
        variant="outline"
        size="xs"
      >
        Create {childType.label}
      </ButtonLink>
    ))
  const childRecordsFor = (items: ChildAction[]) => {
    const childTypeUUIDs = new Set(items.map(({ childType }) => childType.uuid))
    return [
      ...new Map(
        existingChildren
          .filter((child) => childTypeUUIDs.has(child.object_type_uuid))
          .map((child) => [child.uuid, child])
      ).values(),
    ]
  }
  const renderChildRecords = (children: (IDocument<unknown> & { can_modify: boolean })[]) => (
    <ul className="flex flex-col gap-1">
      {children.map((child) => (
        <li key={child.uuid}>
          {child.can_modify && child.lock_sub === null ? (
            <Link
              to={{
                pathname: `/edit-document/${child.uuid}`,
                search: new URLSearchParams({
                  returnToOnSuccess: `/create-document-success?uuid=${child.uuid}&action=edit`,
                  skip_tabs: 'true',
                }).toString(),
              }}
              className="text-sm"
            >
              {child.label}
            </Link>
          ) : (
            <Link to={`/documents/${child.uuid}`} className="text-sm">
              {child.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  )

  if (layout === 'success') {
    return (
      <div className="flex flex-col gap-4">
        {variableMetadataActions.length > 0 && (
          <section className="flex flex-col gap-2">
            <div className="flex flex-row flex-wrap gap-4">
              {renderButtons(variableMetadataActions)}
            </div>
          </section>
        )}
        {dataCollectionActions.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">Asset collector metadata</h3>
            {[...new Set(dataCollectionActions
              .map(({ expectedChildType }) => expectedChildType.description)
              .filter((description): description is string => Boolean(description)))].map(
                (description) => (
                  <p key={description} className="text-sm text-gray-700">
                    {description}
                  </p>
                )
              )}
            <div className="flex flex-row flex-nowrap gap-3">
              {renderButtons(
                dataCollectionActions,
                'min-w-0 flex-1 !whitespace-normal [overflow-wrap:anywhere] text-center'
              )}
            </div>
          </section>
        )}
        {otherActions.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">Other child metadata</h3>
            <div className="flex flex-row flex-wrap gap-4">{renderButtons(otherActions)}</div>
          </section>
        )}
      </div>
    )
  }

  if (layout === 'record') {
    const collectionRecords = childRecordsFor(dataCollectionActions)
    const variableRecords = childRecordsFor(variableMetadataActions)
    const knownChildTypeUUIDs = new Set(
      expectedChildTypes.flatMap((expectedChildType) =>
        (expectedChildType.object_types ?? []).map((childType) => childType.uuid)
      )
    )
    const otherChildTypeUUIDs = new Set(otherActions.map(({ childType }) => childType.uuid))
    const otherRecords = [
      ...new Map(
        existingChildren
          .filter(
            (child) =>
              otherChildTypeUUIDs.has(child.object_type_uuid) ||
              !knownChildTypeUUIDs.has(child.object_type_uuid)
          )
          .map((child) => [child.uuid, child])
      ).values(),
    ]

    return (
      <div className="flex flex-col gap-3">
        {(dataCollectionActions.length > 0 || collectionRecords.length > 0) && (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Asset collector metadata</h3>
            {[...new Set(
              dataCollectionActions
                .map(({ expectedChildType }) => expectedChildType.description)
                .filter((description): description is string => Boolean(description))
            )].map((description) => (
              <p key={description} className="text-sm text-gray-700">
                {description}
              </p>
            ))}
            {renderChildRecords(collectionRecords)}
            {dataCollectionActions.length > 0 && (
              <div className="flex flex-row flex-wrap gap-2">
                {renderButtons(dataCollectionActions)}
              </div>
            )}
          </section>
        )}
        {(variableMetadataActions.length > 0 || variableRecords.length > 0) && (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Variable metadata</h3>
            {variableRecords.length > 0
              ? renderChildRecords(variableRecords)
              : (
                  <div className="flex flex-row flex-wrap gap-2">
                    {renderButtons(variableMetadataActions)}
                  </div>
                )}
          </section>
        )}
        {(otherActions.length > 0 || otherRecords.length > 0) && (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Other child metadata</h3>
            {renderChildRecords(otherRecords)}
            <div className="flex flex-row flex-wrap gap-2">{renderButtons(otherActions)}</div>
          </section>
        )}
      </div>
    )
  }

  const defaultGroups = [
    { heading: 'Data collection metadata', items: dataCollectionActions },
    { heading: 'Variable metadata', items: variableMetadataActions },
    { heading: 'Other child metadata', items: otherActions },
  ]

  return (
    <div className="flex flex-col gap-4">
      {defaultGroups.map(
        ({ heading, items }) =>
          items.length > 0 && (
            <section key={heading} className="flex flex-col gap-2">
              <h3 className="font-semibold">{heading}</h3>
              {items.map(({ expectedChildType, childType }) => (
                <div
                  key={`${expectedChildType.to_parent_predicate}-${childType.uuid}`}
                  className="flex flex-col gap-2"
                >
                  {expectedChildType.label && (
                    <h4 className="text-sm font-medium">{expectedChildType.label}</h4>
                  )}
                  {expectedChildType.description && (
                    <p className="text-sm text-gray-700">{expectedChildType.description}</p>
                  )}
                  <div className="flex flex-row flex-wrap gap-4">
                    {renderButtons([{ expectedChildType, childType }])}
                  </div>
                </div>
              ))}
            </section>
          )
      )}
    </div>
  )
}

export const MODLSuccessChildTypeActions = (props: MODLChildTypeActionsProps) => (
  <MODLChildTypeActions {...props} layout="success" />
)

export default MODLChildTypeActions
