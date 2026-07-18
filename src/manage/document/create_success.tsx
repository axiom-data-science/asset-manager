import { Link, useSearchParams } from ***REMOVED***react-router-dom***REMOVED***
import { useDocumentAndObjectTypeAndObjectTypeConfig } from ***REMOVED***./useDocument***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { Button, Loader, utils, ViewWithLoader, SelectInput } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import type { IDocument, IHydratedExpectedChildType, IObjectType } from ***REMOVED***@/types/types***REMOVED***
import { useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***
import { ExternalLink } from ***REMOVED***lucide-react***REMOVED***
import ExpectedChildTypeLoader from ***REMOVED***@/manage/components/expected_child_types_loader***REMOVED***

const ButtonLink = ({
  to,
  children,
  disabled,
  target,
  className
}: {
  to: string
  children: React.ReactNode
  disabled?: boolean
  target?: string
  className?: string
}): ReactElement => {
  return (
    <Link
      to={to}
      className={`${utils.createButtonClass({ variant: ***REMOVED***link***REMOVED*** })}${disabled ? ***REMOVED*** opacity-50 cursor-not-allowed***REMOVED*** : ***REMOVED******REMOVED***}${className ? ` ${className}` : ***REMOVED******REMOVED***}`}
      target={target}
    >
      {children}
      {target ? <ExternalLink /> : null}
    </Link>
  )
}

const getACDDUrl = (uuid: string, fixLatLons: boolean = false) => {
  return fixLatLons
    ? `https://stage-asset-docs-postgrest.srv.axds.co/document?uuid=eq.${uuid}&select=id:data-%3E%3Estation-id,infoUrl:data-%3E%3Einfo_url,Conventions:data-%3E%3Econventions,creator_institution:data-%3E%3Ecreator_institution,cdm_data_type:data-%3E%3Ecdm_data_type,contributor_email:data-%3E%3Econtributor_email,contributor_url:data-%3E%3Econtributor_url,contributor_role:data-%3E%3Econtributor_role,contributor_role_vocabulary:data-%3E%3Econtributor_role_vocabulary,creator_country:data-%3E%3Ecreator_country,creator_email:data-%3E%3Ecreator_email,creator_institution:data-%3E%3Ecreator_institution,creator_name:data-%3E%3Ecreator_name,creator_sector:data-%3E%3Ecreator_sector,creator_type:data-%3E%3Ecreator_type,creator_url:data-%3E%3Ecreator_url,Easternmost_Easting:data->geometry->coordinates->0,Westernmost_Easting:data->geometry->coordinates->0,Northernmost_Northing:data->geometry->coordinates->1,Southernmost_Northing:data->geometry->coordinates->1,sourceUrl:data-%3E%3Esource_url,featureType:data-%3E%3Efeature_type,time_coverage_end:data-%3E%3Etime_coverage_end,time_coverage_start:data-%3E%3Etime_coverage_start,geospatial_lat_max:data->geometry->coordinates->1,geospatial_lat_min:data->geometry->coordinates->1,geospatial_lon_max:data->geometry->coordinates->0,geospatial_lon_min:data->geometry->coordinates->0`
    : `https://stage-asset-docs-postgrest.srv.axds.co/document?uuid=eq.${uuid}&select=id:data-%3E%3Estation-id,infoUrl:data-%3E%3Einfo_url,Conventions:data-%3E%3Econventions,creator_institution:data-%3E%3Ecreator_institution,cdm_data_type:data-%3E%3Ecdm_data_type,contributor_email:data-%3E%3Econtributor_email,contributor_url:data-%3E%3Econtributor_url,contributor_role:data-%3E%3Econtributor_role,contributor_role_vocabulary:data-%3E%3Econtributor_role_vocabulary,creator_country:data-%3E%3Ecreator_country,creator_email:data-%3E%3Ecreator_email,creator_institution:data-%3E%3Ecreator_institution,creator_name:data-%3E%3Ecreator_name,creator_sector:data-%3E%3Ecreator_sector,creator_type:data-%3E%3Ecreator_type,creator_url:data-%3E%3Ecreator_url,Easternmost_Easting:data-%3E%3Elongitude,Westernmost_Easting:data-%3E%3Elongitude,Northernmost_Northing:data-%3E%3Elatitude,Southernmost_Northing:data-%3E%3Elatitude,sourceUrl:data-%3E%3Esource_url,featureType:data-%3E%3Efeature_type,time_coverage_end:data-%3E%3Etime_coverage_end,time_coverage_start:data-%3E%3Etime_coverage_start,geospatial_lat_max:data-%3E%3Elatitude,geospatial_lat_min:data-%3E%3Elatitude,geospatial_lon_max:data-%3E%3Elongitude,geospatial_lon_min:data-%3E%3Elongitude`
}

const getERDDAPDatasetQueryKey = (uuid: string) => [***REMOVED***erddap-dataset***REMOVED***, uuid]

const SubmitToERDDAPButton = ({
  document,
  initialERDDAPDatasetId,
}: {
  document: IDocument<unknown>
  initialERDDAPDatasetId: string | null
}): ReactElement => {
  const uuid = document.uuid
  const [loading, setLoading] = useState(false)
  const [erddapDatasetID, setERDDAPDatasetID] = useState<string | null>(
    initialERDDAPDatasetId === (document.data as { ***REMOVED***station-id***REMOVED***?: string })[***REMOVED***station-id***REMOVED***]
      ? initialERDDAPDatasetId
      : null
  )
  const onSubmit = async () => {
    setLoading(true)
    const o = {
      acdd: getACDDUrl(uuid, false),
      sample_file: `https://stage-asset-docs-postgrest.srv.axds.co/document?uuid=eq.${uuid}&select=file_uri:data-%3Esample_file-%3E%3Efile_uri,headers:data-%3Esample_file-%3Eheaders`,
    }

    console.log(o)
    const j = await (
      await fetch(`https://demo-erddapper.srv.axds.co/datasets/${uuid}`, {
        headers: {
          ***REMOVED***Content-Type***REMOVED***: ***REMOVED***application/json***REMOVED***,
          Accept: ***REMOVED***application/json***REMOVED***,
        },
        body: JSON.stringify(o),
        method: ***REMOVED***POST***REMOVED***,
      })
    ).json()
    if (j.erddap_dataset_id) {
      setERDDAPDatasetID(j.erddap_dataset_id)
    }
    //console.log(j)
    setLoading(false)
  }
  return (
    <>
      {(document.data as { sample_file?: Record<string, string> })?.sample_file && (
        <>
          <Button
            disabled={loading}
            onClick={() => {
              if (!loading) {
                onSubmit()
              }
            }}
          >
            {loading ? <Loader className="w-4 h-4" /> : ***REMOVED******REMOVED***}{***REMOVED*** ***REMOVED***}
            {erddapDatasetID ? ***REMOVED***Update sample file on ERDDAP***REMOVED*** : ***REMOVED***Submit sample file to ERDDAP***REMOVED***}
          </Button>
          {erddapDatasetID && (
            <ButtonLink
              to={`https://erddapper-demo-erddap.srv.axds.co/erddap/tabledap/${erddapDatasetID}.html`}
              target="_blank"
            >
              View in ERDDAP
            </ButtonLink>
          )}
          <ButtonLink to="https://erddapper-demo-erddap.srv.axds.co/erddap/tabledap/index.html?page=1&itemsPerPage=1000">
            All ERDDAP datasets
          </ButtonLink>
          <ButtonLink to={getACDDUrl(document.uuid, true)} target="_blank">
            View ACDD output
          </ButtonLink>
        </>
      )}
    </>
  )
}

const ERDDAPDatasetLoader = ({ document }: { document: IDocument<unknown> }): ReactElement => {
  const uuid = document.uuid
  const { data, isLoading, error } = useQuery({
    queryKey: getERDDAPDatasetQueryKey(uuid),
    queryFn: async () => {
      try {
        const datasetXMLString = await (
          await fetch(`https://demo-erddapper.srv.axds.co/datasets/${uuid}`)
        ).json()

        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(datasetXMLString, ***REMOVED***text/xml***REMOVED***)
        const attrByName = Object.fromEntries(
          Array.from(
            xmlDoc.getElementsByTagName(***REMOVED***addAttributes***REMOVED***)[0].getElementsByTagName(***REMOVED***att***REMOVED***)
          ).map((d) => [d.getAttribute(***REMOVED***name***REMOVED***), d.childNodes[0]?.nodeValue])
        )
        return {
          erddapDatasetId: attrByName[***REMOVED***id***REMOVED***] ?? null,
        }
      } catch (error) {
        console.warn(***REMOVED***Failed to load ERDDAP dataset info***REMOVED***, error)
        return {
          erddapDatasetId: null,
        }
      }
    },
  })

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data && (
        <SubmitToERDDAPButton document={document} initialERDDAPDatasetId={data.erddapDatasetId} />
      )}
    </ViewWithLoader>
  )
}

