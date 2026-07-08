import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { ReactElement } from "react"

const colors = [
    ***REMOVED***bg-red-100 text-red-800***REMOVED***,
    ***REMOVED***bg-yellow-100 text-yellow-800***REMOVED***,
    ***REMOVED***bg-green-100 text-green-800***REMOVED***,
    ***REMOVED***bg-blue-100 text-blue-800***REMOVED***,
    ***REMOVED***bg-indigo-100 text-indigo-800***REMOVED***,
    ***REMOVED***bg-purple-100 text-purple-800***REMOVED***,
    ***REMOVED***bg-pink-100 text-pink-800***REMOVED***,
    ***REMOVED***bg-teal-100 text-teal-800***REMOVED***,
]

function getColorFromName(name: string) {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
}

const UserAvatar = ({ name }: { name: string }): ReactElement => {

    const pieces = name.split(***REMOVED*** ***REMOVED***)
    const initials = `${pieces[0]?.[0] ?? ***REMOVED******REMOVED***}${pieces[1]?.[0] ?? ***REMOVED******REMOVED***}`.toUpperCase()
    const avatarColor = getColorFromName(name)
    return (
        <Avatar>
            <AvatarFallback className={avatarColor}>{initials}</AvatarFallback>
        </Avatar>
    )



}

export default UserAvatar