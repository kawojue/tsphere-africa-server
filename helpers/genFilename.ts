import { randomBytes } from 'crypto'

export const genFileName = () => {
    return `tsphere_${randomBytes(2)
        .toString('hex')}_${new Date()
            .toDateString()
            .split(" ")
            .join('-')}_${Math.floor(new Date().getTime() / 1000)}`
}