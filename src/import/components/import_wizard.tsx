import type { ReactElement } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type ImportWizardStep = {
  id: string
  label: string
  completed?: boolean
  disabled?: boolean
}

export const ImportWizard = ({
  steps,
  activeStep,
  onStepChange,
}: {
  steps: ImportWizardStep[]
  activeStep: string
  onStepChange?: (step: string) => void
}): ReactElement => (
  <nav className="border-b bg-slate-50 px-5 py-3" aria-label="Import workflow steps">
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((step, index) => {
        const active = step.id === activeStep
        return (
          <li key={step.id} className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={active ? 'default' : 'outline'}
              disabled={step.disabled}
              aria-current={active ? 'step' : undefined}
              onClick={() => onStepChange?.(step.id)}
            >
              {step.completed && !active ? <Check size={14} /> : `${index + 1}.`}
              {step.label}
            </Button>
            {index < steps.length - 1 && <span className="text-slate-400">/</span>}
          </li>
        )
      })}
    </ol>
  </nav>
)
