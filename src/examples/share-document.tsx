import { useAuth } from "@/auth/useAuth"
import { useDocumentList } from "@/manage/document/useDocumentList"
import type { IDocument, IPerson } from "@/types/types"
import { Input, ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import { Share, X } from "lucide-react"
import { useState, type ReactElement, type ReactNode } from "react"
import {
    Popover,
    PopoverContent,
    PopoverDescription,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
} from ***REMOVED***@/components/ui/popover***REMOVED***
import { Button } from "@/components/ui/button"
import { patchDocument } from "@/manage/document/services"
import { usePerson, usePersonList } from "@/manage/person/usePersonList"
import UserAvatar from "@/manage/components/userAvatar"
import { cn } from "@/lib/utils"
import SearchBox from "@/components/custom/search-box"


const PersonRow = ({ person, onSelect, className, children }: { person: any, onSelect?: (person: IPerson) => void, className?: string, children?: ReactNode }): ReactElement => {
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

const PersonLoader = ({ sub, className, children }: { sub: string, className?: string, children?: ReactNode }): ReactElement => {
    const { data: person, isLoading, error } = usePerson({ sub })
    return <ViewWithLoader isLoading={isLoading} error={error} data={person}>
        {
            person && (
                <PersonRow person={person} className={className} children={children} />
            )
        }
    </ViewWithLoader>
}



const ShareDocument = ({ document, className }: { document: IDocument, className?: string }) => {
    const auth = useAuth()
    const [isUpdating, setIsUpdating] = useState(false)
    const [search, setSearch] = useState<string | null>(null)
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
    }

    return <div className={`flex flex-row gap-4 justify-between items-center ${className}`}>
        <p className=***REMOVED***font-bold***REMOVED***>{document.label}</p>
        <p className="text-sm text-gray-500">{subs.slice(0, 2).join(***REMOVED***, ***REMOVED***)}{subs.length > 2 ? `, +${subs.length - 2} more` : ***REMOVED******REMOVED***}</p>

        <Popover modal={true}>
            <PopoverTrigger asChild>
                <Button variant="outline"><Share /></Button>
            </PopoverTrigger>
            <PopoverContent className=***REMOVED***w-125 mr-2 flex flex-col gap-4***REMOVED***>
                <PopoverHeader className=***REMOVED***flex flex-col gap-2 border-b pb-2***REMOVED***>
                    <PopoverTitle className="flex flex-row gap-2 items-center"><Share className=***REMOVED***w-4 h-4***REMOVED*** />Share: {document.label}</PopoverTitle>
                    <PopoverDescription>Give other users access to edit this document.</PopoverDescription>
                </PopoverHeader>
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
                            <div className=***REMOVED***flex flex-col py-2 gap-4***REMOVED***>
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
            </PopoverContent>
        </Popover>

    </div>

}

const ShareDocuments = () => {
    const { isLoading, data: documents, error } = useDocumentList({})
    return <ViewWithLoader isLoading={isLoading} error={error} data={documents}>
        <div className="flex gap-6">
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                        Start
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-40">
                    Aligned to start
                </PopoverContent>
            </Popover>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                        Center
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="center" className="w-40">
                    Aligned to center
                </PopoverContent>
            </Popover>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                        End
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-40">
                    Aligned to end
                </PopoverContent>
            </Popover>
        </div>
        {
            documents && (
                <>
                    <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Share documents</h1>
                    <div className=***REMOVED***flex flex-col***REMOVED***>
                        {
                            documents.items.sort((a, b) => a.label.localeCompare(b.label)).map((document) => (
                                <ShareDocument key={document.uuid} document={document} className=***REMOVED***odd:bg-slate-100 even:bg-slate-200 p-4***REMOVED*** />
                            ))
                        }
                    </div>
                </>
            )
        }

    </ViewWithLoader>
}

export default ShareDocuments