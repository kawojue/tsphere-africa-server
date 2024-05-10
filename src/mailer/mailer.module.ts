import { Module } from '@nestjs/common'
import { MailService } from './mailer.service'
import { MailerModule } from '@nestjs-modules/mailer'

@Module({
    imports: [
        MailerModule.forRoot({
            transport: {
                host: 'smtp.gmail.com',
                // port: 587, // 465
                secure: true,
                service: 'gmail',
                requireTLS: true,
                auth: {
                    user: 'tsphereafrica@gmail.com',
                    pass: process.env.EMAIL_APP_PSWD!,
                },
            },
            defaults: {
                from: `"No Reply" <tsphereafrica@gmail.com>`,
            },
        }),
    ],
    providers: [MailService],
})
export class MailModule { }