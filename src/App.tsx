import { Button } from ***REMOVED***@/components/ui/button***REMOVED***
import SidebarLayout from ***REMOVED***@/layouts/sidebar***REMOVED***
import { Loader } from ***REMOVED***lucide-react***REMOVED***
import { useEffect, type ReactElement } from ***REMOVED***react***REMOVED***
import { ErrorBoundary, type FallbackProps } from ***REMOVED***react-error-boundary***REMOVED***
import { useAuth } from ***REMOVED***@/auth/useAuth***REMOVED***
import { Route, Routes, useNavigate } from ***REMOVED***react-router-dom***REMOVED***
import ListDocuments from ***REMOVED***@/manage/document/list***REMOVED***
import { QueryClient, QueryClientProvider, keepPreviousData, useQuery } from ***REMOVED***@tanstack/react-query***REMOVED***
import {
  CreateChildDocumentFromObjectType,
  CreateDocumentFromForm,
  CreateDocumentFromObjectType,
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
import ShareDocuments from ***REMOVED***@/examples/share-documents***REMOVED***
import PopoverTest from ***REMOVED***@/examples/popover-test***REMOVED***
import AuthentikUsers from ***REMOVED***@/examples/authentik-users***REMOVED***
import { SITE_TITLE } from ***REMOVED***./config/config***REMOVED***
import ListFilesLoader from ***REMOVED***./manage/document_file/list***REMOVED***
import ImportRecordsPage from ***REMOVED***./import/pages***REMOVED***
import { getBrand } from ***REMOVED***@/lib/utils***REMOVED***
import { getBrandComponent, type BrandComponentProps } from ***REMOVED***@/BrandComponents***REMOVED***
import { fetchPredicates } from ***REMOVED***@/manage/document/services***REMOVED***
import { fetchObjectCategories, fetchObjectTypes } from ***REMOVED***@/manage/object_type/services***REMOVED***
import { fetchObjectSchemas } from ***REMOVED***@/manage/object_schema/services***REMOVED***
import { ViewWithLoader } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { fetchForms } from ***REMOVED***@/manage/form/services***REMOVED***
import contextStateAtom, { contextReloadTokenAtom } from ***REMOVED***@/state/contextStateAtom***REMOVED***
import { useAtom } from ***REMOVED***jotai***REMOVED***
import type { IAssetForm } from ***REMOVED***@/types/types***REMOVED***
import { fetchPersons } from ***REMOVED***@/manage/person/services***REMOVED***
import importConfigs from ***REMOVED***./import/config***REMOVED***
import ImportAllPage from ***REMOVED***./import/pages/all***REMOVED***
import ListRelationships from ***REMOVED***@/manage/relationship/list***REMOVED***
import EditRelationship from ***REMOVED***@/manage/relationship/edit***REMOVED***
import CreateRelationship from ***REMOVED***@/manage/relationship/create***REMOVED***

const makeSiteTitle = (pageTitle?: string) => {
  return `${SITE_TITLE}${pageTitle ? ` - ${pageTitle}` : ***REMOVED******REMOVED***}`
}

const Authed = (): ReactElement => {
  const navigate = useNavigate()
  const auth = useAuth()

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      if (auth.isAdmin) {
        navigate(***REMOVED***/manage***REMOVED***)
      } else {
        navigate(***REMOVED***/***REMOVED***)
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
  const BrandHeader = getBrandComponent(brand, ***REMOVED***Header***REMOVED***)
  if (BrandHeader) {
    return BrandHeader
  }
  return <></>
}

const EntryPage = ({ brand }: { brand?: string }): ReactElement => {
  brand = brand ?? getBrand()
  const props: BrandComponentProps[***REMOVED***EntryPage***REMOVED***] = {
    returnToOnSuccess: ***REMOVED***/create-document-success***REMOVED***,
    documentCreatePath: ***REMOVED***/create-document***REMOVED***,
  }
  const BrandEntryPage = getBrandComponent(brand, ***REMOVED***EntryPage***REMOVED***, props)

  if (BrandEntryPage) {
    return BrandEntryPage
  }
  return (
    <>
      <title>{makeSiteTitle(***REMOVED***create document***REMOVED***)}</title>
      <SelectDocumentForm {...props} />
    </>
  )
}

const LoginPage = ({ brand }: { brand?: string }): ReactElement => {
  brand = brand ?? getBrand()
  const auth = useAuth()
  const BrandLoginPage = getBrandComponent(brand, ***REMOVED***LoginPage***REMOVED***)
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
  const props: BrandComponentProps[***REMOVED***DocumentSuccessPage***REMOVED***] = {
    action: ***REMOVED***created***REMOVED***,
  }
  const BrandDocumentSuccessPage = getBrandComponent(brand, ***REMOVED***DocumentSuccessPage***REMOVED***, props)
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
                  <title>{makeSiteTitle(***REMOVED***authorized***REMOVED***)}</title>
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
                  <title>{makeSiteTitle(***REMOVED***create document***REMOVED***)}</title>
                  <SelectDocumentForm />
                </SidebarLayout>
              }
            />

            <Route
              path="/document"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***documents***REMOVED***)}</title>
                  <ListDocuments />
                </SidebarLayout>
              }
            />
            <Route
              path="/document/create"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***create document***REMOVED***)}</title>
                  <SelectDocumentForm />
                </SidebarLayout>
              }
            />

            <Route
              path="/create-document"
              element={
                <SimpleLayout>
                  <title>{makeSiteTitle(***REMOVED***create document***REMOVED***)}</title>
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
                  <title>{makeSiteTitle(***REMOVED***create document***REMOVED***)}</title>
                  <CreateChildDocumentFromObjectType />
                </SimpleLayout>
              }
            />

            <Route
              path="/edit-document/:uuid"
              element={
                <SimpleLayout>
                  <title>{makeSiteTitle(***REMOVED***edit document***REMOVED***)}</title>
                  <EditDocument />
                </SimpleLayout>
              }
            />

            <Route
              path="/create-document-success"
              element={
                <SimpleLayout>
                  <title>{makeSiteTitle(***REMOVED***document created***REMOVED***)}</title>
                  <DocumentSuccessPage />
                </SimpleLayout>
              }
            />

            <Route
              path="/submit-document"
              element={
                <div className="bg-slate-100 p-20 shadow-md m-10 mt-20">
                  <h1 className="text-lg font-medium">Submitted!</h1>
                </div>
              }
            />

            <Route
              path="/document/create/:object_schema_uuid/object_schema"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***create document from schema***REMOVED***)}</title>
                  <CreateDocumentFromSchema />
                </SidebarLayout>
              }
            />
            <Route
              path="/create-document/:object_schema_uuid/object_schema"
              element={
                <SimpleLayout>
                  <title>{makeSiteTitle(***REMOVED***create document from schema***REMOVED***)}</title>
                  <CreateDocumentFromSchema returnToOnSuccess="/create-document-success" />
                </SimpleLayout>
              }
            />

            <Route
              path="/document/create/:object_type_uuid/object_type"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***create document from object type***REMOVED***)}</title>
                  <CreateDocumentFromObjectType />
                </SidebarLayout>
              }
            />

            <Route
              path="/create-document/:object_type_uuid/object_type"
              element={
                <SimpleLayout>
                  <title>{makeSiteTitle(***REMOVED***create document from object type***REMOVED***)}</title>
                  <CreateDocumentFromObjectType />
                </SimpleLayout>
              }
            />

            <Route
              path="/document/create/:object_type_uuid/object_type/:form_uuid/form"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***create document from form***REMOVED***)}</title>
                  <CreateDocumentFromForm />
                </SidebarLayout>
              }
            />

            <Route
              path="/create-document/:object_type_uuid/object_type/:form_uuid/form"
              element={
                <SimpleLayout>
                  <title>{makeSiteTitle(***REMOVED***create document from form***REMOVED***)}</title>
                  <CreateDocumentFromForm />
                </SimpleLayout>
              }
            />

            <Route
              path="/create-document/:object_schema_uuid/object_schema/:form_uuid/form"
              element={
                <SimpleLayout>
                  <title>{makeSiteTitle(***REMOVED***create document from form***REMOVED***)}</title>
                  <CreateDocumentFromForm returnToOnSuccess="/create-document-success" />
                </SimpleLayout>
              }
            />

            <Route
              path="/document/edit/:uuid"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***edit document***REMOVED***)}</title>
                  <EditDocument />
                </SidebarLayout>
              }
            />

            <Route
              path="/schema"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***schemas***REMOVED***)}</title>
                  <p>Schemas</p>
                </SidebarLayout>
              }
            />

            <Route
              path="/object_type"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***object types***REMOVED***)}</title>
                  <ListObjectTypes />
                </SidebarLayout>
              }
            />
            <Route
              path="/object_type/create"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***create object type***REMOVED***)}</title>
                  <CreateObjectType />
                </SidebarLayout>
              }
            />
            <Route
              path="/object_type/edit/:uuid"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***edit object type***REMOVED***)}</title>
                  <EditObjectType />
                </SidebarLayout>
              }
            />

            <Route
              path="/object_schema"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***object schemas***REMOVED***)}</title>
                  <ListObjectSchemas />
                </SidebarLayout>
              }
            />
            <Route
              path="/object_schema/create"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***create object schema***REMOVED***)}</title>
                  <CreateObjectSchema />
                </SidebarLayout>
              }
            />
            <Route
              path="/object_schema/edit/:uuid"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***edit object schema***REMOVED***)}</title>
                  <EditObjectSchema />
                </SidebarLayout>
              }
            />

            <Route
              path="/forms"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***forms***REMOVED***)}</title>
                  <ListForm />
                </SidebarLayout>
              }
            />
            <Route
              path="/forms/create"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***create form***REMOVED***)}</title>
                  <CreateFormLoader />
                </SidebarLayout>
              }
            />

            <Route
              path="/forms/edit/:uuid"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***edit form***REMOVED***)}</title>
                  <EditFormLoader />
                </SidebarLayout>
              }
            />

            <Route
              path="/relationship"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***relationships***REMOVED***)}</title>
                  <ListRelationships />
                </SidebarLayout>
              }
            />
            <Route
              path="/relationship/create"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***create relationship***REMOVED***)}</title>
                  <CreateRelationship />
                </SidebarLayout>
              }
            />
            <Route
              path="/relationship/edit/:uuid"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***edit relationship***REMOVED***)}</title>
                  <EditRelationship />
                </SidebarLayout>
              }
            />

            <Route
              path="/field_configs"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***field configs***REMOVED***)}</title>
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
                  <title>{makeSiteTitle(***REMOVED***upload file***REMOVED***)}</title>
                  <UploadFile />
                </SidebarLayout>
              }
            />

            <Route
              path="/file/list"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***list files***REMOVED***)}</title>
                  <ListFilesLoader />
                </SidebarLayout>
              }
            />

            <Route
              path="/persons"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***persons***REMOVED***)}</title>
                  <PersonsList />
                </SidebarLayout>
              }
            />

            <Route
              path="/custom/pipelines"
              element={
                <SidebarLayout>
                  <title>{makeSiteTitle(***REMOVED***list custom pipelines***REMOVED***)}</title>
                  <PipelineList />
                </SidebarLayout>
              }
            />
            <Route path="examples">
              <Route
                path="lock-unlock-documents"
                element={
                  <SidebarLayout>
                    <title>{makeSiteTitle(***REMOVED***lock/unlock documents example***REMOVED***)}</title>
                    <LockDocuments />
                  </SidebarLayout>
                }
              />
              <Route
                path="share-document"
                element={
                  <SidebarLayout>
                    <title>{makeSiteTitle(***REMOVED***share document example***REMOVED***)}</title>
                    <ShareDocuments />
                  </SidebarLayout>
                }
              />
              <Route path="popover" element={<PopoverTest />} />
              <Route
                path="authentik-users"
                element={
                  <SidebarLayout>
                    <title>{makeSiteTitle(***REMOVED***authentik users***REMOVED***)}</title>
                    <AuthentikUsers />
                  </SidebarLayout>
                }
              />
            </Route>
            <Route path="import">
              <Route
                path="all"
                element={
                  <SidebarLayout>
                    <ImportAllPage />
                  </SidebarLayout>
                }
              />
              <>{
                importConfigs.map(config => {
                  return (
                    <Route
                      key={config.type}
                      path={config.type}
                      element={
                        <SidebarLayout>
                          <ImportRecordsPage {...config} />
                        </SidebarLayout>
                      }
                    />
                  )
                })
              }</>
            </Route>
          </Routes>
        )}
      </>
    </>
  )
}

