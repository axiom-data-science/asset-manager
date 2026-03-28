import { StrictMode } from ***REMOVED***react***REMOVED***
import { createRoot } from ***REMOVED***react-dom/client***REMOVED***
import { AuthProvider, type AuthProviderProps } from ***REMOVED***react-oidc-context***REMOVED***;
import { WebStorageStateStore } from ***REMOVED***oidc-client-ts***REMOVED***;
import ***REMOVED***./index.css***REMOVED***
import App from ***REMOVED***./App.tsx***REMOVED***
import {
  OIDC_AUTHORITY,
  OIDC_CLIENT_ID,
  OIDC_REDIRECT_URI,
  OIDC_POST_LOGOUT_REDIRECT_URI,
  OIDC_SCOPE
} from ***REMOVED***./config/config.ts***REMOVED***
import { BrowserRouter } from ***REMOVED***react-router-dom***REMOVED***;


console.log(`OIDC_AUTHORITY: ${OIDC_AUTHORITY}`)
console.log(`OIDC_CLIENT_ID: ${OIDC_CLIENT_ID}`)
console.log(`OIDC_REDIRECT_URI: ${OIDC_REDIRECT_URI}`)
console.log(`OIDC_POST_LOGOUT_REDIRECT_URI: ${OIDC_POST_LOGOUT_REDIRECT_URI}`)
console.log(`OIDC_SCOPE: ${OIDC_SCOPE}`)


const oidcConfig: AuthProviderProps = {
  authority: OIDC_AUTHORITY, // The URL of your OIDC provider
  client_id: OIDC_CLIENT_ID, // Your client ID
  redirect_uri: OIDC_REDIRECT_URI, // The URL to return to after login
  post_logout_redirect_uri: OIDC_POST_LOGOUT_REDIRECT_URI, // The return URL for after logging out
  scope: OIDC_SCOPE, // Scopes to request (profile, entitlement, email, etc.)
  // Use ***REMOVED***code***REMOVED*** for the secure Authorization Code Grant with PKCE flow
  response_type: ***REMOVED***code***REMOVED***,
  // Optional: automatically renew the token when it***REMOVED***s about to expire
  automaticSilentRenew: true,
  // Optional: use local storage to store the user data
  userStore: typeof window !== ***REMOVED***undefined***REMOVED*** ? new WebStorageStateStore({ store: window.localStorage }) : undefined,
  onSigninCallback(user) {
    console.log(***REMOVED***User signed in:***REMOVED***, user);
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    )
  },
};

createRoot(document.getElementById(***REMOVED***root***REMOVED***)!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider {...oidcConfig}>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
