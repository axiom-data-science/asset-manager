import { Button } from '@/components/ui/button'
import SidebarLayout from '@/layouts/sidebar'
import { Loader } from 'lucide-react'
import { useEffect, type ReactElement } from 'react'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import { useAuth } from '@/auth/useAuth'
import { Route, Routes, useNavigate } from 'react-router-dom'
import ListDocuments from '@/manage/document/list'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import {
  CreateChildDocumentFromObjectType,
  CreateDocumentFromForm,
  CreateDocumentFromObjectType,
  CreateDocumentFromSchema,
  SelectDocumentForm,
} from '@/manage/document/create'
import CreateObjectType from '@/manage/object_type/create'
import ListObjectTypes from '@/manage/object_type/list'
import EditObjectType from '@/manage/object_type/edit'
import CreateObjectSchema from '@/manage/object_schema/create'
import ListObjectSchemas from '@/manage/object_schema/list'
import CreateFormLoader from './manage/form/create'
import ListForm from './manage/form/list'
import EditFormLoader from './manage/form/edit'
import EditDocument from './manage/document/edit'
import EditObjectSchema from '@/manage/object_schema/edit'
import ListFieldConfigs from '@/manage/field_config/list'
import UploadFile from '@/manage/document_file/upload_file'
import SimpleLayout from './layouts/simple'
import PipelineList from '@/manage/custom/pipeline/list'
import CreateDocumentSuccess from './manage/document/create_success'
import PersonsList from './manage/person/list'
import LockDocuments from '@/examples/lock-document'
import ShareDocuments from '@/examples/share-documents'
import PopoverTest from '@/examples/popover-test'
import AuthentikUsers from '@/examples/authentik-users'
import { SITE_TITLE } from './config/config'
import ListFilesLoader from './manage/document_file/list'
import ImportRecordsPage from './import/pages'
import {
  binninatorMetadata,
  binninatorRecords,
  binninatorRoot,
  defaultBinninatorRecordsURL,
  defaultOikosModelsURL,
  movingPlatform,
  OIKOS_URL_ROOT,
  oikosLayer,
  oikosLayerGroup,
  oikosModel,
  oikosModels,
  oikosModelVariable,
  oikosModelVariables,
  oikosModule,
  oikosVectorLayerGroups,
  oikosVectorLayers,
  oikosVectorModules,
  PLATFORM_ROOT,
  searchDocs,
  searchURL,
  SENSORS_ROOT,
  sensorStation,
} from '@/import/services'
import { getBrand } from '@/lib/utils'
import { getBrandComponent, type BrandComponentProps } from '@/BrandComponents'
import { fetchPredicates } from '@/manage/document/services'
import { fetchObjectCategories, fetchObjectTypes } from '@/manage/object_type/services'
import { fetchObjectSchemas } from '@/manage/object_schema/services'
import { ViewWithLoader } from '@axdspub/axiom-ui-utilities'
import { fetchForms } from '@/manage/form/services'
import contextStateAtom from '@/state/contextStateAtom'
import { useAtom } from 'jotai'
import type { IAssetForm } from '@/types/types'

const makeSiteTitle = (pageTitle?: string) => {
  return `${SITE_TITLE}${pageTitle ? ` - ${pageTitle}` : ''}`
}

const Authed = (): ReactElement => {
  const navigate = useNavigate()
  const auth = useAuth()

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      if (auth.isAdmin) {
        navigate('/manage')
      } else {
        navigate('/')
      }
    }
  }, [navigate, auth.isLoading, auth.isAuthenticated, auth.isAdmin])
  return <></>
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 0, // set to fairly short
    },
  },
})

const Header = ({ brand }: { brand?: string }): ReactElement => {
  brand = brand ?? getBrand()
  const BrandHeader = getBrandComponent(brand, 'Header')
  if (BrandHeader) {
    return BrandHeader
  }
  return <></>
}

