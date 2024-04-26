import { Response } from 'express'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { PrismaService } from 'lib/prisma.service'
import { FetchProfilesDto } from './dto/infinite-scroll.dto'
import { PaystackService } from 'lib/Paystack/paystack.service'
import { BankDetailsDto } from 'src/profile-setup/dto/bank-details.dto'

@Injectable()
export class UserService {
    constructor(
        private readonly response: SendRes,
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
        private readonly paystack: PaystackService
    ) { }

    async fetchProfiles(
        res: Response,
        {
            role, search = '',
            limit = 100, page = 1,
        }: FetchProfilesDto
    ) {
        try {
            page = Number(page)
            limit = Number(limit)
            const offset = (page - 1) * limit

            const users = await this.prisma.user.findMany({
                where: {
                    OR: [
                        { email: { contains: search, mode: 'insensitive' } },
                        { lastname: { contains: search, mode: 'insensitive' } },
                        { firstname: { contains: search, mode: 'insensitive' } },
                    ],
                    role,
                },
                take: limit,
                skip: offset,
                orderBy: {
                    createdAt: 'desc'
                },
                select: {
                    id: true,
                    role: true,
                    email: true,
                    avatar: true,
                    username: true,
                    lastname: true,
                    firstname: true,
                    primarySkill: true,
                    creative: {
                        select: {
                            bio: true,
                        }
                    },
                    talent: {
                        select: {
                            bioStats: true
                        }
                    },
                    skills: {
                        select: {
                            subSkills: true
                        }
                    },

                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: users })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fetchProfile(
        res: Response,
        { role, sub }: ExpressUser,
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: {
                    role,
                    id: sub,
                },
                select: {
                    id: true,
                    role: true,
                    email: true,
                    skills: true,
                    avatar: true,
                    username: true,
                    lastname: true,
                    firstname: true,
                    portfolio: true,
                    createdAt: true,
                    bankDetails: true,
                    experiences: true,
                    primarySkill: true,
                    skillAttachments: true,
                    rateAndAvailability: true,
                    wallet: { select: { balance: true } },
                    [role]: {
                        select: role === "talent" ? {
                            bioStats: true,
                            personalInfo: true,
                        } : role === "creative" ? {
                            bio: true,
                            personalInfo: true,
                            certifications: true,
                        } : {}
                    },
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: user })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
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
                    bankName,
                    bankCode,
                    primary: false,
                    accountNumber,
                    accountName: details.account_name,
                    user: { connect: { id: sub } }
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "New account has been added"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error adding bank account')
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
                    const accountCounts = await this.prisma.bankDetails.count({ where: { userId: sub } })

                    if (accountCounts >= 1) {
                        const latestAccount = await this.prisma.bankDetails.findMany({
                            where,
                            orderBy: { updatedAt: 'desc' }
                        })[0]

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
}
