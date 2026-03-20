import SidebarLayout from '@/layouts/sidebar'
import { type ReactElement } from 'react'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

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
