import { twconfig } from ***REMOVED***./twowolves.ts***REMOVED***

export const ENVIRONMENT: string = twconfig(***REMOVED***$TWOWOLVES_ENVIRONMENT***REMOVED***, ***REMOVED***VITE_ENVIRONMENT***REMOVED***, ***REMOVED***staging***REMOVED***)

export const USE_STAGING: boolean = ENVIRONMENT !== ***REMOVED***production***REMOVED*** && ENVIRONMENT !== ***REMOVED***development***REMOVED***

export const OIDC_AUTHORITY = twconfig(
  ***REMOVED***$TWOWOLVES_OIDC_AUTHORITY***REMOVED***,
  ***REMOVED***VITE_OIDC_AUTHORITY***REMOVED***,
  ***REMOVED***https://ego.srv.axds.co/application/o/asset-docs/***REMOVED***
)

export const OIDC_CLIENT_ID = twconfig(
  ***REMOVED***$TWOWOLVES_OIDC_CLIENT_ID***REMOVED***,
  ***REMOVED***VITE_OIDC_CLIENT_ID***REMOVED***,
  ***REMOVED***INVALID_CLIENT_ID***REMOVED***
)

export const OIDC_REDIRECT_URI = twconfig(
  ***REMOVED***$TWOWOLVES_OIDC_REDIRECT_URI***REMOVED***,
  ***REMOVED***VITE_OIDC_REDIRECT_URI***REMOVED***,
  ***REMOVED***http://localhost:4422/authed***REMOVED***
)

export const OIDC_POST_LOGOUT_REDIRECT_URI = twconfig(
  ***REMOVED***$TWOWOLVES_OIDC_POST_LOGOUT_REDIRECT_URI***REMOVED***,
  ***REMOVED***VITE_OIDC_POST_LOGOUT_REDIRECT_URI***REMOVED***,
  ***REMOVED***http://localhost:4422/loggedout***REMOVED***
)

export const OIDC_SCOPE = twconfig(
  ***REMOVED***$TWOWOLVES_OIDC_SCOPE***REMOVED***,
  ***REMOVED***VITE_OIDC_SCOPE***REMOVED***,
  ***REMOVED***profile email entitlements***REMOVED***
)

export const APPS_API_BASE_URL = twconfig(
  ***REMOVED***$TWOWOLVES_APPS_API_BASE_URL***REMOVED***,
  ***REMOVED***VITE_APPS_API_BASE_URL***REMOVED***,
  //***REMOVED***https://stage-asset-docs-postgrest.srv.axds.co***REMOVED***
  ***REMOVED***http://localhost:3345***REMOVED***
)

export const SITE_TITLE = twconfig(***REMOVED***$TWOWOLVES_SITE_TITLE***REMOVED***, ***REMOVED***VITE_SITE_TITLE***REMOVED***, ***REMOVED***Asset Manager***REMOVED***)
