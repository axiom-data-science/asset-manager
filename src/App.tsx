import { Button } from ***REMOVED***@/components/ui/button***REMOVED***
import SidebarLayout from ***REMOVED***@/layouts/sidebar***REMOVED***
import { Loader } from ***REMOVED***lucide-react***REMOVED***
import { useEffect, type ReactElement } from ***REMOVED***react***REMOVED***
import { ErrorBoundary, type FallbackProps } from ***REMOVED***react-error-boundary***REMOVED***
import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { BrowserRouter, Route, Routes, useNavigate } from ***REMOVED***react-router-dom***REMOVED***
import ListDocuments from ***REMOVED***@/manage/documents/list***REMOVED***
import { QueryClient, QueryClientProvider } from ***REMOVED***@tanstack/react-query***REMOVED***


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
