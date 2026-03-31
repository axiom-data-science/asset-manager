import { OIDC_POST_LOGOUT_REDIRECT_URI } from '@/config/config'
import type { IAuth } from '@/types/types'
import { useAuth as useOIDCAuth } from 'react-oidc-context'
export const useAuth = (): IAuth => {
    const auth = useOIDCAuth()
    const [firstName, lastName] = auth.user?.profile?.given_name ? auth.user.profile.given_name.split(' ') : [null, null]
    return {
        ...auth,
        logout: async () => {
            auth.signoutRedirect({
               post_logout_redirect_uri: OIDC_POST_LOGOUT_REDIRECT_URI
            })
        },
        login: async () => {
            auth.signinRedirect({
                
            })
        },
        user: auth.user ? {
            access_token: auth.user.access_token,
            expires_at: auth.user.expires_at ? new Date(auth.user.expires_at * 1000) : new Date(),
            scope: auth.user.scope ? auth.user.scope.split(' ') : [],
            profile: {
                sub: auth.user.profile?.sub,
                name: auth.user.profile?.name,
                email: auth.user.profile?.email,
                firstName,
                lastName,
                ...Object.fromEntries(Object.entries(auth.user.profile || {}).filter(([key]) => !['sub', 'name', 'email'].includes(key)))
            }
        } : null
    }
}