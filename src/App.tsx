import { Button } from ***REMOVED***@/components/ui/button***REMOVED***
import SidebarLayout from ***REMOVED***@/layouts/sidebar***REMOVED***
import { Loader } from ***REMOVED***lucide-react***REMOVED***
import { useEffect, type ReactElement } from ***REMOVED***react***REMOVED***
import { ErrorBoundary, type FallbackProps } from ***REMOVED***react-error-boundary***REMOVED***
import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { Route, Routes, useNavigate } from ***REMOVED***react-router-dom***REMOVED***
import ListDocuments from ***REMOVED***@/manage/document/list***REMOVED***
import { QueryClient, QueryClientProvider } from ***REMOVED***@tanstack/react-query***REMOVED***
import {
  CreateDocumentFromForm,
  CreateDocumentFromSchema,
  SelectDocumentForm,
} from ***REMOVED***@/manage/document/create***REMOVED***
import CreateObjectType from ***REMOVED***@/manage/object_type/create***REMOVED***
import ListObjectTypes from ***REMOVED***@/manage/object_type/list***REMOVED***
import EditObjectType from ***REMOVED***@/manage/object_type/edit***REMOVED***
import CreateObjectSchema from ***REMOVED***@/manage/object_schema/create***REMOVED***
import ListObjectSchemas from ***REMOVED***@/manage/object_schema/list***REMOVED***
import CreateFormLoader from ***REMOVED***./manage/form/create***REMOVED***
import ListForm from ***REMOVED***./manage/form/list***REMOVED***
import EditFormLoader from ***REMOVED***./manage/form/edit***REMOVED***
import EditDocument from ***REMOVED***./manage/document/edit***REMOVED***
import EditObjectSchema from ***REMOVED***@/manage/object_schema/edit***REMOVED***
import ListFieldConfigs from ***REMOVED***@/manage/field_config/list***REMOVED***
import UploadFile from ***REMOVED***@/manage/document_file/upload_file***REMOVED***
import SimpleLayout from ***REMOVED***./layouts/simple***REMOVED***
import PipelineList from ***REMOVED***@/manage/custom/pipeline/list***REMOVED***
import CreateDocumentSuccess from ***REMOVED***./manage/document/create_success***REMOVED***
import PersonsList from ***REMOVED***./manage/person/list***REMOVED***
import LockDocuments from ***REMOVED***@/examples/lock-document***REMOVED***
import ShareDocuments from ***REMOVED***@/examples/share-document***REMOVED***
import PopoverTest from ***REMOVED***@/examples/popover-test***REMOVED***
import AuthentikUsers from ***REMOVED***@/examples/authentik-users***REMOVED***

