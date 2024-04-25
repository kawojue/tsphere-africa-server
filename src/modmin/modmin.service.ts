import { Response } from 'express'
import { $Enums, TxStatus, TxType } from '@prisma/client'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { titleName } from 'helpers/formatTexts'
import { PrismaService } from 'lib/prisma.service'
import { EncryptionService } from 'lib/encryption.service'
import { LoginAdminDto, RegisterAdminDto } from './dto/auth.dto'
import { AnalyticsDto, FetchUserDto, SortUserDto, UserSuspensionDto } from './dto/user.dto'
import { PaymentChartDto } from './dto/analytics.dto'
import { TxHistoriesDto } from './dto/txHistory.dto'

@Injectable()
export class ModminService {
    constructor(
        private readonly response: SendRes,
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
        private readonly encryption: EncryptionService,
    ) { }

    async registerAdmin(
        res: Response,
        {
            password, fullName,
            email, registrationKey,
        }: RegisterAdminDto
    ) {
        try {
            fullName = titleName(fullName)
            const decodedKey = atob(registrationKey as string)
            if (decodedKey !== process.env.ADMIN_REGISTRATION_KEY) {
                this.response.sendError(res, StatusCodes.Unauthorized, 'Invalid registration key')
                return
            }

            const admins = await this.prisma.admin.count()
            if (admins === 10) {
                this.response.sendError(res, StatusCodes.Forbidden, "Maximum moderators reached.")
                return
            }

            const admin = await this.prisma.admin.findUnique({
                where: { email }
            })

            if (admin) {
                this.response.sendError(res, StatusCodes.Conflict, `Warning! Existing ${admin.role}`)
                return
            }

            password = await this.encryption.hashAsync(password)

            await this.prisma.admin.create({
                data: { email, fullName, password }
            })

            this.response.sendSuccess(res, StatusCodes.Created, { message: "You're now an Admin!" })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async loginAdmin(
        res: Response,
        { email, password }: LoginAdminDto
    ) {
        try {
            const admin = await this.prisma.admin.findUnique({ where: { email } })
            if (!admin) {
                this.response.sendError(res, StatusCodes.NotFound, 'Warning! Invalid email or password')
                return
            }

            const isMatch = await this.encryption.compareAsync(password, admin.password)

            if (!isMatch) {
                this.response.sendError(res, StatusCodes.Unauthorized, 'Incorrect Password')
                return
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                access_token: await this.misc.generateAccessToken({
                    role: admin.role,
                    sub: admin.id,
                })
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async userAnalytics(res: Response, { q }: AnalyticsDto) {
        try {
            let total: number

            if (q === "talent" || q === "creative" || q === "client") {
                total = await this.prisma.user.count({
                    where: { role: q }
                })
            } else if (q === "job") {
                total = await this.prisma.job.count()
            } else if (q === "user") {
                total = await this.prisma.user.count()
            } else {
                return this.response.sendError(res, StatusCodes.BadRequest, 'Query is required')
            }

            this.response.sendSuccess(res, StatusCodes.OK, { data: { [`${q}s`]: total } })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async toggleUserSuspension(
        res: Response,
        userId: string,
        { action }: UserSuspensionDto
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId }
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, 'User not found')
            }

            await this.prisma.user.update({
                where: { id: userId },
                data: { userStatus: action }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { message: "Successful" })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fetchUsers(
        res: Response,
        { q, s = "", page = 1, limit = 200, type }: FetchUserDto,
    ) {
        try {
            let users: {
                firstname: string
                username: string
                lastname: string
                email: string
                id: string
                avatar: {
                    idx: string
                    url: string
                    path: string
                    type: string
                }
                role: $Enums.Role
                createdAt: Date
                skill: never
                primarySkills: never
            }[]

            let total: number

            page = Number(page)
            limit = Number(limit)
            const offset = (page - 1) * limit

            const OR: ({
                firstname: {
                    contains: string
                    mode: "insensitive"
                }
            } | {
                username: {
                    contains: string
                    mode: "insensitive"
                }
            } | {
                lastname: {
                    contains: string
                    mode: "insensitive"
                }
            } | {
                email: {
                    contains: string
                    mode: "insensitive"
                }
            })[] = [
                    { firstname: { contains: s, mode: 'insensitive' } },
                    { username: { contains: s, mode: 'insensitive' } },
                    { lastname: { contains: s, mode: 'insensitive' } },
                    { email: { contains: s, mode: 'insensitive' } }
                ]

            const select: {
                id: true
                role: true
                skill: true
                email: true
                avatar: true
                username: true
                lastname: true
                firstname: true,
                createdAt: true,
                primarySkills: true,
            } = {
                id: true,
                role: true,
                skill: true,
                email: true,
                avatar: true,
                username: true,
                lastname: true,
                firstname: true,
                createdAt: true,
                primarySkills: true,
            }

            const orderBy: {
                createdAt: "desc"
            } | ({
                firstname: "asc"
            } | {
                lastname: "asc"
            })[] = q === "date" ? {
                createdAt: 'desc'
            } : [
                    { firstname: 'asc' },
                    { lastname: 'asc' },
                ]

            if (type === "verified") {
                users = await this.prisma.user.findMany({
                    where: {
                        verified: true,
                        OR
                    },
                    orderBy,
                    take: limit,
                    skip: offset,
                    select,
                })

                total = await this.prisma.user.count({ where: { verified: true } })
            } else if (type === "unverified") {
                users = await this.prisma.user.findMany({
                    where: {
                        verified: false,
                        OR
                    },
                    orderBy,
                    take: limit,
                    skip: offset,
                    select,
                })

                total = await this.prisma.user.count({ where: { verified: false } })
            } else {
                users = await this.prisma.user.findMany({
                    where: { OR },
                    orderBy,
                    take: limit,
                    skip: offset,
                    select,
                })

                total = await this.prisma.user.count()
            }

            this.response.sendSuccess(res, StatusCodes.OK, { data: { users, total } })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async userChart(res: Response) {
        try {
            const currentYear = new Date().getFullYear()
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ]

            const userCounts = []

            for (let i = 0; i < monthNames.length; i++) {
                const startDate = new Date(currentYear, i, 1)
                let endMonth = i + 1
                let endYear = currentYear

                if (endMonth === 12) {
                    endMonth = 1
                    endYear = currentYear + 1
                } else {
                    endMonth++
                }

                const endDate = new Date(endYear, endMonth - 1, 1)

                const count = await this.prisma.user.count({
                    where: {
                        AND: [
                            { createdAt: { gte: startDate } },
                            { createdAt: { lt: endDate } }
                        ]
                    }
                })

                userCounts.push({ monthName: monthNames[i], count })
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: {
                    chart: userCounts,
                    total: await this.prisma.user.count()
                }
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error caching chart")
        }
    }

    async articleAnalytics(res: Response) {
        try {
            const overallEngagements = await this.prisma.article.aggregate({
                _sum: {
                    views: true,
                    shares: true,
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: {
                    overallViewsCount: overallEngagements._sum.views,
                    overallSharesCount: overallEngagements._sum.shares,
                    overallLikesCount: await this.prisma.like.count(),
                    overallCommentsCount: await this.prisma.comment.count(),
                    overallArticlesCount: await this.prisma.article.count(),
                }
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fetchUserProfile(res: Response, userId: string) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId, },
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
                    creative: {
                        select: {
                            bio: true,
                            personalInfo: true,
                            certifications: true,
                        }
                    },
                    talent: {
                        select: {
                            bioStats: true,
                            personalInfo: true,
                        }
                    },
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: user })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async toggleUserVerification(res: Response, userId: string) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId }
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, "User not found")
            }

            const updatedUser = await this.prisma.user.update({
                where: { id: userId },
                data: { verified: !!user.verified }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: updatedUser.verified ? 'User is now verified' : 'Verifiction has been removed'
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async referralAnalytics(res: Response) {
        const totalReferredUsers = await this.prisma.referred.count()
        const totalReferrals = await this.prisma.referral.count({ where: { points: { gte: 10 } } })
        const { _sum: { points } } = await this.prisma.referral.aggregate({
            _sum: { points: true }
        })

        this.response.sendSuccess(res, StatusCodes.OK, {
            data: { totalReferredUsers, totalPoints: points ?? 0, totalReferrals }
        })
    }

    async referralChart(res: Response) {
        try {
            const currentYear = new Date().getFullYear()
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June', 'July',
                'August', 'September', 'October', 'November', 'December'
            ]

            const referralCounts = [] as {
                monthName: string
                count: number
            }[]

            for (let i = 0; i < monthNames.length; i++) {
                const startDate = new Date(currentYear, i, 1)
                let endMonth = i + 1
                let endYear = currentYear

                if (endMonth === 12) {
                    endMonth = 1
                    endYear = currentYear + 1
                } else {
                    endMonth++
                }

                const endDate = new Date(endYear, endMonth - 1, 1)

                const count = await this.prisma.referral.count({
                    where: {
                        points: { gte: 10 },
                        AND: [
                            { createdAt: { gte: startDate } },
                            { createdAt: { lt: endDate } }
                        ]
                    }
                })

                referralCounts.push({ monthName: monthNames[i], count })
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: {
                    chart: referralCounts,
                    total: await this.prisma.referral.count({ where: { points: { gte: 10 } } })
                }
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error caching chart")
        }
    }

    async fetchReferrals(
        res: Response,
        { q, s = '', page = 1, limit = 50 }: SortUserDto
    ) {
        limit = Number(limit)
        const offset = (Number(page) - 1) * limit

        const referrals = await this.prisma.referral.findMany({
            where: {
                points: { gte: 10 },
                OR: [
                    { user: { username: { contains: s, mode: 'insensitive' } } },
                    { user: { lastname: { contains: s, mode: 'insensitive' } } },
                    { user: { firstname: { contains: s, mode: 'insensitive' } } },
                ],
            },
            take: limit,
            skip: offset,
            orderBy: q === "date" ?
                { createdAt: 'desc' } :
                q === "name" ?
                    { user: { firstname: 'asc' } } :
                    { points: 'asc' },
            include: {
                user: {
                    select: {
                        id: true,
                        role: true,
                        avatar: true,
                        username: true,
                        lastname: true,
                        firstname: true,
                    }
                }
            }
        })

        const referralsWithTotalReferred = await Promise.all(referrals.map(async (referral) => {
            const totalReferred = await this.prisma.referred.count({ where: { referralId: referral.id } })

            return { ...referral, totalReferred }
        }))

        this.response.sendSuccess(res, StatusCodes.OK, { data: referralsWithTotalReferred })
    }

    async fetchReferral(res: Response, referralId: string) {
        const referral = await this.prisma.referral.findUnique({
            where: { id: referralId },
            include: {
                referred: {
                    select: {
                        createdAt: true,
                        referral: {
                            select: {
                                id: true,
                                points: true,
                            }
                        },
                        user: {
                            select: {
                                id: true,
                                avatar: true,
                                username: true,
                                verified: true,
                                lastname: true,
                                firstname: true,
                            }
                        }
                    }
                },
                user: {
                    select: {
                        id: true,
                        avatar: true,
                        username: true,
                        verified: true,
                        lastname: true,
                        firstname: true,
                    }
                }
            }
        })

        if (!referral) {
            return this.response.sendError(res, StatusCodes.NotFound, 'Referral not found')
        }

        this.response.sendSuccess(res, StatusCodes.OK, { data: referral })
    }

    async paymentAnalytics(res: Response) {
        const inflow = await this.prisma.totalInflow() ?? 0
        const outflow = await this.prisma.totalOutflow() ?? 0

        const { _sum: { processsingFee: income } } = await this.prisma.txHistory.aggregate({
            where: {},
            _sum: { processsingFee: true }
        })

        this.response.sendSuccess(res, StatusCodes.OK, { data: { income: income ?? 0, inflow, outflow } })
    }

    async paymentCharts(res: Response, { q }: PaymentChartDto) {
        try {
            const currentYear = new Date().getFullYear()
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June', 'July',
                'August', 'September', 'October', 'November', 'December'
            ]

            const totalAmount = [] as {
                monthName: string
                amount: number
            }[]

            let total: number = 0

            if (q === "income") {
                const aggregate = await this.prisma.txHistory.aggregate({
                    where: { status: 'SUCCESS' },
                    _sum: { settlementAmount: true }
                })

                total = aggregate._sum.settlementAmount ?? 0
            } else {
                const aggregate = await this.prisma.txHistory.aggregate({
                    where: {
                        status: 'SUCCESS',
                        type: q === "inflow" ? 'DEPOSIT' : 'WITHDRAWAL',
                    },
                    _sum: { settlementAmount: true }
                })

                total = aggregate._sum.settlementAmount ?? 0
            }

            for (let i = 0; i < monthNames.length; i++) {
                const startDate = new Date(currentYear, i, 1)
                let endMonth = i + 1
                let endYear = currentYear

                if (endMonth === 12) {
                    endMonth = 1
                    endYear = currentYear + 1
                } else {
                    endMonth++
                }

                const endDate = new Date(endYear, endMonth - 1, 1)

                let amount = 0

                if (q === "income") {
                    const aggregate = await this.prisma.txHistory.aggregate({
                        where: {
                            status: 'SUCCESS',
                            AND: [
                                { createdAt: { gte: startDate } },
                                { createdAt: { lt: endDate } }
                            ]
                        },
                        _sum: { settlementAmount: true }
                    })

                    amount = aggregate._sum.settlementAmount ?? 0
                } else {
                    const aggregate = await this.prisma.txHistory.aggregate({
                        where: {
                            status: 'SUCCESS',
                            type: q === "inflow" ? 'DEPOSIT' : 'WITHDRAWAL',
                            AND: [
                                { createdAt: { gte: startDate } },
                                { createdAt: { lt: endDate } }
                            ]
                        },
                        _sum: { settlementAmount: true }
                    })

                    amount = aggregate._sum.settlementAmount ?? 0
                }

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

    async fetchTransactionHistories(
        res: Response,
        {
            s = '', limit = 100, page = 1, endDate = '',
            startDate = '', type = null, status = null, q,
        }: TxHistoriesDto
    ) {
        try {
            page = Number(page)
            limit = Number(limit)
            const offset = (page - 1) * limit

            if (type && !['WITHDRAWAL', 'DEPOSIT',].includes(type.toUpperCase())) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'Invalid type query')
            }

            if (status && !['SUCCESS', 'FAILED', 'REVERSED', 'PENDING'].includes(status.toUpperCase())
            ) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'Invalid status query')
            }

            const txHistories = await this.prisma.txHistory.findMany({
                where: {
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
                },
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
                },
                skip: offset,
                take: limit,
                orderBy: q === "amount" ? { amount: 'asc' } : { updatedAt: 'desc' },
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: txHistories })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error caching chart")
        }
    }
}
