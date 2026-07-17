import { MODLCreateDocumentEntry } from "@/brands/modl/create_document_entry"
import { Book } from "lucide-react"
import type { ReactElement } from "react"

export const MODLEntry = (): ReactElement => {

    return (
        <>
            <h2 className="text-2xl font-bold mb-2 flex flex-row items-center gap-2">
                <Book size={18} /> Create a new MODL entry
            </h2>
            <MODLCreateDocumentEntry />


        </>
    )
}
