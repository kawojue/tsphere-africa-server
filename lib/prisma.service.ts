import { PrismaClient } from '@prisma/client'
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
}