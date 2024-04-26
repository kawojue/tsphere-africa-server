import { Response } from 'express'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { TxStatus, TxType } from '@prisma/client'
import { PrismaService } from 'lib/prisma.service'
import { TxHistoriesDto } from './dto/txHistory.dto'
import { PaymentChartDto } from './dto/analytics.dto'

@Injectable()
export class PaymentService {
    constructor(
        private readonly misc: MiscService,
        private readonly response: SendRes,
        private readonly prisma: PrismaService,
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

            const totalAmount = []
            let total = 0

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
                total += amount

                totalAmount.push({ monthName: monthNames[i], amount })
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: {
                    chart: totalAmount,
                    total
                }
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

            this.response.sendSuccess(res, StatusCodes.OK, { data: txHistories })
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
}
