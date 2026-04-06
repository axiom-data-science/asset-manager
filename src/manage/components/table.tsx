import type {  ITableProps } from "@axdspub/axiom-ui-utilities";
import type { ReactElement } from "react";
import { Table as AxiomTable } from "@axdspub/axiom-ui-utilities";

const Table = (props: ITableProps): ReactElement => {
    const modifiedProps = {
        ...props,
        theadClassName: ***REMOVED***text-left***REMOVED***
    }
    return (
        <AxiomTable
            {...modifiedProps}
        />
    )
}

export default Table