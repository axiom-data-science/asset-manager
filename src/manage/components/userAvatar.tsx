import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { ReactElement } from "react"

const colors = [
    'bg-red-100 text-red-800',
    'bg-yellow-100 text-yellow-800',
    'bg-green-100 text-green-800',
    'bg-blue-100 text-blue-800',
    'bg-indigo-100 text-indigo-800',
    'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800',
    'bg-teal-100 text-teal-800',
]

function getColorFromName(name: string) {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
}

const UserAvatar = ({ name }: { name: string }): ReactElement => {

    const pieces = name.split(' ')
    const initials = `${pieces[0]?.[0] ?? ''}${pieces[1]?.[0] ?? ''}`.toUpperCase()
    const avatarColor = getColorFromName(name)
    return (
        <Avatar>
            <AvatarFallback className={avatarColor}>{initials}</AvatarFallback>
        </Avatar>
    )



}

export default UserAvatar