const EntryPage = ({ brand }: { brand?: string }): ReactElement => {
  brand = brand ?? getBrand()
  const props: BrandComponentProps['EntryPage'] = {
    returnToOnSuccess: '/create-document-success',
    documentCreatePath: '/create-document',
  }
  const BrandEntryPage = getBrandComponent(brand, 'EntryPage', props)

  if (BrandEntryPage) {
    return BrandEntryPage
  }
  return (
    <>
      <title>{makeSiteTitle('create document')}</title>
      <SelectDocumentForm {...props} />
    </>
  )
}

const LoginPage = ({ brand }: { brand?: string }): ReactElement => {
  brand = brand ?? getBrand()
  const auth = useAuth()
  const BrandLoginPage = getBrandComponent(brand, 'LoginPage')
  if (BrandLoginPage) {
    return BrandLoginPage
  }

  return (
    <div className="p-20">
      <Button onClick={() => void auth.login()}>Log in</Button>
    </div>
  )
}

const DocumentSuccessPage = ({ brand }: { brand?: string }): ReactElement => {
  brand = brand ?? getBrand()
  const props: BrandComponentProps['DocumentSuccessPage'] = {
    action: 'created',
  }
  const BrandDocumentSuccessPage = getBrandComponent(brand, 'DocumentSuccessPage', props)
  if (BrandDocumentSuccessPage) {
    return BrandDocumentSuccessPage
  }
  return <CreateDocumentSuccess {...props} />
}

