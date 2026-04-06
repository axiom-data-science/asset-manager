import type { ReactElement } from "react"
import { Link as ReactRouterDomLink, type LinkProps } from "react-router-dom"

const Link = (props:LinkProps): ReactElement => {
    return <ReactRouterDomLink {...props} />
}

export default Link