import { MODLDocumentSelector } from "@/brands/modl/create_document_entry"
import type { MODLCreateDocumentEntryProps } from "@/brands/modl/create_document_entry"
import type { ReactElement } from "react"

const MODLEntry = (props: MODLCreateDocumentEntryProps = {}): ReactElement => {

    return (
        <>
            <MODLDocumentSelector {...(props ?? {})} />


        </>
    )
}
export default MODLEntry
