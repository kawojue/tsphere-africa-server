import { createHmac } from 'crypto'

export function genToken(userId: string, randomCode: string) {
    const token = createHmac('sha256', process.env.ENCRYPTION_KEY)
        .update(`${userId}-${randomCode}`)
        .digest('hex')

    const currentDate = new Date()
    const token_expiry = new Date(
        currentDate.setDate(currentDate.getDate() + 7)
    )

    return { token, token_expiry }
}