import { randomBytes } from 'crypto'

export const genFileName = () => {
    return `TalentSphere_${randomBytes(8).toString('hex')}_${new Date().toDateString().split(" ").join('-')}`
}