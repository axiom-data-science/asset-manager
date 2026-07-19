import { utils } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { ExternalLink } from ***REMOVED***lucide-react***REMOVED***
import type { ReactElement } from ***REMOVED***react***REMOVED***
import { Link } from ***REMOVED***react-router-dom***REMOVED***

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
  variant?: ***REMOVED***primary***REMOVED*** | ***REMOVED***secondary***REMOVED*** | ***REMOVED***link***REMOVED*** | ***REMOVED***ghost***REMOVED***
  size?: ***REMOVED***xs***REMOVED*** | ***REMOVED***sm***REMOVED*** | ***REMOVED***md***REMOVED*** | ***REMOVED***lg***REMOVED*** | ***REMOVED***xl***REMOVED***
}): ReactElement => {
  return (
    <Link
      to={to}
      className={`${utils.createButtonClass({
        variant: variant ?? ***REMOVED***primary***REMOVED***,
        size,
      })}${disabled ? ***REMOVED*** opacity-50 cursor-not-allowed***REMOVED*** : ***REMOVED******REMOVED***}${className ? ` ${className}` : ***REMOVED******REMOVED***}`}
      target={target}
    >
      {children}
      {target ? <ExternalLink /> : null}
    </Link>
  )
}

export default ButtonLink
