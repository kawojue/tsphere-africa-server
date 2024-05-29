import { Module } from '@nestjs/common'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { BrevoService } from 'lib/brevo.service'
import { PassportModule } from '@nestjs/passport'
import { PaymentService } from './payment.service'
import { PrismaService } from 'lib/prisma.service'
import { MailService } from 'src/mailer/mailer.service'
import { PaymentController } from './payment.controller'
import { PaystackService } from 'lib/Paystack/paystack.service'

@Module({
  imports: [
    JwtModule,
    PassportModule.register({ defaultStrategy: 'jwt' })
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    SendRes,
    MiscService,
    MailService,
    BrevoService,
    PrismaService,
    PaystackService,
  ],
})
export class PaymentModule { }