const Authed = (): ReactElement => {
  const navigate = useNavigate()

  useEffect(() => {
    navigate(***REMOVED***/***REMOVED***)
  }, [navigate])
  return <></>
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})

function App(): ReactElement {
  function fallbackRender(props: FallbackProps): ReactElement {
    // Call resetErrorBoundary() to reset the error boundary and retry the render.

    return (
      <div role="alert" className="p-20">
        <p>Something went wrong:</p>
        <pre style={{ color: ***REMOVED***red***REMOVED*** }}>
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
            <Route path="/authed" element={<Authed />} />
            <Route
              path="/"
              element={
                <SimpleLayout>
                  <SimpleLayout>
                    <SelectDocumentForm
                      returnToOnSuccess="/create-document-success"
                      documentCreatePath="/create-document"
                    />
                  </SimpleLayout>
                </SimpleLayout>
              }
            />
            <Route
              path="/manage"
              element={
                <SidebarLayout>
                  <p>Main</p>
                </SidebarLayout>
              }
            />

            <Route
              path="/document"
              element={
                <SidebarLayout>
                  <ListDocuments />
                </SidebarLayout>
              }
            />
            <Route
              path="/document/create"
              element={
                <SidebarLayout>
                  <SelectDocumentForm />
                </SidebarLayout>
              }
            />

            <Route
              path="/create-document"
              element={
                <SimpleLayout>
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
                  <CreateDocumentSuccess />
                </SimpleLayout>
              }
            />

            <Route
              path="/document/create/:object_schema_uuid/object_schema"
              element={
                <SidebarLayout>
                  <CreateDocumentFromSchema />
                </SidebarLayout>
              }
            />
            <Route
              path="/create-document/:object_schema_uuid/object_schema"
              element={
                <SimpleLayout>
                  <CreateDocumentFromSchema returnToOnSuccess="/create-document-success" />
                </SimpleLayout>
              }
            />

            <Route
              path="/document/create/:object_type_uuid/object_type/:form_uuid/form"
              element={
                <SidebarLayout>
                  <CreateDocumentFromForm />
                </SidebarLayout>
              }
            />

            <Route
              path="/create-document/:object_type_uuid/object_type/:form_uuid/form"
              element={
                <SimpleLayout>
                  <CreateDocumentFromForm />
                </SimpleLayout>
              }
            />

            <Route
              path="/create-document/:object_schema_uuid/object_schema/:form_uuid/form"
              element={
                <SimpleLayout>
                  <CreateDocumentFromForm returnToOnSuccess="/create-document-success" />
                </SimpleLayout>
              }
            />

            <Route
              path="/document/edit/:uuid"
              element={
                <SidebarLayout>
                  <EditDocument />
                </SidebarLayout>
              }
            />

            <Route
              path="/schema"
              element={
                <SidebarLayout>
                  <p>Schemas</p>
                </SidebarLayout>
              }
            />

            <Route
              path="/object_type"
              element={
                <SidebarLayout>
                  <ListObjectTypes />
                </SidebarLayout>
              }
            />
            <Route
              path="/object_type/create"
              element={
                <SidebarLayout>
                  <CreateObjectType />
                </SidebarLayout>
              }
            />
            <Route
              path="/object_type/edit/:uuid"
              element={
                <SidebarLayout>
                  <EditObjectType />
                </SidebarLayout>
              }
            />

            <Route
              path="/object_schema"
              element={
                <SidebarLayout>
                  <ListObjectSchemas />
                </SidebarLayout>
              }
            />
            <Route
              path="/object_schema/create"
              element={
                <SidebarLayout>
                  <CreateObjectSchema />
                </SidebarLayout>
              }
            />
            <Route
              path="/object_schema/edit/:uuid"
              element={
                <SidebarLayout>
                  <EditObjectSchema />
                </SidebarLayout>
              }
            />

            <Route
              path="/forms"
              element={
                <SidebarLayout>
                  <ListForm />
                </SidebarLayout>
              }
            />
            <Route
              path="/forms/create"
              element={
                <SidebarLayout>
                  <CreateFormLoader />
                </SidebarLayout>
              }
            />

            <Route
              path="/forms/edit/:uuid"
              element={
                <SidebarLayout>
                  <EditFormLoader />
                </SidebarLayout>
              }
            />

            <Route
              path="/field_configs"
              element={
                <SidebarLayout>
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
                  <UploadFile />
                </SidebarLayout>
              }
            />

            <Route
              path="/file/list"
              element={
                <SidebarLayout>
                  <UploadFile />
                </SidebarLayout>
              }
            />

            <Route
              path="/persons"
              element={
                <SidebarLayout>
                  <PersonsList />
                </SidebarLayout>
              }
            />

            <Route
              path="/custom/pipelines"
              element={
                <SidebarLayout>
                  <PipelineList />
                </SidebarLayout>
              }
            />
            <Route path="examples">
              <Route path="lock-unlock-documents" element={<SidebarLayout><LockDocuments /></SidebarLayout>} />
              <Route path="share-document" element={<SidebarLayout><ShareDocuments /></SidebarLayout>} />
              <Route path="popover" element={<PopoverTest />} />
              <Route path="authentik-users" element={<SidebarLayout><AuthentikUsers /></SidebarLayout>} />
            </Route>
          </Routes>
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
