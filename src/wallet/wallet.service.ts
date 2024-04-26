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
import { BankDetailsDto } from 'src/profile-setup/dto/bank-details.dto'

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

    async addBankDetail(
        res: Response,
        { sub }: ExpressUser,
        { accountNumber, bankCode, bankName }: BankDetailsDto
    ) {
        try {
            const { data: details } = await this.paystack.resolveAccount(accountNumber, bankCode)

            await this.prisma.bankDetails.create({
                data: {
                    bankName, accountNumber,
                    bankCode, primary: false,
                    user: { connect: { id: sub } },
                    accountName: details.account_name,
                }
            })

            this.response.sendSuccess(res, StatusCodes.Created, {
                message: "New account has been added"
            })
        } catch (err) {
            this.misc.handlePaystackAndServerError(res, err)
        }
    }

    async removeBankDetail(
        res: Response,
        { sub }: ExpressUser,
        id: string
    ) {
        try {
            const where = { id, userId: sub }

            const account = await this.prisma.bankDetails.findUnique({ where })

            if (!account) {
                return this.response.sendError(res, StatusCodes.NotFound, "Account details not found")
            }

            const deletedAccount = await this.prisma.bankDetails.delete({ where })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Account details removed successfully"
            })

            res.on('finish', async () => {
                if (deletedAccount && deletedAccount.primary) {
                    const latestAccount = await this.prisma.bankDetails.findFirst({
                        where,
                        select: { id: true },
                        orderBy: { updatedAt: 'desc' }
                    })

                    if (latestAccount) {
                        await this.prisma.bankDetails.update({
                            where: { id: latestAccount.id, userId: sub },
                            data: { primary: true }
                        })
                    }
                }
            })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error removing bank account')
        }
    }

    async togglePrimaryAccount(
        res: Response,
        { sub }: ExpressUser,
        id: string,
    ) {
        try {
            const where = { id, userId: sub }

            const account = await this.prisma.bankDetails.findUnique({ where })

            if (!account) {
                return this.response.sendError(res, StatusCodes.NotFound, "Account details not found")
            }

            const accountCounts = await this.prisma.bankDetails.count({ where: { userId: sub } })

            if (accountCounts <= 1) {
                if (account.primary) {
                    return this.response.sendError(res, StatusCodes.OK, 'Add a new account before removing this from primary')
                }
            }

            await this.prisma.bankDetails.updateMany({
                where: {
                    userId: sub,
                    primary: true,
                },
                data: { primary: false }
            })

            const bankAccount = await this.prisma.bankDetails.update({
                where,
                data: { primary: !!account.primary }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: bankAccount })

            res.on('finish', async () => {
                if (bankAccount && !bankAccount.primary) {
                    const latestAccount = await this.prisma.bankDetails.findFirst({
                        where,
                        select: { id: true },
                        orderBy: { updatedAt: 'desc' }
                    })

                    if (latestAccount) {
                        await this.prisma.bankDetails.update({
                            where: { id: latestAccount.id, userId: sub },
                            data: { primary: true }
                        })
                    }
                }
            })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error toggling bank account')
        }
    }

    async linkedBanks(res: Response, { sub }: ExpressUser) {
        const banks = await this.prisma.bankDetails.findMany({
            where: { userId: sub },
            orderBy: [
                { primary: 'desc' },
                { createdAt: 'desc' }
            ]
        })

        this.response.sendSuccess(res, StatusCodes.OK, { data: banks })
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
