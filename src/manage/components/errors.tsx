import type { IValidationError } from "@/types/types";
import type { ReactElement } from "react";

const Errors = ({ errors }: { errors: IValidationError[] }): ReactElement => {
    return (
        <>
            {
                errors.length > 0 && <div className='p-4 bg-red-100 border border-red-400 text-red-700 rounded'>
                    {
                        errors.length === 1
                            ? <p>{errors[0].message}</p>

                            : <ul className='list-disc list-inside'>
                                {errors.map((err, i) => <li key={i}>{err.fieldLabel && (<strong>{err.fieldLabel}</strong>)} {err.message}</li>)}
                            </ul>
                    }
                </div>
            }
        </>
    )
}

export default Errors