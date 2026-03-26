import { twconfig } from "./twowolves.ts"

export const ENVIRONMENT: string = twconfig(
    "$TWOWOLVES_ENVIRONMENT",
    "VITE_ENVIRONMENT",
    ***REMOVED***staging***REMOVED***
);

export const USE_STAGING: boolean = ENVIRONMENT !== ***REMOVED***production***REMOVED*** && ENVIRONMENT !== ***REMOVED***development***REMOVED***

export const OIDC_AUTHORITY = twconfig(
    "$TWOWOLVES_OIDC_AUTHORITY",
    "VITE_OIDC_AUTHORITY",
    ***REMOVED***https://ego.srv.axds.co/application/o/asset-docs/***REMOVED***
);

export const OIDC_CLIENT_ID = twconfig(
    "$TWOWOLVES_OIDC_CLIENT_ID",
    "VITE_OIDC_CLIENT_ID",
    ***REMOVED***INVALID_CLIENT_ID***REMOVED***
);

export const OIDC_REDIRECT_URI = twconfig(
    "$TWOWOLVES_OIDC_REDIRECT_URI",
    "VITE_OIDC_REDIRECT_URI",
    ***REMOVED***http://localhost:4422/authed***REMOVED***
);

export const OIDC_POST_LOGOUT_REDIRECT_URI = twconfig(
    "$TWOWOLVES_OIDC_POST_LOGOUT_REDIRECT_URI",
    "VITE_OIDC_POST_LOGOUT_REDIRECT_URI",
    ***REMOVED***http://localhost:4422/loggedout***REMOVED***
);

export const OIDC_SCOPE = twconfig(
    "$TWOWOLVES_OIDC_SCOPE",
    "VITE_OIDC_SCOPE",
    ***REMOVED***profile email entitlements***REMOVED***
);

export const APPS_API_BASE_URL = twconfig(
    "$TWOWOLVES_APPS_API_BASE_URL",
    "VITE_APPS_API_BASE_URL",
    ***REMOVED***https://stage-asset-docs-postgrest.srv.axds.co***REMOVED***
);
