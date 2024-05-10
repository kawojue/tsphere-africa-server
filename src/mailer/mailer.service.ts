import * as path from 'path'
import { readFileSync } from 'fs'
import * as handlebars from 'handlebars'
import { Injectable } from '@nestjs/common'
import { MailerService } from '@nestjs-modules/mailer'

@Injectable()
export class MailService {
    constructor(private readonly mailerService: MailerService) { }

    private readonly sourceRoot = path.join(process.cwd(), 'src')

    async sendEmail({ to, subject, filename, context }: {
        to: string,
        subject: string,
        filename: string,
        context: Record<string, any>
    }): Promise<void> {
        const template = readFileSync(path.join(this.sourceRoot, `mailer/templates/${filename}`), 'utf8')
        const compiledTemplate = handlebars.compile(template)
        const html = compiledTemplate(context)

        await this.mailerService.sendMail({ to, subject, html })
    }

    async sendVerificationEmail(email: string, token: string) {
        this.sendEmail({
            to: email,
            subject: "Verify your email",
            context: {
                url: `${process.env.CLIENT_URL}/verify-email?token=${token}&token_type=email`
            },
            filename: 'email-verification.hbs'
        })
    }
}