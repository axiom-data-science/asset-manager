import { twconfig } from './twowolves.ts'

export const ENVIRONMENT: string = twconfig('$TWOWOLVES_ENVIRONMENT', 'VITE_ENVIRONMENT', 'staging')

export const USE_STAGING: boolean = ENVIRONMENT !== 'production' && ENVIRONMENT !== 'development'
const CURRENT_DOMAIN = window.location.origin

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
  '{CURRENT_DOMAIN}/authed',
  '$TWOWOLVES_OIDC_REDIRECT_URI',
  'VITE_OIDC_REDIRECT_URI'
).replace('{CURRENT_DOMAIN}', CURRENT_DOMAIN)

export const OIDC_POST_LOGOUT_REDIRECT_URI = twconfig(
  '{CURRENT_DOMAIN}/loggedout',
  '$TWOWOLVES_OIDC_POST_LOGOUT_REDIRECT_URI',
  'VITE_OIDC_POST_LOGOUT_REDIRECT_URI',
).replace('{CURRENT_DOMAIN}', CURRENT_DOMAIN)

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

export const IMPORT_MERGE_RPC = twconfig(
  '$TWOWOLVES_IMPORT_MERGE_RPC',
  'VITE_IMPORT_MERGE_RPC',
  ''
)

export const IMPORT_FAIL_RELATIONSHIP_ONCE =
  import.meta.env.DEV &&
  twconfig(
    '$TWOWOLVES_IMPORT_FAIL_RELATIONSHIP_ONCE',
    'VITE_IMPORT_FAIL_RELATIONSHIP_ONCE',
    'false'
  ).toLowerCase() === 'true'

export const IMPORT_RELATIONSHIP_TEST_MODE = import.meta.env.DEV
  ? twconfig(
    '$TWOWOLVES_IMPORT_RELATIONSHIP_TEST_MODE',
    'VITE_IMPORT_RELATIONSHIP_TEST_MODE',
    'off'
  ).toLowerCase()
  : 'off'

export const IMPORT_RELATIONSHIP_TEST_PARENT_SLUG = import.meta.env.DEV
  ? twconfig(
    '$TWOWOLVES_IMPORT_RELATIONSHIP_TEST_PARENT_SLUG',
    'VITE_IMPORT_RELATIONSHIP_TEST_PARENT_SLUG',
    'relationship-test-parent'
  )
  : ''

export const IMPORT_RELATIONSHIP_TEST_CHILD_SLUG = import.meta.env.DEV
  ? twconfig(
    '$TWOWOLVES_IMPORT_RELATIONSHIP_TEST_CHILD_SLUG',
    'VITE_IMPORT_RELATIONSHIP_TEST_CHILD_SLUG',
    'relationship-test-child'
  )
  : ''

export const SITE_TITLE = twconfig('$TWOWOLVES_SITE_TITLE', 'VITE_SITE_TITLE', 'Asset Manager')

export const APP_VARIANT = twconfig('$TWOWOLVES_APP_VARIANT', 'VITE_APP_VARIANT', '')
