import { OIDC_POST_LOGOUT_REDIRECT_URI } from '@/config/config'
import type { IAuth } from '@/types/types'
import { useAuth as useOIDCAuth } from 'react-oidc-context'
import { useNavigate } from 'react-router-dom'

export const useIsAdmin = (roles: string[] | undefined): boolean => {
  if (!roles) return false
  return roles.find(r => r.match(/admin/)) !== undefined
}

export const useAuth = (): IAuth => {
  const auth = useOIDCAuth()
  const [firstName, lastName] = auth.user?.profile?.given_name
    ? auth.user.profile.given_name.split(' ')
    : [null, null]
  const navigate = useNavigate()
  const roles: string[] = auth.user?.profile?.roles as string[] ?? []
  const isAdmin = useIsAdmin(roles)
  return {
    ...auth,
    logout: async () => {
      console.log('Session state:', auth.user?.session_state)
      if (auth.user !== undefined && auth.user !== null && !auth.user.expired) {
        auth.signoutRedirect({
          post_logout_redirect_uri: OIDC_POST_LOGOUT_REDIRECT_URI,
        })
      } else {
        auth.revokeTokens()
        navigate('/login')
      }
    },
    login: async () => {
      const redirect_uri =
        window.location.pathname === '/loggedout'
          ? `${window.location.origin}/`
          : window.location.href
      auth.signinRedirect({
        redirect_uri,
      })
    },
    user: auth.user
      ? {
          access_token: auth.user.access_token,
          expires_at: auth.user.expires_at ? new Date(auth.user.expires_at * 1000) : new Date(),
          scope: auth.user.scope ? auth.user.scope.split(' ') : [],
          profile: {
            sub: auth.user.profile?.sub,
            name: auth.user.profile?.name,
            email: auth.user.profile?.email,
            firstName,
            lastName,
            isAdmin,
            ...Object.fromEntries(
              Object.entries(auth.user.profile || {}).filter(
                ([key]) => !['sub', 'name', 'email'].includes(key)
              )
            ),
          },
        }
      : null,
  }
}