const AppPreload = (): ReactElement => {
  const auth = useAuth()
  const [contextReloadToken] = useAtom(contextReloadTokenAtom)
  const [contextState, setContextState] = useAtom(contextStateAtom)
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: [***REMOVED***preload***REMOVED***, contextReloadToken],
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const predicate = await fetchPredicates({ signal })
      const object_type = await fetchObjectTypes({ signal })
      const object_schema = await fetchObjectSchemas({ signal })
      const object_category = await fetchObjectCategories({ signal })
      const person =
        auth.isAdmin && auth?.user?.access_token
          ? await fetchPersons({ signal, token: auth.user.access_token })
          : []
      const person_by_owner_sub = Object.fromEntries(person.map((p) => [p.owner_sub, p]))
      const form = await fetchForms({ signal })

      const object_type_by_uuid = Object.fromEntries(object_type.map((ot) => [ot.uuid, ot]))
      const object_schema_by_uuid = Object.fromEntries(object_schema.map((os) => [os.uuid, os]))
      const form_by_uuid = Object.fromEntries(form.map((f) => [f.uuid, f]))
      const form_by_object_type_uuid: Record<string, IAssetForm[]> = {}
      for (const ot of object_type) {
        const forms_for_ot = form.filter((f) => f.object_type_uuid === ot.uuid)
        if (forms_for_ot.length > 0) {
          form_by_object_type_uuid[ot.uuid] = forms_for_ot
        }
      }

      const newContextState = {
        predicate,
        predicate_by_uuid: Object.fromEntries(predicate.map((p) => [p.uuid, p])),
        predicate_by_predicate: Object.fromEntries(predicate.map((p) => [p.predicate, p])),
        object_type,
        object_type_by_uuid,
        object_type_by_slug: Object.fromEntries(object_type.map((ot) => [ot.slug, ot])),
        object_schema,
        object_schema_by_uuid,
        object_schema_by_slug: Object.fromEntries(object_schema.map((os) => [os.slug, os])),
        object_schema_defaults_by_object_type_uuid: Object.fromEntries(
          object_schema.filter((s) => s.is_type_default).map((os) => [os.object_type_uuid, os])
        ),
        object_category,
        form,
        form_by_uuid,
        form_by_slug: Object.fromEntries(form.map((f) => [f.slug, f])),
        form_default_by_object_type_uuid: Object.fromEntries(
          form.filter((f) => f.is_schema_and_version_default).map((f) => [f.object_type_uuid, f])
        ),
        form_by_object_type_uuid,
        person,
        person_by_owner_sub,
        loaded: true,
      }
      setContextState(newContextState)
      return newContextState
    },
  })

  const isInitialLoad = isLoading && !data
  const isRefreshing = isFetching && !!data

  if (isInitialLoad) {
    return (
      <ViewWithLoader isLoading={true} error={error} data={data}>
        <></>
      </ViewWithLoader>
    )
  }

  return (
    <>
      {isRefreshing && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-slate-200">
          <div className="h-full w-full animate-pulse bg-slate-500" />
        </div>
      )}
      {error ? (
        <ViewWithLoader isLoading={false} error={error} data={data}>
          <></>
        </ViewWithLoader>
      ) : contextState.loaded ? (
        <App />
      ) : (
        <ViewWithLoader isLoading={true} error={null} data={data}>
          <></>
        </ViewWithLoader>
      )}
    </>
  )
}

const AuthPreload = (): ReactElement => {
  const auth = useAuth()
  // make sure auth is done loading
  return (
    <ViewWithLoader isLoading={auth.isLoading} error={null} data={{}}>
      {!auth.isLoading && (auth.isAuthenticated ? <AppPreload /> : <LoginPage />)}
    </ViewWithLoader>
  )
}

const AppBoundary = (): ReactElement => {
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
  return (
    <ErrorBoundary fallbackRender={fallbackRender}>
      <QueryClientProvider client={queryClient}>
        <AuthPreload />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default AppBoundary
