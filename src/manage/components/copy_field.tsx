import { Input } from "@axdspub/axiom-ui-utilities";
import { Check, Copy } from "lucide-react";
import { useState, type ReactElement, type ReactNode } from "react";


export const CopyButton = ({ value, size = 14 }: { value: string | number | ReactNode, size?: number }): ReactElement => {
    const [copied, setCopied] = useState(false);

    const onCopy = () => {
        setCopied(true);
        navigator.clipboard.writeText(String(value)).then(() => {
            setTimeout(() => setCopied(false), 1000);
        })
    }
    return (
        <span className={`rounded-2xl ${copied ? ***REMOVED***bg-slate-800 text-green-600***REMOVED*** : ***REMOVED***bg-white/50 text-gray-600***REMOVED***} transition-colors`} onClick={onCopy}>
            {
                copied
                    ? <Check size={size} />
                    : <Copy size={size} />
            }
        </span>
    )
}


const CopyField = ({ label, id, value, noCopy }: { label?: string, id: string, value: string | number | ReactNode, noCopy?: boolean }): ReactElement => {
    return (
        <div className="relative cursor-pointer">
            {noCopy
                ? <div className=***REMOVED***flex flex-col gap-1***REMOVED***>
                    {label && <span className=***REMOVED***text-xs text-gray-500***REMOVED***>{label}</span>}
                    <span className=***REMOVED***p-1***REMOVED***>{value}</span>
                </div>
                : <><Input id={id} testId={id} type=***REMOVED***text***REMOVED*** size=***REMOVED***xs***REMOVED*** label={label} value={String(value)} disabled={true} />

                    <span className=***REMOVED***absolute right-2 bottom-1***REMOVED***>
                        <CopyButton value={value} />
                    </span>
                </>
            }
        </div>
    )

}

export const CopyFields = ({ fields, stack }: { fields: { label: string, id: string, value: ReactNode, noCopy?: boolean }[], stack?: boolean }): ReactElement => {
    return (
        <div className={`flex ${stack ? ***REMOVED***flex-col gap-2***REMOVED*** : ***REMOVED***flex-row  gap-4***REMOVED***}`}>
            {
                fields.map(field => (
                    <CopyField key={field.id} {...field} />
                ))
            }
        </div>
    )
}

export default CopyField;