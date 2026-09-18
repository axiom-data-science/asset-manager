import { utils } from '@axdspub/axiom-ui-utilities'
import { ExternalLink } from 'lucide-react'
import type { ReactElement } from 'react'
import { Link } from 'react-router-dom'

const ButtonLink = ({
  to,
  children,
  disabled,
  target,
  className,
  variant,
  size,
}: {
  to: string
  children: React.ReactNode
  disabled?: boolean
  target?: string
  className?: string
  variant?: 'default' | 'secondary' | 'link' | 'ghost'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}): ReactElement => {
  return (
    <Link
      to={to}
      className={`${utils.createButtonClass({
        variant: variant ?? 'default',
        size,
      })}${disabled ? ' opacity-50 cursor-not-allowed' : ''}${className ? ` ${className}` : ''}`}
      target={target}
    >
      {children}
      {target ? <ExternalLink /> : null}
    </Link>
  )
}

export default ButtonLink
