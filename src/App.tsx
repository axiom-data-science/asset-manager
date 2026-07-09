import { Button } from '@/components/ui/button'
import SidebarLayout from '@/layouts/sidebar'
import { Loader } from 'lucide-react'
import { useEffect, type ReactElement } from 'react'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import { useAuth } from '@/auth/useAuth'
import { Route, Routes, useNavigate } from 'react-router-dom'
import ListDocuments from '@/manage/document/list'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  CreateDocumentFromForm,
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
import ImportSensorStationsPage from './import/sensor-stations'

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

function App(): ReactElement {
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

  const auth = useAuth()
  console.log(auth)

  return (
    <ErrorBoundary fallbackRender={fallbackRender}>
      <QueryClientProvider client={queryClient}>
        {auth.isLoading ? (
          <div className="p-20">
            <Button disabled={true}>
              <Loader className="animate-spin" />
            </Button>
          </div>
        ) : !auth.isAuthenticated ? (
          <Routes>
            <Route
              path="*"
              element={
                <div className="p-20">
                  <Button onClick={() => void auth.login()}>Log in</Button>
                </div>
              }
            />
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
                  <title>{makeSiteTitle('create document')}</title>
                  <SelectDocumentForm
                    returnToOnSuccess="/create-document-success"
                    documentCreatePath="/create-document"
                  />
                </SimpleLayout>
              }
            />
            <Route
              path="/manage"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle('manage')}</title>
                  <p>Main</p>
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
              path="/create-document-success"
              element={
                <SimpleLayout>
                  <title>{makeSiteTitle('document created')}</title>
                  <CreateDocumentSuccess />
                </SimpleLayout>
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
                    <ImportSensorStationsPage />
                  </SidebarLayout>
                }
              />
            </Route>
          </Routes>
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
