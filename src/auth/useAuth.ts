import { OIDC_POST_LOGOUT_REDIRECT_URI } from ***REMOVED***@/config/config***REMOVED***
import type { IAuth } from ***REMOVED***@/types/types***REMOVED***
import { useAuth as useOIDCAuth } from ***REMOVED***react-oidc-context***REMOVED***
import { useNavigate } from ***REMOVED***react-router-dom***REMOVED***
export const useAuth = (): IAuth => {
    const auth = useOIDCAuth()
    const [firstName, lastName] = auth.user?.profile?.given_name ? auth.user.profile.given_name.split(***REMOVED*** ***REMOVED***) : [null, null]
    const navigate = useNavigate()
    return {
        ...auth,
        logout: async () => {
            
            console.log(***REMOVED***Session state:***REMOVED***, auth.user?.session_state)
            if(auth.user !== undefined && auth.user !== null && !auth.user.expired){
                auth.signoutRedirect({
                    post_logout_redirect_uri: OIDC_POST_LOGOUT_REDIRECT_URI
                })
            } else {
                auth.revokeTokens()
                navigate(***REMOVED***/login***REMOVED***)
            }
           
            
        },
        login: async () => {
            auth.signinRedirect({
                
            })
        },
        user: auth.user ? {
            access_token: auth.user.access_token,
            expires_at: auth.user.expires_at ? new Date(auth.user.expires_at * 1000) : new Date(),
            scope: auth.user.scope ? auth.user.scope.split(***REMOVED*** ***REMOVED***) : [],
            profile: {
                sub: auth.user.profile?.sub,
                name: auth.user.profile?.name,
                email: auth.user.profile?.email,
                firstName,
                lastName,
                ...Object.fromEntries(Object.entries(auth.user.profile || {}).filter(([key]) => ![***REMOVED***sub***REMOVED***, ***REMOVED***name***REMOVED***, ***REMOVED***email***REMOVED***].includes(key)))
            }
        } : null
    }
}