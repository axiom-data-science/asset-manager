import type { IValidationError } from "@/types/types";
import type { ReactElement } from "react";
import type { IFormCreatorHandle } from "@axdspub/axiom-ui-forms";
import { Button, Tooltip } from "@axdspub/axiom-ui-utilities";
import { Play } from "lucide-react";

const GoTo = ({
    error,
    formRef
}: {
    error: IValidationError,
    formRef?: React.RefObject<IFormCreatorHandle | null>
}) => {
    return (
        <Tooltip content='Go to field' dark={true} useSpan={true}>
            <Button
                className='ml-3'
                onClick={() => formRef?.current?.jumpToField(error.field)}
            >
                <Play />
            </Button>
        </Tooltip>
    )
}

const Errors = ({
    errors, formRef
}: { errors: IValidationError[], formRef?: React.RefObject<IFormCreatorHandle | null> }): ReactElement => {
    return (
        <>
            {
                errors.length > 0 && <div className='p-4 bg-red-100 border border-red-400 text-red-700 rounded'>
                    {
                        errors.length === 1
                            ? <p>{errors[0].message}{formRef && <GoTo error={errors[0]} formRef={formRef} />}</p>

                            : <ul className='list-disc list-inside'>
                                {errors.map((err, i) => <li key={i}>{err.fieldLabel && (<strong>{err.fieldLabel}</strong>)} {err.message}
                                    {formRef && <GoTo error={err} formRef={formRef} />}
                                </li>)}
                            </ul>
                    }
                </div>
            }
        </>
    )
}

export default Errors