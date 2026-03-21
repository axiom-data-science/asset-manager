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
    ***REMOVED***http://localhost:5173/authed***REMOVED***
);

export const OIDC_POST_LOGOUT_REDIRECT_URI = twconfig(
    "$TWOWOLVES_OIDC_POST_LOGOUT_REDIRECT_URI",
    "VITE_OIDC_POST_LOGOUT_REDIRECT_URI",
    ***REMOVED***http://localhost:5173/loggedout***REMOVED***
);

export const OIDC_SCOPE = twconfig(
    "$TWOWOLVES_OIDC_SCOPE",
    "VITE_OIDC_SCOPE",
    ***REMOVED***profile email entitlements***REMOVED***
);
