import { genToken } from 'helpers/genToken'
import { PrismaClient, Validation } from '@prisma/client'
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
        await this.$connect()
    }

    async onModuleDestroy() {
        await this.$disconnect()
    }

    async isSubscribed(email: string) {
        const subscribed = await this.subscribedEmails.findUnique({
            where: { email }
        })

        if (subscribed) {
            await this.subscribedEmails.delete({
                where: { email }
            })
            await this.user.update({
                where: { email },
                data: { subscribed: true }
            })
        }
    }

    async isTokenExpired(validation: Validation) {
        const isExpired = new Date() > new Date(validation.token_expiry)
        if (isExpired) {
            await this.validation.delete({
                where: {
                    token: validation.token
                }
            })

            return true
        }

        return false
    }

    async validateToken(recv_token: string, validation: Validation) {
        const decodedToken = atob(recv_token)
        const tk = genToken(validation?.userId, validation?.randomCode)

        return tk.token === decodedToken
    }

    async totalInflow(userId?: string) {
        let total: number = 0

        if (userId) {
            const inflow = await this.txHistory.aggregate({
                where: {
                    userId,
                    type: 'DEPOSIT',
                    status: 'SUCCESS',
                },
                _sum: { settlementAmount: true }
            })

            total = inflow._sum.settlementAmount
        } else {
            const inflow = await this.txHistory.aggregate({
                where: {
                    type: 'DEPOSIT',
                    status: 'SUCCESS',
                },
                _sum: { settlementAmount: true }
            })

            total = inflow._sum.settlementAmount
        }

        return total
    }

    async totalOutflow(userId?: string) {
        let total: number = 0

        if (userId) {
            const inflow = await this.txHistory.aggregate({
                where: {
                    userId,
                    status: 'SUCCESS',
                    type: 'WITHDRAWAL',
                },
                _sum: { settlementAmount: true }
            })

            total = inflow._sum.settlementAmount
        } else {
            const inflow = await this.txHistory.aggregate({
                where: {
                    status: 'SUCCESS',
                    type: 'WITHDRAWAL',
                },
                _sum: { settlementAmount: true }
            })

            total = inflow._sum.settlementAmount
        }

        return total
    }
}