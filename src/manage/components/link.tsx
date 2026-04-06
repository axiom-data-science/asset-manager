import type { ReactElement } from "react"
import { Link as ReactRouterDomLink, type LinkProps } from "react-router-dom"

const Link = (props:LinkProps): ReactElement => {
    const propsToUse = {
        ...props,
        className: `text-blue-500 hover:underline ${props.className ?? ***REMOVED******REMOVED***}`
    }
    return <ReactRouterDomLink {...propsToUse} />
}

export default Link