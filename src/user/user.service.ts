import { Response } from 'express'
import {
    FetchProfilesDto, InfiniteScrollDto
} from './dto/infinite-scroll.dto'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { PrismaService } from 'lib/prisma.service'
import { FetchReviewsDTO, RatingDTO } from './dto/rating.dto'
import { PaystackService } from 'lib/Paystack/paystack.service'
import { FectchContractsDTO } from './dto/contract.dto'
import { $Enums, ContractStatus } from '@prisma/client'

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
            limit = Number(limit)
            const offset = (Number(page) - 1) * limit

            const OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { lastname: { contains: search, mode: 'insensitive' } },
                { firstname: { contains: search, mode: 'insensitive' } },
            ]

            const users = await this.prisma.user.findMany({
                // @ts-ignore
                where: { OR, role },
                take: limit,
                skip: offset,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    role: true,
                    email: true,
                    avatar: true,
                    username: true,
                    lastname: true,
                    verified: true,
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

            const totalProfiles = await this.prisma.user.count({
                // @ts-ignore
                where: { OR, role },
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: users,
                totalProfiles,
                totalPages: Math.ceil(totalProfiles / limit)
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fetchProfile(res: Response, userId: string) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    role: true,
                    email: true,
                    skills: true,
                    avatar: true,
                    verified: true,
                    username: true,
                    lastname: true,
                    firstname: true,
                    portfolio: true,
                    createdAt: true,
                    userStatus: true,
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
                    primarySkill: true,
                    skillAttachments: true,
                }
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, "User not found")
            }

            this.response.sendSuccess(res, StatusCodes.OK, { data: user })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async similarProfiles(res: Response, userId: string) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                include: {
                    creative: {
                        select: {
                            personalInfo: true,

                        }
                    },
                    talent: {
                        select: {
                            personalInfo: true
                        }
                    }
                }
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, "Profile not found")
            }

            const simiarProfiles = await this.prisma.user.findMany({
                where: {
                    OR: [
                        { primarySkill: { equals: user.primarySkill, mode: 'insensitive' } },
                        { lastname: { equals: user.lastname, mode: 'insensitive' } },
                        {
                            [user.role]: {
                                personalInfo: {
                                    state: {
                                        contains: user[user.role].personalInfo.state ?? '',
                                        mode: 'insensitive'
                                    }
                                }
                            }
                        },
                        {
                            [user.role]: {
                                personalInfo: {
                                    languages: { hasSome: user[user.role].personalInfo.languages }
                                }
                            }
                        },
                        {
                            [user.role]: {
                                personalInfo: {
                                    localGovt: {
                                        contains: user[user.role].personalInfo.localGovt ?? '',
                                        mode: 'insensitive'
                                    }
                                }
                            }
                        },
                        {
                            [user.role]: {
                                personalInfo: {
                                    address: {
                                        contains: user[user.role].personalInfo.address ?? '',
                                        mode: 'insensitive'
                                    }
                                }
                            }
                        },
                    ]
                },
                select: {
                    id: true,
                    email: true,
                    avatar: true,
                    username: true,
                    lastname: true,
                    firstname: true,
                    primarySkill: true,
                    [user.role]: {
                        select: {
                            personalInfo: {
                                select: {
                                    state: true
                                }
                            }
                        }
                    }
                },
                take: 10
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: simiarProfiles })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fetchMyProfile(
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
                    wallet: true,
                    username: true,
                    lastname: true,
                    verified: true,
                    firstname: true,
                    portfolio: true,
                    createdAt: true,
                    bankDetails: true,
                    experiences: true,
                    primarySkill: true,
                    skillAttachments: true,
                    rateAndAvailability: true,
                    [role]: {
                        select: role === "talent" ? {
                            bioStats: true,
                            personalInfo: true,
                        } : role === "creative" ? {
                            bio: true,
                            personalInfo: true,
                            certifications: true,
                        } : { userId: true }
                    },
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: user })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async referral(
        res: Response,
        { sub }: ExpressUser,
        { limit = 100, page = 1, search = '' }: InfiniteScrollDto
    ) {
        try {
            limit = Number(limit)
            const offset = (Number(page) - 1) * limit

            const referral = await this.prisma.referral.findUnique({
                where: { userId: sub }
            })

            const referred = await this.prisma.referred.findMany({
                where: {
                    referralId: referral.id,
                    OR: [
                        { user: { firstname: { contains: search, mode: 'insensitive' } } },
                        { user: { firstname: { contains: search, mode: 'insensitive' } } },
                        { user: { username: { contains: search, mode: 'insensitive' } } },
                        { user: { primarySkill: { contains: search, mode: 'insensitive' } } },
                    ]
                },
                skip: offset,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    user: {
                        select: {
                            id: true,
                            role: true,
                            avatar: true,
                            username: true,
                            lastname: true,
                            firstname: true,
                            primarySkill: true,
                        }
                    }
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: { referral, referred } })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async rateUser(
        res: Response,
        targetUserId: string,
        { sub, role }: ExpressUser,
        { point, review }: RatingDTO
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: targetUserId }
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, "Target user not found")
            }

            if (role === "client") {
                if (user.role !== "creative" && user.role !== "talent") {
                    return this.response.sendError(res, StatusCodes.Forbidden, "You can either rate only talents/creatives")
                }
            }

            if (role === "talent" || role === "creative") {
                if (user.role !== "client") {
                    return this.response.sendError(res, StatusCodes.Forbidden, "You can only rate clients")
                }
            }

            const rating = await this.prisma.rating.create({
                data: {
                    point, review: review.trim(),
                    rater: { connect: { id: sub } },
                    target: { connect: { id: user.id } },
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: rating })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fetchReviews(
        res: Response,
        userId: string,
        {
            point, search = '',
            limit = 200, page = 1,
        }: FetchReviewsDTO
    ) {
        try {
            limit = Number(limit)
            const offset = (Number(page) - 1) * limit

            const reviews = await this.prisma.rating.findMany({
                where: point ? {
                    point,
                    targetUserId: userId,
                    OR: [
                        { review: { contains: search, mode: 'insensitive' } }
                    ],
                } : {
                    targetUserId: userId,
                    OR: [
                        { review: { contains: search, mode: 'insensitive' } }
                    ],
                },
                select: {
                    id: true,
                    point: true,
                    review: true,
                    rater: {
                        select: {
                            avatar: true,
                            lastname: true,
                            firstname: true,
                            username: true,
                        }
                    },
                },
                take: limit,
                skip: offset,
                orderBy: { createdAt: 'desc' }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: reviews })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async ratingAnalytics(
        res: Response,
        userId: string
    ) {
        try {
            const ratings = await this.prisma.rating.count({
                where: { targetUserId: userId }
            })

            const rating = await this.prisma.getTotalRating(userId)

            const pointTypes = [
                {
                    point: 1.0,
                    label: 'ONE'
                },
                {
                    point: 2.0,
                    label: 'TWO'
                },
                {
                    point: 3.0,
                    label: 'THREE'
                },
                {
                    point: 4.0,
                    label: 'FOUR'
                },
                {
                    point: 5.0,
                    label: 'FIVE'
                },
            ]

            let chart: {
                label: string
                points: number
            }[] = []

            let total = 0

            for (const pointType of pointTypes) {
                const rating = await this.prisma.rating.aggregate({
                    where: {
                        targetUserId: userId,
                        point: pointType.point
                    },
                    _sum: { point: true }
                })

                chart.push({
                    label: pointType.label,
                    points: rating._sum.point ?? 0
                })
                total += rating._sum.point ?? 0
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: { chart, total, ratings, rating }
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async deleteRating(
        res: Response,
        ratingId: string,
        { sub, role }: ExpressUser,
    ) {
        try {
            const existingRating = await this.prisma.rating.findUnique({
                where: { id: ratingId },
            })

            if (!existingRating) {
                return this.response.sendError(res, StatusCodes.NotFound, "Rating not found")
            }

            if ((role !== "admin") && (existingRating.raterUserId !== sub)) {
                return this.response.sendError(res, StatusCodes.Forbidden, "You are not authorized to delete this rating")
            }

            await this.prisma.rating.delete({
                where: { id: ratingId },
            })

            this.response.sendSuccess(res, StatusCodes.OK, { message: "Rating deleted successfully" })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fetchContracts(
        res: Response,
        { sub, role }: ExpressUser,
        {
            limit = 50, page = 1,
            sortBy, search = "", tab,
        }: FectchContractsDTO,
    ) {
        try {
            limit = Number(limit)
            const offset = (page - 1) * limit

            let contracts: {
                id: string
                createdAt: Date
                status: $Enums.ContractStatus
                project: {
                    id: string
                    brief: {
                        id: string
                        createdAt: Date
                        type: string
                        title: string
                        category: string
                        projectType: $Enums.BriefFormType
                    }
                }
                totalApplied?: number
            }[]

            let orderBy: ({
                project: {
                    brief: {
                        type: "asc"
                    }
                }
            } | {
                project: {
                    brief: {
                        title: "asc"
                    }
                }
            } | {
                project: {
                    brief: {
                        category: "asc"
                    }
                }
            })[] | {
                updatedAt: "desc"
            } = sortBy === "name" ? [
                { project: { brief: { type: 'asc' } } },
                { project: { brief: { title: 'asc' } } },
                { project: { brief: { category: 'asc' } } },
            ] : { updatedAt: 'desc' }

            const statuses: ContractStatus[] = ['REJECTED', 'PENDING', 'SIGNED']
            let analytics: {
                count: number
                status: string
            }[] = [
                    {
                        count: await this.prisma.contract.count({
                            where: {
                                user: role === "admin" ? {} : { role, id: sub },
                            }
                        }),
                        status: 'TOTAL'
                    }
                ]

            for (const status of statuses) {
                const count = await this.prisma.contract.count({
                    where: {
                        status,
                        user: role === "admin" ? {} : { role, id: sub },
                    }
                })

                analytics.push({ count, status })
            }

            const OR: ({
                project: {
                    brief: {
                        title: {
                            contains: string
                            mode: "insensitive"
                        }
                    }
                }
            } | {
                project: {
                    brief: {
                        type: {
                            contains: string
                            mode: "insensitive"
                        }
                    }
                }
            } | {
                project: {
                    brief: {
                        category: {
                            contains: string
                            mode: "insensitive"
                        }
                    }
                }
            })[] = [
                    { project: { brief: { title: { contains: search, mode: 'insensitive' } } } },
                    { project: { brief: { type: { contains: search, mode: 'insensitive' } } } },
                    { project: { brief: { category: { contains: search, mode: 'insensitive' } } } },
                ]

            if (!tab && (role === "creative" || role === "talent")) {
                contracts = await this.prisma.contract.findMany({
                    where: { OR, userId: sub },
                    select: {
                        id: true,
                        status: true,
                        createdAt: true,
                        project: {
                            select: {
                                id: true,
                                brief: {
                                    select: {
                                        id: true,
                                        type: true,
                                        title: true,
                                        category: true,
                                        createdAt: true,
                                        projectType: true,
                                    }
                                }
                            }
                        }
                    },
                    orderBy,
                    take: limit,
                    skip: offset,
                })
            } else {
                contracts = await this.prisma.contract.findMany({
                    where: role === "admin" ? { OR, user: { role: tab } } : { OR, userId: sub },
                    select: {
                        id: true,
                        status: true,
                        createdAt: true,
                        project: {
                            select: {
                                id: true,
                                brief: {
                                    select: {
                                        id: true,
                                        type: true,
                                        title: true,
                                        category: true,
                                        createdAt: true,
                                        projectType: true,
                                    }
                                }
                            }
                        }
                    },
                    orderBy,
                    take: limit,
                    skip: offset,
                })
            }

            contracts = await Promise.all(
                contracts.map(async (contract) => {
                    const totalApplied = await this.prisma.hire.count({
                        where: { projectId: contract.project.id },
                    })
                    return { ...contract, totalApplied }
                })
            )

            this.response.sendSuccess(res, StatusCodes.OK, { data: contracts })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }
}
