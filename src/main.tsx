import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider, type AuthProviderProps } from 'react-oidc-context';
import { WebStorageStateStore } from 'oidc-client-ts';
import './index.css'
import App from './App.tsx'
import {
    OIDC_AUTHORITY,
    OIDC_CLIENT_ID,
    OIDC_REDIRECT_URI,
    OIDC_POST_LOGOUT_REDIRECT_URI,
    OIDC_SCOPE
} from './config/config.ts'


console.log( `OIDC_AUTHORITY: ${OIDC_AUTHORITY}` )
console.log( `OIDC_CLIENT_ID: ${OIDC_CLIENT_ID}` )
console.log( `OIDC_REDIRECT_URI: ${OIDC_REDIRECT_URI}` )
console.log( `OIDC_POST_LOGOUT_REDIRECT_URI: ${OIDC_POST_LOGOUT_REDIRECT_URI}` )
console.log( `OIDC_SCOPE: ${OIDC_SCOPE}` )


const oidcConfig: AuthProviderProps = {
  authority: OIDC_AUTHORITY, // The URL of your OIDC provider
  client_id: OIDC_CLIENT_ID, // Your client ID
  redirect_uri: OIDC_REDIRECT_URI, // The URL to return to after login
  post_logout_redirect_uri: OIDC_POST_LOGOUT_REDIRECT_URI, // The return URL for after logging out
  scope: OIDC_SCOPE, // Scopes to request (profile, entitlement, email, etc.)
  // Use 'code' for the secure Authorization Code Grant with PKCE flow
  response_type: 'code',
  // Optional: automatically renew the token when it's about to expire
  automaticSilentRenew: true,
  // Optional: use local storage to store the user data
  userStore: typeof window !== 'undefined' ? new WebStorageStateStore({ store: window.localStorage }) : undefined,
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider {...oidcConfig}>
      <App />
    </AuthProvider>
  </StrictMode>,
)
