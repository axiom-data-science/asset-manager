import { Button } from '@/components/ui/button'
import SidebarLayout from '@/layouts/sidebar'
import { Loader } from 'lucide-react'
import { useEffect, type ReactElement } from 'react'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import { useAuth } from '@/auth/useAuth'
import { Route, Routes, useNavigate } from 'react-router-dom'
import ListDocuments from '@/manage/document/list'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AddDocument from '@/manage/document/create'
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


const Authed = (): ReactElement => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/');
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
      <div role="alert" className='p-20'>
        <p>Something went wrong:</p>
        <pre style={{ color: 'red' }}>{props.error instanceof Error ? props.error.message : String(props.error)}</pre>
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
            <div className='p-20'>
              <Button disabled={true}><Loader className='animate-spin' /></Button>
            </div>
            : !auth.isAuthenticated ?
              <Routes>
                <Route path="*" element={
                  <div className='p-20'>
                    <Button onClick={() => void auth.login()}>Log in</Button>
                  </div>
                } />
                <Route path="/loggedout" element={
                  <div className='p-20'>
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
                    <AddDocument />
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
