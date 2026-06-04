import { Link, useSearchParams } from 'react-router-dom'
import { useDocument } from './useDocument'
import { useState, type ReactElement } from 'react'
import { Button, Loader, utils, ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import type { IDocument } from '@/types/types'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'

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
      className={`${utils.createButtonClass({ variant: 'link' })}${disabled ? ' opacity-50 cursor-not-allowed' : ''}`}
      target={target}
    >
      {children}
      {target ? <ExternalLink /> : null}
    </Link>
  )
}

const getERDDAPDatasetQueryKey = (uuid: string) => ['erddap-dataset', uuid]

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
    initialERDDAPDatasetId === (document.data as { 'station-id'?: string })['station-id']
      ? initialERDDAPDatasetId
      : null
  )
  const onSubmit = async () => {
    setLoading(true)
    //await new Promise((resolve) => setTimeout(resolve, 2000))
    const o = {
      acdd: `https://stage-asset-docs-postgrest.srv.axds.co/document?uuid=eq.${uuid}&select=id:data->>station-id,infoUrl:data->>info_url,Conventions:data->>conventions,creator_institution:data->>creator_institution,cdm_data_type:data->>cdm_data_type,contributor_email:data->>contributor_email,contributor_url:data->>contributor_url,contributor_role:data->>contributor_role,contributor_role_vocabulary:data->>contributor_role_vocabulary,creator_country:data->>creator_country,creator_email:data->>creator_email,creator_institution:data->>creator_institution,creator_name:data->>creator_name,creator_sector:data->>creator_sector,creator_type:data->>creator_type,creator_url:data->>creator_url,Easternmost_Easting:data->geometry->coordinates->0,Westernmost_Easting:data->geometry->coordinates->0,Northernmost_Northing:data->geometry->coordinates->1,Southernmost_Northing:data->geometry->coordinates->1,sourceUrl:data->>source_url,featureType:data->>feature_type,time_coverage_end:data->>time_coverage_end,time_coverage_start:data->>time_coverage_start,geospatial_lat_max:data->geometry->coordinates->1,geospatial_lat_min:data->geometry->coordinates->1,geospatial_lon_max:data->geometry->coordinates->0,geospatial_lon_min:data->geometry->coordinates->0`,
      sample_file: `https://stage-asset-docs-postgrest.srv.axds.co/document?uuid=eq.${uuid}&select=file_uri:data-%3Esample_file-%3E%3Efile_uri,headers:data-%3Esample_file-%3Eheaders`,
    }

    console.log(o)
    const j = await (
      await fetch(`https://demo-erddapper.srv.axds.co/datasets/${uuid}`, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(o),
        method: 'POST',
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
            {loading ? <Loader className="w-4 h-4" /> : ''}{' '}
            {erddapDatasetID ? 'Update sample file on ERDDAP' : 'Submit sample file to ERDDAP'}
          </Button>
          {erddapDatasetID && (
            <ButtonLink
              to={`https://erddapper-demo-erddap.srv.axds.co/erddap/tabledap/${erddapDatasetID}.html`}
              target="_blank"
            >
              View in ERDDAP
            </ButtonLink>
          )}
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
        const xmlDoc = parser.parseFromString(datasetXMLString, 'text/xml')
        const attrByName = Object.fromEntries(
          Array.from(
            xmlDoc.getElementsByTagName('addAttributes')[0].getElementsByTagName('att')
          ).map((d) => [d.getAttribute('name'), d.childNodes[0]?.nodeValue])
        )
        return {
          erddapDatasetId: attrByName['id'] ?? null,
        }
      } catch (error) {
        console.warn('Failed to load ERDDAP dataset info', error)
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
  action = 'created',
}: {
  action?: 'created' | 'updated'
}): ReactElement => {
  const [searchParams] = useSearchParams()
  const uuid = searchParams.get('uuid')
  const { data: document, isLoading, error } = useDocument(uuid ?? '')
  const created = action === 'created'

  if (!uuid) {
    return <div>Invalid document ID</div>
  }

  return (
    <ViewWithLoader isLoading={isLoading} error={error} data={document}>
      {document && (
        <div className="flex flex-col p-10 gap-4 text-center">
          <h1 className="font-medium text-2xl">
            Document {created ? 'Created' : 'Updated'} Successfully
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
