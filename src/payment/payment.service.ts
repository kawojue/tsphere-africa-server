import { Response } from 'express'
import genOTP from 'helpers/genOTP'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { BrevoService } from 'lib/brevo.service'
import { TxStatus, TxType } from '@prisma/client'
import { PrismaService } from 'lib/prisma.service'
import { WithdrawalDto } from './dto/withdraw.dto'
import { genRandomCode } from 'helpers/genRandStr'
import { TxHistoriesDto } from './dto/txHistory.dto'
import { PaymentChartDto } from './dto/analytics.dto'
import { PaystackService } from 'lib/Paystack/paystack.service'

@Injectable()
export class PaymentService {
    constructor(
        private readonly misc: MiscService,
        private readonly response: SendRes,
        private readonly brevo: BrevoService,
        private readonly prisma: PrismaService,
        private readonly paystack: PaystackService,
    ) { }

    async payment(res: Response, { sub }: ExpressUser) {
        const balance = await this.prisma.wallet.findUnique({ where: { userId: sub } })

        const primaryAccount = await this.prisma.bankDetails.findFirst({
            where: {
                userId: sub,
                primary: true,
            }
        })

        this.response.sendSuccess(res, StatusCodes.OK, {
            data: { balance, primaryAccount }
        })
    }

    async analytics(res: Response, { sub, role }: ExpressUser) {
        try {
            let inflow = 0
            let income = 0
            let outflow = 0

            if (role === "admin") {
                inflow = await this.prisma.totalInflow()
                outflow = await this.prisma.totalOutflow()

                const { _sum: { processingFee } } = await this.prisma.txHistory.aggregate({
                    _sum: { processingFee: true }
                })

                income = processingFee ?? 0
            } else {
                inflow = await this.prisma.totalInflow(sub)
                outflow = await this.prisma.totalOutflow(sub)

                const { _sum: { processingFee } } = await this.prisma.txHistory.aggregate({
                    _sum: { processingFee: true }
                })

                income = processingFee ?? 0
            }

            this.response.sendSuccess(res, StatusCodes.OK, { data: { income, inflow, outflow } })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error fetching analytics")
        }
    }


