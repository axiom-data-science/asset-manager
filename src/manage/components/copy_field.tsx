import { Input } from "@axdspub/axiom-ui-utilities";
import { Check, Copy } from "lucide-react";
import { useState, type ReactElement } from "react";

const CopyField = ({label, id, value}: {label: string, id: string, value: string | number}): ReactElement => {
    const [copied, setCopied] = useState(false);

    const onCopy = () => {
        navigator.clipboard.writeText(String(value)).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        })
    }

    return (
        <div className="relative cursor-pointer" onClick={onCopy}>
            <Input id={id} testId={id} type='text' size='xs' label={label} value={value} disabled={true} />
            <span  className={`absolute right-2 top-7 p-1 rounded-2xl ${copied ? 'bg-slate-800 text-white' : 'bg-white/50 text-gray-600'} transition-colors`}>
            {
                copied 
                    ? <Check size={14} />
                    : <Copy size={14} />
            }
            </span>
            <span className='block absolute left-0 top-0 right-0 bottom-0 bg-white/5 cursor-pointer'></span>
        </div>
    )

}

export const CopyFields = ({fields}: {fields: {label: string, id: string, value: string | number}[]}): ReactElement => {
    return (
        <div className="flex flex-row gap-4">
            {
                fields.map(field => (
                    <CopyField key={field.id} {...field} />
                ))
            }
        </div>
    )
}

export default CopyField;