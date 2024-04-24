import { Response } from 'express'
import { TxStatus } from '@prisma/client'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { BrevoService } from 'lib/brevo.service'
import { ValidateBankDto } from './dto/bank.dto'
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

    async bankAccountVerification(res: Response, { account_number, bank_code }: ValidateBankDto) {
        const { data } = await this.paystack.resolveAccount(account_number, bank_code)

        this.response.sendSuccess(res, StatusCodes.OK, { data })
    }

    async fetchBanks(res: Response) {
        const { data: banks } = await this.paystack.listBanks()

        this.response.sendSuccess(res, StatusCodes.OK, { data: banks })
    }

    async fetchBankByBankCode(res: Response, bankCode: string) {
        const bank = await this.paystack.getBankByBankCode(bankCode)

        if (!bank) {
            this.response.sendError(res, StatusCodes.NotFound, "No supported Bank Name is associated with this bank code.")
            return
        }

        this.response.sendSuccess(res, StatusCodes.OK, { data: bank })
    }

    async manageTransferEvents(body: TransferEvent) {
        const data = body.data
        try {
            const transaction = await this.getTransaction(data.reference)

            if (transaction) {
                await this.updateTransactionStatus(transaction.reference, data.status as TxStatus)

                const amount = this.calculateTotalAmount(data.amount, transaction.totalFee)

                if (body.event === 'transfer.reversed' || body.event === 'transfer.failed') {
                    await this.updateUserBalance(transaction.userId, amount)
                }
            }
        } catch (err) {
            throw err
        }
    }

    private async getTransaction(reference: string) {
        return await this.prisma.txHistory.findUnique({
            where: { reference }
        })
    }

    private async updateTransactionStatus(reference: string, status: TxStatus) {
        await this.prisma.txHistory.update({
            where: { reference },
            data: { status }
        })
    }

    private calculateTotalAmount(amount: number, totalFee: number) {
        const KOBO = 100 as const
        return (amount / KOBO) + totalFee
    }

    private async updateUserBalance(userId: string, amount: number) {
        await this.prisma.wallet.update({
            where: { userId },
            data: { balance: { increment: amount } }
        })
    }
}