const CreateCollectionMetadataButton = ({
  document,
  objectType,
  label
}: {
  document?: IDocument<unknown>
  objectType: IObjectType
  label: string
}): ReactElement => {

  const collectionMetadataLink = `/document/create/${objectType.uuid}/object_type?${document !== undefined ? `returnToOnSuccess=/document/edit/${document.uuid}` : ***REMOVED******REMOVED***}`
  // const collectionMetadataLink = `/document/create/${collectionMetadataObjectTypeUUID}/object_type/${collectionMetadataObjectTypeUUID}/form?returnToOnSuccess=/document/edit/${document.uuid}`
  return (
    <ButtonLink to={collectionMetadataLink} className=***REMOVED***bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600***REMOVED***>{label}</ButtonLink>
  )
}

const SelectChildTypeForCreation = ({
  document,
  objectType,
  expectedChildTypes
}: {
  document?: IDocument<unknown>
  objectType: IObjectType,
  expectedChildTypes: IObjectType[]
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
      {
        selectedChildTypeUUID !== null && (
          <CreateCollectionMetadataButton
            document={document}
            objectType={childTypeMap[selectedChildTypeUUID]}
            label={`Create ${childTypeMap[selectedChildTypeUUID]?.label ?? ***REMOVED***Create child record***REMOVED***}`}
          />
        )
      }

    </>
  )
}




