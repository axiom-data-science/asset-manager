import { Button } from '@/components/ui/button'
import SidebarLayout from '@/layouts/sidebar'
import { Loader } from 'lucide-react'
import { useEffect, type ReactElement } from 'react'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import { useAuth } from '@/auth/useAuth'
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom'
import ListDocuments from '@/manage/documents/list'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'


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


  return (
    <ErrorBoundary fallbackRender={fallbackRender}>
      <QueryClientProvider client={queryClient}>
        {
          auth.isLoading ?
            <Loader />
            : !auth.isAuthenticated ?
              <Button onClick={() => void auth.login()}>Log in</Button>
              : <BrowserRouter>
                <Routes>
                  <Route path="/authed" element={
                    <Authed />
                  } />
                  <Route path="/" element={
                    <SidebarLayout><p>Main</p></SidebarLayout>
                  } />
                  <Route path="/documents" element={
                    <SidebarLayout>
                      <ListDocuments />
                    </SidebarLayout>
                  } />
                  <Route path="/schemas" element={
                    <SidebarLayout><p>Schemas</p></SidebarLayout>
                  } />
                </Routes>
              </BrowserRouter>
        }
      </QueryClientProvider>

    </ErrorBoundary>
  )
}

export default App
