import type { ITableProps } from "@axdspub/axiom-ui-utilities";
import type { ReactElement } from "react";
import { Table as AxiomTable } from "@axdspub/axiom-ui-utilities";

const Table = (props: ITableProps): ReactElement => {
    const modifiedProps = {
        ...props,
        theadClassName: `${props.theadClassName ? `${props.theadClassName} ` : ***REMOVED******REMOVED***}text-left`,
    }
    return (
        <AxiomTable
            {...modifiedProps}
        />
    )
}

export default Table