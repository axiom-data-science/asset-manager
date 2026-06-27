import { useAuth } from "@/auth/useAuth"
import SearchBox from "@/components/custom/search-box"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import Link from "@/manage/components/link"
import UserAvatar from "@/manage/components/userAvatar"
import { patchDocument } from "@/manage/document/services"
import { usePerson, usePersonList } from "@/manage/person/usePersonList"
import type { IDocument, IPerson } from "@/types/types"
import { ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import { Check, Copy, Loader, Share, X } from "lucide-react"
import { useState, type ReactElement, type ReactNode } from "react"


export const PersonRow = ({ person, onSelect, className, children }: { person: any, onSelect?: (person: IPerson) => void, className?: string, children?: ReactNode }): ReactElement => {
    return (
        <div className={cn([***REMOVED***px-4 py-2 flex flex-row gap-2 items-center***REMOVED***, className])} onClick={() => onSelect && onSelect(person)}>
            <UserAvatar name={person.label} />
            <div className="flex flex-col">
                <p className=***REMOVED***text-sm font-medium***REMOVED***>{person.label}</p>
                {person.label !== person.owner_sub ? <p className=***REMOVED***text-xs text-slate-400***REMOVED***>{person.owner_sub}</p> : ***REMOVED******REMOVED***}
            </div>
            {
                children && (
                    <div className="ml-auto">
                        {children}
                    </div>
                )
            }
        </div>
    )
}


export const PersonLoader = ({ sub, className, children }: { sub: string, className?: string, children?: ReactNode }): ReactElement => {
    const { data: person, isLoading, error } = usePerson({ sub })
    return <ViewWithLoader isLoading={isLoading} error={error} data={person}>
        {
            person && (
                <PersonRow person={person} className={className} children={children} />
            )
        }
    </ViewWithLoader>
}



const ShareDocument = ({ document, className, onUpdate }: { document: IDocument, className?: string, onUpdate?: (subs: string[]) => void }) => {
    const auth = useAuth()
    const [isUpdating, setIsUpdating] = useState(false)
    const [subs, setSubs] = useState<string[]>(document.subs_for_update ?? [])
    const onUpdateSubs = async (newSubs: string[]) => {
        setIsUpdating(true)
        try {
            await patchDocument({
                uuid: document.uuid,
                document: {
                    ...document,
                    subs_for_update: newSubs,

                } as IDocument,
                token: auth.user?.access_token ?? ***REMOVED******REMOVED***,
            })
        } catch (error) {
            console.error("Error updating document subs:", error)
        }
        setIsUpdating(false)
        setSubs(newSubs)
        onUpdate && onUpdate(newSubs)
    }

    return <Dialog modal={true}>
        <DialogTrigger asChild>
            <Button variant="outline"><Share /></Button>
        </DialogTrigger>
        <DialogContent className=***REMOVED***w-125 mr-2 flex flex-col gap-4***REMOVED***>
            <DialogHeader className=***REMOVED***flex flex-col gap-2 border-b pb-2***REMOVED***>
                <DialogTitle className="flex flex-row gap-2 items-center"><Share className=***REMOVED***w-4 h-4***REMOVED*** />Share: {document.label}</DialogTitle>
                <DialogDescription>Give other users access to edit this document.</DialogDescription>
            </DialogHeader>
            <SearchBox<IPerson>
                searchHook={usePersonList}
                placeholder="Enter user name or email"
                columnsToSearch={[***REMOVED***label***REMOVED***, ***REMOVED***owner_sub***REMOVED***]}
                ResultRow={(person) => (
                    <PersonRow key={person.uuid} person={person} className=***REMOVED***hover:bg-blue-100 cursor-pointer***REMOVED*** onSelect={(p) => {
                        const newSubs = [...new Set([...subs, p.owner_sub])]
                        onUpdateSubs(newSubs)
                    }} />
                )}
            />
            {
                subs && subs.length > 0 ? (
                    <div className=***REMOVED***flex flex-col gap-2***REMOVED***>
                        <p className=***REMOVED***text-sm***REMOVED***>Users with access</p>
                        <div className=***REMOVED***flex flex-col py-2 gap-4 relative***REMOVED***>
                            {
                                isUpdating && (
                                    <Loader className=***REMOVED***absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 opacity-50***REMOVED*** />
                                )
                            }
                            {
                                subs.map((sub) => (
                                    <PersonLoader key={sub} sub={sub} className=***REMOVED***p-0***REMOVED*** children={
                                        <X className=***REMOVED***w-4 h-4 text-gray-500 cursor-pointer***REMOVED*** onClick={() => {
                                            const newSubs = subs.filter(s => s !== sub)
                                            onUpdateSubs(newSubs)

                                        }} />
                                    } />
                                ))
                            }
                        </div>
                    </div>
                ) : (
                    <p className=***REMOVED***text-sm text-gray-500***REMOVED***>No users have access to this document.</p>
                )
            }
        </DialogContent>
    </Dialog>


}

export default ShareDocument