const generateOTP = (length: number = 6) => {
    let totp: string = ''
    const digits: string = '0123456789'
    for (let i = 0; i < length; i++) {
        totp += digits[Math.floor(Math.random() * length)]
    }

    const currentDate: Date = new Date()
    const expiryDate: Date = new Date(
        currentDate.setMinutes(currentDate.getMinutes() + 5)
    )

    return {
        totp,
        totp_expiry: expiryDate.toISOString()
    }
}

export default generateOTP