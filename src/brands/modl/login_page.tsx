import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/ui/button"
import type { ReactElement } from "react"

const MODLLoginPage = (): ReactElement => {
    const auth = useAuth()
    return (
        <div className="p-20">
            <p className="mb-4">Please log in or create an account to create asset metadata.</p>
            <div className=***REMOVED***flex flex-row gap-2***REMOVED***>
                <Button onClick={() => void auth.login()}>Log in or create account</Button>
            </div>
        </div>
    )
}

export default MODLLoginPage