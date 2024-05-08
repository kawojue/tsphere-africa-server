export const titleText = (text: string) => {
    return text.trim()
        .split(" ")
        .map(txt => txt[0].toUpperCase() + txt.slice(1).toLowerCase())
        .join(" ")
}

export const toLowerCase = (text: string) => text.toLowerCase().trim()

export const extractTime = (stringDate: string) => {
    if (!stringDate) return

    const date = new Date(stringDate)
    const hours = date.getHours()
    const minutes = date.getMinutes()

    const formattedHours = hours % 12 || 12
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes
    const amOrPm = hours < 12 ? 'AM' : 'PM'
    const formattedTime = `${formattedHours}:${formattedMinutes} ${amOrPm}`

    return formattedTime
}