function App(): ReactElement {


  const auth = useAuth()
  console.log(auth)

  return (
    <>
      <Header />
      <>
        {auth.isLoading ? (
          <div className="p-20">
            <Button disabled={true}>
              <Loader className="animate-spin" />
            </Button>
          </div>
        ) : !auth.isAuthenticated ? (
          <Routes>
            <Route path="*" element={<LoginPage />} />
            <Route
              path="/loggedout"
              element={
                <div className="p-20">
                  <h1>You have been logged out</h1>
                  <Button onClick={() => void auth.login()}>Log in again</Button>
                </div>
              }
            />
          </Routes>
        ) : (
          <Routes>
            <Route
              path="/authed"
              element={
                <>
                  <title>{makeSiteTitle('authorized')}</title>
                  <Authed />
                </>
              }
            />
            <Route
              path="/"
              element={
                <SimpleLayout>
                  <EntryPage />
                </SimpleLayout>
              }
            />
            <Route
              path="/manage"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('create document')}</title>
                  <SelectDocumentForm />
                </SidebarLayout>
              }
            />

            <Route
              path="/document"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('documents')}</title>
                  <ListDocuments />
                </SidebarLayout>
              }
            />
            <Route
              path="/document/create"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('create document')}</title>
                  <SelectDocumentForm />
                </SidebarLayout>
              }
            />

            <Route
              path="/create-document"
              element={
                <SimpleLayout>
                  <title>{makeSiteTitle('create document')}</title>
                  <SelectDocumentForm
                    returnToOnSuccess="/create-document-success"
                    documentCreatePath="/create-document"
                  />
                </SimpleLayout>
              }
            />

            <Route
              path="/create-document/:parent_document_uuid/:expected_predicate/expected-predicate/:child_object_type_uuid/object_type"
              element={
                <SimpleLayout>
                  <title>{makeSiteTitle('create document')}</title>
                  <CreateChildDocumentFromObjectType />
                </SimpleLayout>
              }
            />

            <Route
              path="/edit-document/:uuid"
              element={
                <SimpleLayout>
                  <title>{makeSiteTitle('edit document')}</title>
                  <EditDocument />
                </SimpleLayout>
              }
            />

            <Route
              path="/create-document-success"
              element={
                <SimpleLayout>
                  <title>{makeSiteTitle('document created')}</title>
                  <DocumentSuccessPage />
                </SimpleLayout>
              }
            />

            <Route
              path='/submit-document'
              element={
                <div className='bg-slate-100 p-20 shadow-md m-10 mt-20'>
                  <h1 className='text-lg font-medium'>Submitted!</h1>
                </div>
              }
            />

            <Route
              path="/document/create/:object_schema_uuid/object_schema"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('create document from schema')}</title>
                  <CreateDocumentFromSchema />
                </SidebarLayout>
              }
            />
            <Route
              path="/create-document/:object_schema_uuid/object_schema"
              element={
                <SimpleLayout>
                  <title>{makeSiteTitle('create document from schema')}</title>
                  <CreateDocumentFromSchema returnToOnSuccess="/create-document-success" />
                </SimpleLayout>
              }
            />

            <Route
              path="/document/create/:object_type_uuid/object_type"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('create document from object type')}</title>
                  <CreateDocumentFromObjectType />
                </SidebarLayout>
              }
            />

            <Route
              path="/create-document/:object_type_uuid/object_type"
              element={
                <SimpleLayout>
                  <title>{makeSiteTitle('create document from object type')}</title>
                  <CreateDocumentFromObjectType />
                </SimpleLayout>
              }
            />

            <Route
              path="/document/create/:object_type_uuid/object_type/:form_uuid/form"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('create document from form')}</title>
                  <CreateDocumentFromForm />
                </SidebarLayout>
              }
            />

            <Route
              path="/create-document/:object_type_uuid/object_type/:form_uuid/form"
              element={
                <SimpleLayout>
                  <title>{makeSiteTitle('create document from form')}</title>
                  <CreateDocumentFromForm />
                </SimpleLayout>
              }
            />

            <Route
              path="/create-document/:object_schema_uuid/object_schema/:form_uuid/form"
              element={
                <SimpleLayout>
                  <title>{makeSiteTitle('create document from form')}</title>
                  <CreateDocumentFromForm returnToOnSuccess="/create-document-success" />
                </SimpleLayout>
              }
            />

            <Route
              path="/document/edit/:uuid"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('edit document')}</title>
                  <EditDocument />
                </SidebarLayout>
              }
            />

            <Route
              path="/schema"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('schemas')}</title>
                  <p>Schemas</p>
                </SidebarLayout>
              }
            />

            <Route
              path="/object_type"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('object types')}</title>
                  <ListObjectTypes />
                </SidebarLayout>
              }
            />
            <Route
              path="/object_type/create"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('create object type')}</title>
                  <CreateObjectType />
                </SidebarLayout>
              }
            />
            <Route
              path="/object_type/edit/:uuid"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('edit object type')}</title>
                  <EditObjectType />
                </SidebarLayout>
              }
            />

            <Route
              path="/object_schema"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('object schemas')}</title>
                  <ListObjectSchemas />
                </SidebarLayout>
              }
            />
            <Route
              path="/object_schema/create"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('create object schema')}</title>
                  <CreateObjectSchema />
                </SidebarLayout>
              }
            />
            <Route
              path="/object_schema/edit/:uuid"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('edit object schema')}</title>
                  <EditObjectSchema />
                </SidebarLayout>
              }
            />

            <Route
              path="/forms"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('forms')}</title>
                  <ListForm />
                </SidebarLayout>
              }
            />
            <Route
              path="/forms/create"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('create form')}</title>
                  <CreateFormLoader />
                </SidebarLayout>
              }
            />

            <Route
              path="/forms/edit/:uuid"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('edit form')}</title>
                  <EditFormLoader />
                </SidebarLayout>
              }
            />

            <Route
              path="/field_configs"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('field configs')}</title>
                  <ListFieldConfigs />
                </SidebarLayout>
              }
            />

            {/* <Route path="/field_configs/edit/:uuid" element={
                  <SidebarLayout><EditFieldConfig /></SidebarLayout>
                } /> */}

            <Route
              path="/file/upload"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('upload file')}</title>
                  <UploadFile />
                </SidebarLayout>
              }
            />

            <Route
              path="/file/list"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('list files')}</title>
                  <ListFilesLoader />
                </SidebarLayout>
              }
            />

            <Route
              path="/persons"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('persons')}</title>
                  <PersonsList />
                </SidebarLayout>
              }
            />

            <Route
              path="/custom/pipelines"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('list custom pipelines')}</title>
                  <PipelineList />
                </SidebarLayout>
              }
            />
            <Route path="examples">
              <Route
                path="lock-unlock-documents"
                element={
                  <SidebarLayout>
                    <title>{makeSiteTitle('lock/unlock documents example')}</title>
                    <LockDocuments />
                  </SidebarLayout>
                }
              />
              <Route
                path="share-document"
                element={
                  <SidebarLayout>
                    <title>{makeSiteTitle('share document example')}</title>
                    <ShareDocuments />
                  </SidebarLayout>
                }
              />
              <Route path="popover" element={<PopoverTest />} />
              <Route
                path="authentik-users"
                element={
                  <SidebarLayout>
                    <title>{makeSiteTitle('authentik users')}</title>
                    <AuthentikUsers />
                  </SidebarLayout>
                }
              />
            </Route>
            <Route path="import">
              <Route
                path="sensor-stations"
                element={
                  <SidebarLayout>
                    <ImportRecordsPage
                      defaultImportUrl={searchURL({
                        type: 'sensor_station',
                        count: 100,
                        portal_id: 25,
                      })}
                      defaultDetailRoot={SENSORS_ROOT}
                      service={searchDocs}
                      getFullDoc={sensorStation}
                      label="Sensor Station"
                    />
                  </SidebarLayout>
                }
              />
              <Route
                path="moving-platforms"
                element={
                  <SidebarLayout>
                    <ImportRecordsPage
                      defaultImportUrl={searchURL({ type: 'platform2', count: 100, portal_id: 25 })}
                      service={searchDocs}
                      defaultDetailRoot={PLATFORM_ROOT}
                      getFullDoc={movingPlatform}
                      label="Moving Platform"
                    />
                  </SidebarLayout>
                }
              />
              <Route
                path="oikos-models"
                element={
                  <SidebarLayout>
                    <ImportRecordsPage
                      defaultImportUrl={defaultOikosModelsURL}
                      service={oikosModels}
                      defaultDetailRoot={'UNUSED'}
                      getFullDoc={oikosModel}
                      label="Oikos Model"
                    />
                  </SidebarLayout>
                }
              />
              <Route
                path="oikos-model-variables"
                element={
                  <SidebarLayout>
                    <ImportRecordsPage
                      defaultImportUrl={defaultOikosModelsURL}
                      service={oikosModelVariables}
                      defaultDetailRoot={'UNUSED'}
                      getFullDoc={oikosModelVariable}
                      label="Oikos Model Variable"
                    />
                  </SidebarLayout>
                }
              />
              <Route
                path="binner-records"
                element={
                  <SidebarLayout>
                    <ImportRecordsPage
                      defaultImportUrl={defaultBinninatorRecordsURL}
                      service={binninatorRecords}
                      defaultDetailRoot={binninatorRoot}
                      getFullDoc={binninatorMetadata}
                      label="Binner Record"
                    />
                  </SidebarLayout>
                }
              />
              <Route
                path="oikos-vector-layers"
                element={
                  <SidebarLayout>
                    <ImportRecordsPage
                      defaultImportUrl={searchURL({
                        type: 'layer_group',
                        count: 100,
                        portal_id: 25,
                      })}
                      service={oikosVectorLayers}
                      defaultDetailRoot={OIKOS_URL_ROOT}
                      getFullDoc={oikosLayer}
                      label="Oikos Vector Layer"
                    />
                  </SidebarLayout>
                }
              />
              <Route
                path="oikos-vector-layer-groups"
                element={
                  <SidebarLayout>
                    <ImportRecordsPage
                      defaultImportUrl={searchURL({
                        type: 'layer_group',
                        count: 100,
                        portal_id: 25,
                      })}
                      service={oikosVectorLayerGroups}
                      defaultDetailRoot={OIKOS_URL_ROOT}
                      getFullDoc={oikosLayerGroup}
                      label="Oikos Vector Layer Group"
                    />
                  </SidebarLayout>
                }
              />
              <Route
                path="oikos-vector-modules"
                element={
                  <SidebarLayout>
                    <ImportRecordsPage
                      defaultImportUrl={searchURL({
                        type: 'layer_group',
                        count: 100,
                        portal_id: 25,
                      })}
                      service={oikosVectorModules}
                      defaultDetailRoot={OIKOS_URL_ROOT}
                      getFullDoc={oikosModule}
                      label="Oikos  Module"
                    />
                  </SidebarLayout>
                }
              />
            </Route>
          </Routes>
        )}
      </>
    </>
  )
}

