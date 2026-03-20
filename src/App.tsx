import SidebarLayout from ***REMOVED***@/layouts/sidebar***REMOVED***
import { type ReactElement } from ***REMOVED***react***REMOVED***
import { ErrorBoundary, type FallbackProps } from ***REMOVED***react-error-boundary***REMOVED***
import { BrowserRouter, Route, Routes } from ***REMOVED***react-router-dom***REMOVED***

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



  return (
    <ErrorBoundary fallbackRender={fallbackRender}>

      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <SidebarLayout><p>Main</p></SidebarLayout>
          } />
          <Route path="/assets" element={
            <SidebarLayout><p>Assets</p></SidebarLayout>
          } />
          <Route path="/schemas" element={
            <SidebarLayout><p>Schemas</p></SidebarLayout>
          } />
        </Routes>
      </BrowserRouter>

    </ErrorBoundary>
  )
}

export default App
