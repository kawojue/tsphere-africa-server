export const genReferralKey = (username: string) => {
    return Buffer.from(username).toString('base64url')
}