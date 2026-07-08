import { OIDC_POST_LOGOUT_REDIRECT_URI } from ***REMOVED***@/config/config***REMOVED***
import type { IAuth } from ***REMOVED***@/types/types***REMOVED***
import { useAuth as useOIDCAuth } from ***REMOVED***react-oidc-context***REMOVED***
import { useNavigate } from ***REMOVED***react-router-dom***REMOVED***

export const useIsAdmin = (roles: string[] | undefined): boolean => {
  if (!roles) return false
  return roles.find((r) => r.match(/admin/)) !== undefined
}

export const useIsSuperAdmin = (roles: string[] | undefined): boolean => {
  if (!roles) return false
  return roles.find((r) => r.match(/superadmin/)) !== undefined
}

export const useAuth = (): IAuth => {
  const auth = useOIDCAuth()
  const [firstName, lastName] = auth.user?.profile?.given_name
    ? auth.user.profile.given_name.split(***REMOVED*** ***REMOVED***)
    : [null, null]
  const navigate = useNavigate()
  const roles: string[] = (auth.user?.profile?.roles as string[]) ?? []
  const isAdmin = useIsAdmin(roles)
  const isSuperAdmin = useIsSuperAdmin(roles)
  return {
    ...auth,
    isAdmin,
    isSuperAdmin,
    logout: async () => {
      console.log(***REMOVED***Session state:***REMOVED***, auth.user?.session_state)
      if (auth.user !== undefined && auth.user !== null && !auth.user.expired) {
        auth.signoutRedirect({
          post_logout_redirect_uri: OIDC_POST_LOGOUT_REDIRECT_URI,
        })
      } else {
        auth.revokeTokens()
        navigate(***REMOVED***/login***REMOVED***)
      }
    },
    login: async () => {
      const path = window.location.pathname
      const href = window.location.href
      const redirect_uri =
        path === ***REMOVED***/loggedout***REMOVED*** || path === ***REMOVED***/***REMOVED*** ? `${window.location.origin}/authed` : href
      auth.signinRedirect({
        redirect_uri,
      })
    },
    user: auth.user
      ? {
          access_token: auth.user.access_token,
          expires_at: auth.user.expires_at ? new Date(auth.user.expires_at * 1000) : new Date(),
          scope: auth.user.scope ? auth.user.scope.split(***REMOVED*** ***REMOVED***) : [],
          profile: {
            sub: auth.user.profile?.sub,
            name: auth.user.profile?.name,
            email: auth.user.profile?.email,
            firstName,
            lastName,
            isAdmin,
            ...Object.fromEntries(
              Object.entries(auth.user.profile || {}).filter(
                ([key]) => ![***REMOVED***sub***REMOVED***, ***REMOVED***name***REMOVED***, ***REMOVED***email***REMOVED***].includes(key)
              )
            ),
          },
        }
      : null,
  }
}
