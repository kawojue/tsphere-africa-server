import { readFileSync } from 'fs'
import * as handlebars from 'handlebars'
import { Injectable } from '@nestjs/common'
import { MailerService } from '@nestjs-modules/mailer'

@Injectable()
export class MailService {
    constructor(private readonly mailerService: MailerService) { }

    async sendEmail(
        to: string,
        subject: string,
        path: string,
        context: Record<string, any>
    ): Promise<void> {
        const template = readFileSync(path, 'utf8')
        const compiledTemplate = handlebars.compile(template)
        const html = compiledTemplate(context)

        await this.mailerService.sendMail({ to, subject, html })
    }
}