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
        <span className={`rounded-2xl ${copied ? 'bg-slate-800 text-green-600' : 'bg-white/50 text-gray-600'} transition-colors`} onClick={onCopy}>
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
                ? <div className='flex flex-col gap-1'>
                    {label && <span className='text-xs text-gray-500'>{label}</span>}
                    <span className='p-1'>{value}</span>
                </div>
                : <><Input id={id} testId={id} type='text' size='xs' label={label} value={String(value)} disabled={true} />

                    <span className='absolute right-2 bottom-1'>
                        <CopyButton value={value} />
                    </span>
                </>
            }
        </div>
    )

}

export const CopyFields = ({ fields }: { fields: { label: string, id: string, value: ReactNode, noCopy?: boolean }[] }): ReactElement => {
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