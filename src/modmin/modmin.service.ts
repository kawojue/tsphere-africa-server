import { Response } from 'express'
import { $Enums, ContractStatus, ProjectStatus } from '@prisma/client'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { titleText } from 'helpers/formatTexts'
import { PrismaService } from 'lib/prisma.service'
import {
    UpdateProjectStatusDTO, UpdateContractStatusDTO
} from './dto/status.dto'
import { EncryptionService } from 'lib/encryption.service'
import {
    AnalyticsDto, FetchUserDto, SortUserDto, UserSuspensionDto
} from './dto/user.dto'
import { LoginAdminDto, RegisterAdminDto } from './dto/auth.dto'

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
            fullName = titleText(fullName)
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
        { q, s = '', page = 1, limit = 200, type }: FetchUserDto,
    ) {
        try {
            s = s.trim()
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
                primarySkill: string | null
            }[]

            let total: number
            s = s?.trim() ?? ''
            limit = Number(limit)
            const offset = (Number(page) - 1) * limit

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

            const select = {
                id: true,
                role: true,
                email: true,
                avatar: true,
                verified: true,
                username: true,
                lastname: true,
                firstname: true,
                createdAt: true,
                primarySkill: true,
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

                total = await this.prisma.user.count({ where: { verified: true, OR } })
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

                total = await this.prisma.user.count({ where: { verified: false, OR } })
            } else {
                users = await this.prisma.user.findMany({
                    where: { OR },
                    orderBy,
                    take: limit,
                    skip: offset,
                    select,
                })

                total = await this.prisma.user.count({ where: { OR } })
            }

            const totalPages = Math.ceil(total / limit)

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: { users, total, totalPages }
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async userChart(res: Response) {
        try {
            let total = 0
            const chart = []

            const currentYear = new Date().getFullYear()
            const monthNames = [
                'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
            ]

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

                chart.push({ monthName: monthNames[i], count })
                total += count
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: { chart, total }
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
                'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
            ]

            let total = 0
            const chart = [] as {
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

                chart.push({ monthName: monthNames[i], count })
                total += count
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: { chart, total }
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error caching chart")
        }
    }

    async fetchReferrals(
        res: Response,
        { q, s = '', page = 1, limit = 50 }: SortUserDto
    ) {
        try {
            s = s?.trim() ?? ''
            limit = Number(limit)
            const offset = (Number(page) - 1) * limit

            const OR: ({
                user: {
                    username: {
                        contains: string
                        mode: "insensitive"
                    }
                }
            } | {
                user: {
                    lastname: {
                        contains: string
                        mode: "insensitive"
                    }
                }
            } | {
                user: {
                    firstname: {
                        contains: string
                        mode: "insensitive"
                    }
                }
            })[] = [
                    { user: { username: { contains: s, mode: 'insensitive' } } },
                    { user: { lastname: { contains: s, mode: 'insensitive' } } },
                    { user: { firstname: { contains: s, mode: 'insensitive' } } },
                ]

            const referrals = await this.prisma.referral.findMany({
                where: {
                    points: { gte: 10 },
                    OR
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

            const totalReferrals = await this.prisma.referral.count({
                where: {
                    points: { gte: 10 },
                    OR,
                },
            })

            const referralsWithTotalReferred = await Promise.all(referrals.map(async (referral) => {
                const totalReferred = await this.prisma.referred.count({ where: { referralId: referral.id } })

                return { ...referral, totalReferred }
            }))

            this.response.sendSuccess(res, StatusCodes.OK, {
                totalReferrals,
                data: referralsWithTotalReferred,
                totalPages: Math.ceil(totalReferrals / limit),
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
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

    async updateProjectStatus(
        res: Response,
        projectId: string,
        { q }: UpdateProjectStatusDTO,
    ) {
        try {
            const project = await this.prisma.project.findUnique({
                where: { id: projectId }
            })

            if (!project) {
                return this.response.sendError(res, StatusCodes.NotFound, "Project not found")
            }

            const newProject = await this.prisma.project.update({
                where: { id: project.id },
                data: { status: q }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: newProject,
                message: "Status has been changed"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error changing status")
        }
    }

    async updateContractStatus(
        res: Response,
        contractId: string,
        { q }: UpdateContractStatusDTO,
    ) {
        try {
            const contract = await this.prisma.contract.findUnique({
                where: { id: contractId }
            })

            if (!contract) {
                return this.response.sendError(res, StatusCodes.NotFound, "Contract not found")
            }

            const allowedStatuses: ContractStatus[] = ['APPROVED', 'REJECTED']
            if (!allowedStatuses.includes(q)) {
                return this.response.sendError(res, StatusCodes.BadRequest, "The only available statuses are APPROVED/REJECTED")
            }

            const newContract = await this.prisma.contract.update({
                where: { id: contractId },
                data: { status: q }
            })

            if (newContract && newContract.status === "APPROVED") {
                const hires = await this.prisma.hire.findMany({
                    where: { projectId: contract.projectId }
                })

                for (const hire of hires) {
                    if (hire.status === "ACCEPTED") {
                        await this.prisma.contract.update({
                            where: { id: contract.id },
                            data: {
                                user: { connect: { id: hire.talentOrCreativeId } }
                            }
                        })
                    }
                }
            } else if (newContract.status === "REJECTED") {
                await this.prisma.contract.update({
                    where: { id: contractId },
                    data: {
                        user: { disconnect: true }
                    }
                })
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: newContract,
                message: "Status has been updated"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error changing status")
        }
    }
}
