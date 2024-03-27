import { Injectable } from '@nestjs/common'
import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo'

@Injectable()
export class BrevoService {
    private apiInstance: TransactionalEmailsApi

    constructor() {
        this.apiInstance = new TransactionalEmailsApi()
        //@ts-ignore
        this.apiInstance.authentications['apiKey'].apiKey = process.env.BREVO_API_KEY
    }

    async sendTransactionalEmail({ subject, to, body }: {
        to: string
        body: string
        subject: string
    }) {
        const sendSmtpEmail = new SendSmtpEmail()
        sendSmtpEmail.subject = subject
        sendSmtpEmail.htmlContent = body
        sendSmtpEmail.sender = { name: 'Talent Sphere Africa', email: 'tsphereafrica@gmail.com' }
        sendSmtpEmail.to = [{ email: to }]

        try {
            await this.apiInstance.sendTransacEmail(sendSmtpEmail)
        } catch (error) {
            console.error(error)
            throw error
        }
    }

    async sendVerificationEmail(email: string, token: string) {
        await this.sendTransactionalEmail({
            to: email,
            subject: "Verify your email",
            body: `${process.env.CLIENT_URL}/verify-email?token=${token}&token_type=email`
        })
    }
}