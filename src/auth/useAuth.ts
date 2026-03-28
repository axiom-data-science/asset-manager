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
            /* auth.signoutRedirect({
                post_logout_redirect_uri: OIDC_POST_LOGOUT_REDIRECT_URI
            }) */
           auth.signoutSilent().then(() => {
                console.log(***REMOVED***User signed out***REMOVED***);
                navigate(***REMOVED***/loggedout***REMOVED***);
            })
            /* auth.signoutRedirect()
                .then(() => {
                    console.log(***REMOVED***User signed out***REMOVED***);
                    debugger
                })
                .catch((error) => {
                    console.error(***REMOVED***Error during sign out:***REMOVED***, error);
                    debugger
                }); */
        },
        login: async () => {
            auth.signinRedirect({
                
            })
           /* auth.signinPopup()
                .then((user) => {
                    console.log(***REMOVED***User signed in:***REMOVED***, user);
                    navigate(***REMOVED***/authed***REMOVED***);
                })
                .catch((error) => {
                    console.error(***REMOVED***Error during sign in:***REMOVED***, error);
                }); */
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