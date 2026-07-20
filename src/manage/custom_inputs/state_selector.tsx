import { type IFieldInputProps, Inputs } from "@axdspub/axiom-ui-forms";
import type { ReactElement } from "react";

const states = `"Alabama","AL"
"Alaska","AK"
"Arizona","AZ"
"Arkansas","AR"
"California","CA"
"Colorado","CO"
"Connecticut","CT"
"Delaware","DE"
"District of Columbia","DC"
"Florida","FL"
"Georgia","GA"
"Hawaii","HI"
"Idaho","ID"
"Illinois","IL"
"Indiana","IN"
"Iowa","IA"
"Kansas","KS"
"Kentucky","KY"
"Louisiana","LA"
"Maine","ME"
"Montana","MT"
"Nebraska","NE"
"Nevada","NV"
"New Hampshire","NH"
"New Jersey","NJ"
"New Mexico","NM"
"New York","NY"
"North Carolina","NC"
"North Dakota","ND"
"Ohio","OH"
"Oklahoma","OK"
"Oregon","OR"
"Maryland","MD"
"Massachusetts","MA"
"Michigan","MI"
"Minnesota","MN"
"Mississippi","MS"
"Missouri","MO"
"Pennsylvania","PA"
"Rhode Island","RI"
"South Carolina","SC"
"South Dakota","SD"
"Tennessee","TN"
"Texas","TX"
"Utah","UT"
"Vermont","VT"
"Virginia","VA"
"Washington","WA"
"West Virginia","WV"
"Wisconsin","WI"
"Wyoming","WY"`.split("\n").map(line => {
    const [label, value] = line.split(",")
    return { label: label.replace(/"/g, ""), value: value.replace(/"/g, "") }
})

const StateSelector = ({ field, onChange, value, disabled }: IFieldInputProps): ReactElement => {
    return <Inputs.SelectInput
        field={{
            ...field,
            type: ***REMOVED***select***REMOVED***,
            options: states
        }}
        onChange={onChange}
        value={value}
        disabled={disabled}
    />
}

export default StateSelector