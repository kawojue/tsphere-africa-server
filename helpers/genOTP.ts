const generateOTP = (length: number = 6) => {
    let otp: string = ''
    const digits: string = '0123456789'

    for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * length)]
    }

    const currentDate: Date = new Date()
    const otp_expiry: Date = new Date(
        currentDate.setMinutes(currentDate.getMinutes() + 5)
    )

    return { otp, otp_expiry }
}

export default generateOTP