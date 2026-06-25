import { useAuth } from "@/auth/useAuth";
import { ViewWithLoader } from "@axdspub/axiom-ui-utilities";
import { useQuery } from "@tanstack/react-query";
import { type ReactElement } from "react";

const AuthentikUsers = (): ReactElement => {
    const auth = useAuth()
    const token = auth?.user?.access_token ?? ***REMOVED******REMOVED***
    const { isLoading, error, data } = useQuery({
        enabled: !!auth?.user?.access_token,
        queryKey: [***REMOVED***authentik-users***REMOVED***],
        queryFn: async () => {
            const instanceUrl = ***REMOVED***https://ego.srv.axds.co***REMOVED***
            const url = new URL("/api/v3/core/users/", instanceUrl);


            const response = await fetch(url.toString(), {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    ***REMOVED***Content-Type***REMOVED***: ***REMOVED***application/json***REMOVED***
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

        }
    })

    return (
        <ViewWithLoader isLoading={isLoading} error={error} data={data}>
            <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Authentik Users</h1>
            <>{data &&
                <pre>{JSON.stringify(data, null, 2)}</pre>
            }</>
        </ViewWithLoader>
    )
}

export default AuthentikUsers