const AppPreload = (): ReactElement => {
  const [contextState, setContextState] = useAtom(contextStateAtom)
  const { data, isLoading, error } = useQuery({
    queryKey: ['preload'],
    queryFn: async ({ signal }) => {
      const predicates = await fetchPredicates({ signal })
      const object_types = await fetchObjectTypes({ signal })
      const object_schemas = await fetchObjectSchemas({ signal })
      const object_categories = await fetchObjectCategories({ signal })
      const forms = await fetchForms({ signal })

      const object_types_by_uuid = Object.fromEntries(object_types.map((ot) => [ot.uuid, ot]))
      const object_schemas_by_uuid = Object.fromEntries(object_schemas.map((os) => [os.uuid, os]))
      const forms_by_uuid = Object.fromEntries(forms.map((f) => [f.uuid, f]))
      const forms_by_object_type_uuid: Record<string, IAssetForm[]> = {}
      for (const ot of object_types) {
        const forms_for_ot = forms.filter((f) => f.object_type_uuid === ot.uuid)
        if (forms_for_ot.length > 0) {
          forms_by_object_type_uuid[ot.uuid] = forms_for_ot
        }
      }


      const newContextState = {
        predicates,
        predicates_by_uuid: Object.fromEntries(predicates.map((p) => [p.uuid, p])),
        predicates_by_predicate: Object.fromEntries(predicates.map((p) => [p.predicate, p])),
        object_types,
        object_types_by_uuid,
        object_types_by_slug: Object.fromEntries(object_types.map((ot) => [ot.slug, ot])),
        object_schemas,
        object_schemas_by_uuid,
        object_schemas_by_slug: Object.fromEntries(object_schemas.map((os) => [os.slug, os])),
        object_schema_defaults_by_object_type_uuid: Object.fromEntries(
          object_schemas.filter(s => s.is_type_default).map((os) => [os.object_type_uuid, os])
        ),
        object_categories,
        forms,
        forms_by_uuid,
        forms_by_slug: Object.fromEntries(forms.map((f) => [f.slug, f])),
        form_defaults_by_object_type_uuid: Object.fromEntries(
          forms.filter(f => f.is_schema_and_version_default).map((f) => [f.object_type_uuid, f])
        ),
        forms_by_object_type_uuid,
        loaded: true
      }
      setContextState(newContextState)
      return newContextState
    }
  })
  return <ViewWithLoader isLoading={isLoading} error={error} data={data}>
    {data && contextState.loaded &&
      <App />
    }
  </ViewWithLoader>
}

const AppBoundary = (): ReactElement => {
  function fallbackRender(props: FallbackProps): ReactElement {
    // Call resetErrorBoundary() to reset the error boundary and retry the render.

    return (
      <div role="alert" className="p-20">
        <p>Something went wrong:</p>
        <pre style={{ color: 'red' }}>
          {props.error instanceof Error ? props.error.message : String(props.error)}
        </pre>
      </div>
    )
  }
  return <ErrorBoundary fallbackRender={fallbackRender}>
    <QueryClientProvider client={queryClient}>
      <AppPreload />
    </QueryClientProvider>
  </ErrorBoundary>
}

export default AppBoundary
