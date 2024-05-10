import * as path from 'path'
import { readFileSync } from 'fs'
import * as handlebars from 'handlebars'
import { Injectable } from '@nestjs/common'
import { MailerService } from '@nestjs-modules/mailer'

@Injectable()
export class MailService {
    constructor(private readonly mailerService: MailerService) { }

    private readonly sourceRoot = path.join(process.cwd(), 'src')

    async sendEmail(
        to: string,
        subject: string,
        filename: string,
        context: Record<string, any>
    ): Promise<void> {
        const template = readFileSync(path.join(this.sourceRoot, `mailer/templates/${filename}`), 'utf8')
        const compiledTemplate = handlebars.compile(template)
        const html = compiledTemplate(context)

        await this.mailerService.sendMail({ to, subject, html })
    }
}