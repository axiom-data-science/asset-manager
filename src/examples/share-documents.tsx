import { useDocumentList } from "@/manage/document/useDocumentList"
import { ViewWithLoader } from "@axdspub/axiom-ui-utilities"
import ShareDocument from "@/components/custom/share-document"
import { useState } from "react"
import Link from "@/manage/components/link"
import { Check, Copy } from "lucide-react"
import { useDocument } from "@/manage/document/useDocument"
import type { IDocument } from "@/types/types"


const DocumentSubs = ({ subs }: { subs: string[] }) => {



    return (

        <p className="text-sm text-gray-500">{subs.slice(0, 2).join(***REMOVED***, ***REMOVED***)}{subs.length > 2 ? `, +${subs.length - 2} more` : ***REMOVED******REMOVED***}</p>

    )

}

const ShareDocumentRow = ({ document }: { document: IDocument }) => {

    const [copied, setCopied] = useState(false)
    const [subs, setSubs] = useState<string[]>(document.subs_for_update ?? [])

    return (
        <div className={`flex flex-row gap-4 justify-between items-center odd:bg-slate-100 even:bg-slate-200 p-4`}>
            <p className=***REMOVED***flex flex-col gap-1 ***REMOVED***>
                <Link className=***REMOVED***font-bold***REMOVED*** to={`/document/edit/${document.uuid}`}>{document.label}</Link>
                <span className=***REMOVED***text-xs text-slate-400 flex flex-row items-center gap-2 cursor-pointer***REMOVED*** onClick={() => {
                    navigator.clipboard.writeText(document.uuid)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                }}>{document.uuid} {copied ? <Check className=***REMOVED***w-5 h-5 text-white bg-green-600 rounded-2xl p-0.5 font-bold***REMOVED*** /> : <Copy className=***REMOVED***w-5 h-5 p-1***REMOVED*** />}</span>
            </p>
            <DocumentSubs subs={subs} />
            <ShareDocument key={document.uuid} document={document} className=***REMOVED***odd:bg-slate-100 even:bg-slate-200 p-4***REMOVED*** onUpdate={(newSubs) => {
                setSubs(newSubs.slice())
            }} />
        </div>
    )

}


const ShareDocuments = () => {
    const { isLoading, data: documents, error } = useDocumentList({})

    return <ViewWithLoader isLoading={isLoading} error={error} data={documents}>
        {
            documents && (
                <>
                    <h1 className="text-2xl font-bold py-2 sticky top-0 bg-white">Share documents</h1>
                    <div className=***REMOVED***flex flex-col***REMOVED***>
                        {
                            documents.items.sort((a, b) => a.label.localeCompare(b.label)).map((document) => (
                                <ShareDocumentRow key={document.uuid} document={document} />
                            ))
                        }
                    </div>
                </>
            )
        }

    </ViewWithLoader>
}

export default ShareDocuments