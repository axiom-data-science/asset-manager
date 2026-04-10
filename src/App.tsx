import { Button } from ***REMOVED***@/components/ui/button***REMOVED***
import SidebarLayout from ***REMOVED***@/layouts/sidebar***REMOVED***
import { Loader } from ***REMOVED***lucide-react***REMOVED***
import { useEffect, type ReactElement } from ***REMOVED***react***REMOVED***
import { ErrorBoundary, type FallbackProps } from ***REMOVED***react-error-boundary***REMOVED***
import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { Route, Routes, useNavigate } from ***REMOVED***react-router-dom***REMOVED***
import ListDocuments from ***REMOVED***@/manage/document/list***REMOVED***
import { QueryClient, QueryClientProvider } from ***REMOVED***@tanstack/react-query***REMOVED***
import { CreateDocumentFromForm, CreateDocumentFromSchema, SelectDocumentForm } from ***REMOVED***@/manage/document/create***REMOVED***
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


const Authed = (): ReactElement => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(***REMOVED***/***REMOVED***);
  }, [navigate]);
  return (
    <></>
  )
}


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false
    }
  }
})

function App(): ReactElement {

  function fallbackRender(props: FallbackProps): ReactElement {
    // Call resetErrorBoundary() to reset the error boundary and retry the render.

    return (
      <div role="alert" className=***REMOVED***p-20***REMOVED***>
        <p>Something went wrong:</p>
        <pre style={{ color: ***REMOVED***red***REMOVED*** }}>{props.error instanceof Error ? props.error.message : String(props.error)}</pre>
      </div>
    )
  }

  const auth = useAuth();
  console.log(auth)


  return (
    <ErrorBoundary fallbackRender={fallbackRender}>
      <QueryClientProvider client={queryClient}>

        {
          auth.isLoading ?
            <div className=***REMOVED***p-20***REMOVED***>
              <Button disabled={true}><Loader className=***REMOVED***animate-spin***REMOVED*** /></Button>
            </div>
            : !auth.isAuthenticated ?
              <Routes>
                <Route path="*" element={
                  <div className=***REMOVED***p-20***REMOVED***>
                    <Button onClick={() => void auth.login()}>Log in</Button>
                  </div>
                } />
                <Route path="/loggedout" element={
                  <div className=***REMOVED***p-20***REMOVED***>
                    <h1>You have been logged out</h1>
                    <Button onClick={() => void auth.login()}>Log in again</Button>
                  </div>
                } />
              </Routes>
              : <Routes>
                <Route path="/authed" element={
                  <Authed />
                } />
                <Route path="/" element={
                  <SidebarLayout><p>Main</p></SidebarLayout>
                } />

                <Route path="/document" element={
                  <SidebarLayout>
                    <ListDocuments />
                  </SidebarLayout>
                } />
                <Route path="/document/create" element={
                  <SidebarLayout>
                    <SelectDocumentForm />
                  </SidebarLayout>
                } />

                <Route path="/document/create/:object_schema_uuid/object_schema" element={
                  <SidebarLayout>
                    <CreateDocumentFromSchema />
                  </SidebarLayout>
                } />


                <Route path="/document/create/:object_type_uuid/object_type/:form_uuid/form" element={
                  <SidebarLayout>
                    <CreateDocumentFromForm />
                  </SidebarLayout>
                } />

                <Route path="/document/edit/:uuid" element={
                  <SidebarLayout>
                    <EditDocument />
                  </SidebarLayout>
                } />



                <Route path="/schema" element={
                  <SidebarLayout><p>Schemas</p></SidebarLayout>
                } />


                <Route path="/object_type" element={
                  <SidebarLayout><ListObjectTypes /></SidebarLayout>
                } />
                <Route path="/object_type/create" element={
                  <SidebarLayout><CreateObjectType /></SidebarLayout>
                } />
                <Route path="/object_type/edit/:uuid" element={
                  <SidebarLayout><EditObjectType /></SidebarLayout>
                } />


                <Route path="/object_schema" element={
                  <SidebarLayout><ListObjectSchemas /></SidebarLayout>
                } />
                <Route path="/object_schema/create" element={
                  <SidebarLayout><CreateObjectSchema /></SidebarLayout>
                } />
                <Route path="/object_schema/edit/:uuid" element={
                  <SidebarLayout><EditObjectSchema /></SidebarLayout>
                } />


                <Route path="/forms" element={
                  <SidebarLayout><ListForm /></SidebarLayout>
                } />
                <Route path="/forms/create" element={
                  <SidebarLayout><CreateFormLoader /></SidebarLayout>
                } />

                <Route path="/forms/edit/:uuid" element={
                  <SidebarLayout><EditFormLoader /></SidebarLayout>
                } />


                <Route path="/field_configs" element={
                  <SidebarLayout><ListFieldConfigs /></SidebarLayout>
                } />

                {/* <Route path="/field_configs/edit/:uuid" element={
                  <SidebarLayout><EditFieldConfig /></SidebarLayout>
                } /> */}

              </Routes>

        }
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
