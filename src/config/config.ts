import { twconfig } from './twowolves.ts'

export const ENVIRONMENT: string = twconfig('$TWOWOLVES_ENVIRONMENT', 'VITE_ENVIRONMENT', 'staging')

export const USE_STAGING: boolean = ENVIRONMENT !== 'production' && ENVIRONMENT !== 'development'

export const OIDC_AUTHORITY = twconfig(
  '$TWOWOLVES_OIDC_AUTHORITY',
  'VITE_OIDC_AUTHORITY',
  'https://ego.srv.axds.co/application/o/asset-docs/'
)

export const OIDC_CLIENT_ID = twconfig(
  '$TWOWOLVES_OIDC_CLIENT_ID',
  'VITE_OIDC_CLIENT_ID',
  'INVALID_CLIENT_ID'
)

export const OIDC_REDIRECT_URI = twconfig(
  '$TWOWOLVES_OIDC_REDIRECT_URI',
  'VITE_OIDC_REDIRECT_URI',
  'http://localhost:4422/authed'
)

export const OIDC_POST_LOGOUT_REDIRECT_URI = twconfig(
  '$TWOWOLVES_OIDC_POST_LOGOUT_REDIRECT_URI',
  'VITE_OIDC_POST_LOGOUT_REDIRECT_URI',
  'http://localhost:4422/loggedout'
)

export const OIDC_SCOPE = twconfig(
  '$TWOWOLVES_OIDC_SCOPE',
  'VITE_OIDC_SCOPE',
  'profile email entitlements'
)

export const APPS_API_BASE_URL = twconfig(
  '$TWOWOLVES_APPS_API_BASE_URL',
  'VITE_APPS_API_BASE_URL',
  //'https://stage-asset-docs-postgrest.srv.axds.co'
  'http://localhost:3345'
)
