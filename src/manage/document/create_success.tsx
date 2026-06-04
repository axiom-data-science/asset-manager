import { Link, useSearchParams } from ***REMOVED***react-router-dom***REMOVED***
import { useDocument } from ***REMOVED***./useDocument***REMOVED***
import { useState, type ReactElement } from ***REMOVED***react***REMOVED***
import { Button, Loader, utils, ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import type { IDocument } from ***REMOVED***@/types/types***REMOVED***
import { useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***
import { ExternalLink } from ***REMOVED***lucide-react***REMOVED***

const ButtonLink = ({
  to,
  children,
  disabled,
  target,
}: {
  to: string
  children: React.ReactNode
  disabled?: boolean
  target?: string
}): ReactElement => {
  return (
    <Link
      to={to}
      className={`${utils.createButtonClass({ variant: ***REMOVED***link***REMOVED*** })}${disabled ? ***REMOVED*** opacity-50 cursor-not-allowed***REMOVED*** : ***REMOVED******REMOVED***}`}
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
    //await new Promise((resolve) => setTimeout(resolve, 2000))
    //lon:data-%3Egeometry-%3Ecoordinates-%3E0
    //lat:data-%3Egeometry-%3Ecoordinates-%3E1
    // id:data-%3E%3Estation-id,infoUrl:data-%3E%3Einfo_url,Conventions:data-%3E%3Econventions,creator_institution:data-%3E%3Ecreator_institution,cdm_data_type:data-%3E%3Ecdm_data_type,contributor_email:data-%3E%3Econtributor_email,contributor_url:data-%3E%3Econtributor_url,contributor_role:data-%3E%3Econtributor_role,contributor_role_vocabulary:data-%3E%3Econtributor_role_vocabulary,creator_country:data-%3E%3Ecreator_country,creator_email:data-%3E%3Ecreator_email,creator_institution:data-%3E%3Ecreator_institution,creator_name:data-%3E%3Ecreator_name,creator_sector:data-%3E%3Ecreator_sector,creator_type:data-%3E%3Ecreator_type,creator_url:data-%3E%3Ecreator_url,Easternmost_Easting:data->geometry->coordinates->0,Westernmost_Easting:data->geometry->coordinates->0,Northernmost_Northing:data->geometry->coordinates->1,Southernmost_Northing:data->geometry->coordinates->1,sourceUrl:data-%3E%3Esource_url,featureType:data-%3E%3Efeature_type,time_coverage_end:data-%3E%3Etime_coverage_end,time_coverage_start:data-%3E%3Etime_coverage_start,geospatial_lat_max:data->geometry->coordinates->1,geospatial_lat_min:data->geometry->coordinates->1,geospatial_lon_max:data->geometry->coordinates->0,geospatial_lon_min:data->geometry->coordinates->0
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

const CreateDocumentSuccess = ({
  action = ***REMOVED***created***REMOVED***,
}: {
  action?: ***REMOVED***created***REMOVED*** | ***REMOVED***updated***REMOVED***
}): ReactElement => {
  const [searchParams] = useSearchParams()
  const uuid = searchParams.get(***REMOVED***uuid***REMOVED***)
  const { data: document, isLoading, error } = useDocument(uuid ?? ***REMOVED******REMOVED***)
  const created = action === ***REMOVED***created***REMOVED***

  if (!uuid) {
    return <div>Invalid document ID</div>
  }

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={document}>
      {document && (
        <div className="flex flex-col p-10 gap-4 text-center">
          <h1 className="font-medium text-2xl">
            Document {created ? ***REMOVED***Created***REMOVED*** : ***REMOVED***Updated***REMOVED***} Successfully
          </h1>
          <div className="flex flex-row gap-4 justify-center">
            <ERDDAPDatasetLoader document={document} />
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
