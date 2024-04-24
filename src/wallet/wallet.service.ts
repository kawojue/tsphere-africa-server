import { Injectable } from '@nestjs/common'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { BrevoService } from 'lib/brevo.service'
import { PrismaService } from 'lib/prisma.service'
import { PaystackService } from 'lib/Paystack/paystack.service'

@Injectable()
export class WalletService {
    constructor(
        private readonly misc: MiscService,
        private readonly response: SendRes,
        private readonly brevo: BrevoService,
        private readonly prisma: PrismaService,
        private readonly paystack: PaystackService,
    ) { }


}