    async charts(
        res: Response,
        { q }: PaymentChartDto,
        { sub, role }: ExpressUser,
    ) {
        try {
            const currentYear = new Date().getFullYear()
            const monthNames = [
                'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
            ]

            let totalAmount = 0
            const chart = []

            const aggregateData = async (query: any) => {
                const aggregate = await this.prisma.txHistory.aggregate(query)
                return aggregate._sum.settlementAmount ?? 0
            }

            for (let i = 0; i < monthNames.length; i++) {
                const startDate = new Date(currentYear, i, 1)
                const endMonth = (i === 11) ? 0 : i + 1
                const endYear = (i === 11) ? currentYear + 1 : currentYear

                const endDate = new Date(endYear, endMonth, 1)

                const where = {
                    status: 'SUCCESS',
                    ...(q !== "income" && { type: q === "inflow" ? 'DEPOSIT' : 'WITHDRAWAL' }),
                    AND: [
                        { createdAt: { gte: startDate } },
                        { createdAt: { lt: endDate } }
                    ]
                }

                const query = {
                    where: role === "admin" ? where : { userId: sub, ...where },
                    _sum: { settlementAmount: true }
                }

                const amount = await aggregateData(query)
                totalAmount += amount

                chart.push({ monthName: monthNames[i], amount })
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: { chart, totalAmount }
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error caching chart")
        }
    }

    async fetchTxHistories(
        res: Response,
        { sub, role }: ExpressUser,
        {
            q,
            s = '',
            page = 1,
            type = null,
            limit = 100,
            endDate = '',
            status = null,
            startDate = '',
        }: TxHistoriesDto
    ) {
        try {
            page = Number(page)
            limit = Number(limit)
            const offset = (page - 1) * limit

            if (type && !['WITHDRAWAL', 'DEPOSIT'].includes(type.toUpperCase())) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'Invalid type query')
            }

            if (status && !['SUCCESS', 'FAILED', 'REVERSED', 'PENDING'].includes(status.toUpperCase())) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'Invalid status query')
            }

            const commonWhere = {
                createdAt: {
                    gte: startDate !== '' ? new Date(startDate) : new Date(0),
                    lte: endDate !== '' ? new Date(endDate) : new Date(),
                },
                type: type !== null ? type as TxType : undefined,
                status: status !== null ? status as TxStatus : undefined,
                OR: [
                    { user: { email: { contains: s, mode: 'insensitive' } } },
                    { user: { lastname: { contains: s, mode: 'insensitive' } } },
                    { user: { firstname: { contains: s, mode: 'insensitive' } } },
                ]
            }

            const where = role === 'admin' ? commonWhere : { ...commonWhere, userId: sub }

            const txHistories = await this.prisma.txHistory.findMany({
                // @ts-ignore
                where,
                ...(role === 'admin' && {
                    include: {
                        user: {
                            select: {
                                id: true,
                                role: true,
                                email: true,
                                avatar: true,
                                username: true,
                                lastname: true,
                                firstname: true,
                                primarySkill: true,
                            }
                        }
                    }
                }),
                skip: offset,
                take: limit,
                orderBy: q === 'amount' ? { amount: 'asc' } : { updatedAt: 'desc' },
            })

            // @ts-ignore
            const totalTxHistories = await this.prisma.txHistory.count({ where })

            this.response.sendSuccess(res, StatusCodes.OK, {
                totalTxHistories,
                data: txHistories,
                totalPages: Math.ceil(totalTxHistories / limit)
            })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error fetching transaction histories')
        }
    }

    async fetchTxHistory(
        res: Response,
        tx_id: string,
        { sub, role }: ExpressUser,
    ) {
        try {
            let where: {
                id: string
            } | {
                id: string
                userId: string
            }

            if (role === "admin") {
                where = { id: tx_id }
            } else {
                where = { id: tx_id, userId: sub }
            }

            const transaction = await this.prisma.txHistory.findUnique({ where })

            if (!transaction) {
                return this.response.sendError(res, StatusCodes.NotFound, "Transaction history does not exist")
            }

            this.response.sendSuccess(res, StatusCodes.OK, { data: transaction })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error getting transaction history')
        }
    }

    async requestPin(res: Response, { sub }: ExpressUser) {
        try {
            const user = await this.prisma.user.findUnique({ where: { id: sub } })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, "Account not found")
            }

            const totp = await this.prisma.totp.findUnique({
                where: { userId: sub },
            })

            let remainingMinutes = 0
            const THRESHOLD = 3 as const
            let eligible: boolean = false
            const { otp, otp_expiry } = genOTP()

            if (totp) {
                const currentDate = new Date()
                const oldExpiry = new Date(totp.otp_expiry)
                remainingMinutes = ((oldExpiry.getTime() - currentDate.getTime()) / 1000) / 60


                if (currentDate > oldExpiry || remainingMinutes < THRESHOLD) {
                    eligible = true
                }
            } else {
                eligible = true
            }

            if (!eligible) {
                return this.response.sendError(res, StatusCodes.BadRequest, `Request after ${Math.floor(remainingMinutes)} minutues`)
            }

            const newTotp = await this.prisma.totp.upsert({
                where: { userId: sub },
                create: {
                    otp, otp_expiry,
                    user: { connect: { id: sub } },
                },
                update: { otp, otp_expiry }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { message: "A new PIN has been sent to your email" })

            res.on('finish', async () => {
                if (newTotp) {
                    await this.brevo.sendTransactionalEmail({
                        to: user.email,
                        subject: `Withdrawal PIN: ${otp}`,
                        body: `${otp}. It expires in 5 mins. Ignore if you didn't request for the PIN`,
                    })
                }
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async withdraw(
        res: Response,
        { sub }: ExpressUser,
        { amount, linkedBankId, pin }: WithdrawalDto
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: sub },
                select: {
                    id: true,
                    wallet: { select: { balance: true } }
                }
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, "Account not found")
            }

            const bank = await this.prisma.bankDetails.findUnique({
                where: { id: linkedBankId, userId: sub }
            })

            if (!bank) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Selected bank not found')
            }

            if (amount > user.wallet.balance) {
                return this.response.sendError(res, StatusCodes.UnprocessableEntity, 'Insuffcient balance')
            }

            const totp = await this.prisma.totp.findFirst({
                where: { otp: pin }
            })

            if (!totp) {
                return this.response.sendError(res, StatusCodes.Unauthorized, "Invalid PIN")
            }

            if (new Date() > new Date(totp.otp_expiry)) {
                this.response.sendError(res, StatusCodes.Forbidden, "PIN has expired")
                await this.prisma.totp.delete({
                    where: { id: totp.id }
                })
                return
            }

            const { data: recipient } = await this.paystack.createRecipient({
                type: 'nuban',
                currency: 'NGN',
                name: bank.accountName,
                bank_code: bank.bankCode,
                account_number: bank.accountNumber,
            })

            await this.prisma.recipient.upsert({
                where: {
                    recipient_code: recipient.recipient_code
                },
                create: {
                    type: recipient.type,
                    updatedAt: new Date(),
                    bank_code: bank.bankCode,
                    bank_name: bank.bankName,
                    domain: recipient.domain,
                    recipient_id: recipient.id,
                    account_name: bank.accountName,
                    account_number: bank.accountNumber,
                    integration: recipient.integration,
                    recipient_code: recipient.recipient_code,
                },
                update: { updatedAt: new Date() }
            })

            const fee = await this.misc.calculateWithdrawalFee(amount)
            const settlementAmount = amount - fee.totalFee

            const { data: transfer } = await this.paystack.initiateTransfer({
                source: 'balance',
                amount: amount * 100,
                reason: `Talent Sphere - withdrawal`,
                recipient: recipient.recipient_code,
                reference: `withdrawal-${sub}-${genRandomCode()}`
            })

            const [_, tx] = await this.prisma.$transaction([
                this.prisma.wallet.update({
                    where: { userId: sub },
                    data: { balance: { decrement: amount } }
                }),
                this.prisma.txHistory.create({
                    data: {
                        amount,
                        ...fee,
                        settlementAmount,
                        type: 'WITHDRAWAL',
                        source: transfer.source,
                        narration: transfer.reason,
                        reference: transfer.reference,
                        user: { connect: { id: sub } },
                        destinationBankCode: bank.bankCode,
                        destinationBankName: bank.bankName,
                        destinationAccountName: bank.accountName,
                        destinationAccountNumber: bank.accountNumber,
                        status: transfer.status.toUpperCase() as TxStatus,
                    }
                })
            ])

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Transfer has been initiated",
                data: tx,
            })
        } catch (err) {
            this.misc.handlePaystackAndServerError(res, err)
        }
    }
}