const ExpectedChildTypeSelector = ({ parentDocument, objectType }: { parentDocument: IDocument<unknown>, objectType: IObjectType }): ReactElement => {


  return <ExpectedChildTypeLoader
    parentDocument={parentDocument}
    objectType={objectType}
    View={({
      parentDocument,
      objectType,
      expectedChildTypes
    }: {
      parentDocument?: IDocument<unknown>
      objectType: IObjectType,
      expectedChildTypes?: IHydratedExpectedChildType[]
    }) => {
      if (expectedChildTypes === undefined || expectedChildTypes.length === 0) {
        return <p>No expected child types</p>
      }
      return expectedChildTypes?.map((ect, index) => {
        return (
          <div key={index} className=***REMOVED***flex flex-row gap-2 justify-center items-center***REMOVED***>
            {
              ect?.label && <h4 className=***REMOVED***font-medium***REMOVED***>{ect.label}</h4>
            }
            {
              ect?.object_types && ect.object_types.length > 0 && (
                ect.object_types.length === 1 ? (

                  <CreateCollectionMetadataButton
                    document={parentDocument}
                    objectType={ect.object_types[0]}
                    label={`Create ${ect.object_types[0].label}`}
                  />

                ) : (
                  <SelectChildTypeForCreation
                    document={parentDocument}
                    objectType={objectType}
                    expectedChildTypes={ect.object_types}
                  />
                )
              )
            }
          </div>
        )
      })


    }} />

}


const CreateDocumentSuccess = ({
  action = ***REMOVED***created***REMOVED***,
}: {
  action?: ***REMOVED***created***REMOVED*** | ***REMOVED***updated***REMOVED***
}): ReactElement => {
  const [searchParams] = useSearchParams()
  const uuid = searchParams.get(***REMOVED***uuid***REMOVED***)
  const { data, isLoading, error } = useDocumentAndObjectTypeAndObjectTypeConfig(uuid ?? ***REMOVED******REMOVED***)
  const created = action === ***REMOVED***created***REMOVED***

  if (!uuid) {
    return <div>Invalid document ID</div>
  }


  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={data}>
      {data?.document && (
        <div className="flex flex-col p-10 gap-4 text-center">
          <h1 className="font-medium text-2xl">
            Document {created ? ***REMOVED***Created***REMOVED*** : ***REMOVED***Updated***REMOVED***} Successfully
          </h1>
          <ExpectedChildTypeSelector parentDocument={data.document} objectType={data.objectType} />
          <div className="flex flex-row gap-4 justify-center">
            <ERDDAPDatasetLoader document={data.document} />
          </div>
          <div className="flex flex-row gap-4 justify-center">
            <ButtonLink to={`/document`}>All documents</ButtonLink>

            <ButtonLink to={`/`}>Create another document</ButtonLink>
            <ButtonLink to={`/document/edit/${uuid}`}>Edit this document</ButtonLink>
          </div>
        </div>
      )}
    </ViewWithLoader>
  )
}

export const UpdateDocumentSuccess = (): ReactElement => {
  return <CreateDocumentSuccess action="updated" />
}

export default CreateDocumentSuccess
