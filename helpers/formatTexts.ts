export const titleName = (fullname: string) => {
    let titledName = []
    const names = fullname.trim().split(" ")

    for (const f_name of names) {
        const formattedName = f_name[0].toUpperCase() + f_name.slice(1).toLowerCase()
        titledName.push(formattedName)
    }

    return titledName.join(" ")
}