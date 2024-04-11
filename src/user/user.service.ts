import { Response } from 'express'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { PrismaService } from 'lib/prisma.service'
import { FetchProfilesDto } from './dto/infinite-scroll.dto'

@Injectable()
export class UserService {
    constructor(
        private readonly response: SendRes,
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
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
                    skill: true,
                    email: true,
                    avatar: true,
                    username: true,
                    lastname: true,
                    firstname: true,
                    creative: {
                        select: {
                            bio: true,
                        }
                    },
                    talent: {
                        select: {
                            bio: true
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
                    skill: true,
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
                    skillAttachments: true,
                    creative: {
                        select: {
                            bio: true,
                            personalInfo: true,
                            ratesAndAvailability: true,
                        }
                    },
                    talent: {
                        select: {
                            bio: true,
                            personalInfo: true,
                            ratesAndAvailability: true,
                        }
                    }
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: user })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async jobList(res: Response) {
        const jobs = await this.prisma.job.findMany({
            where: {
                status: 'APPROVED'
            },
            orderBy: { approvedAt: 'desc' }
        })

        this.response.sendSuccess(res, StatusCodes.OK, { data: jobs })
    }

    async getJob(res: Response, jobId: string) {
        const job = await this.prisma.job.findUnique({
            where: { id: jobId }
        })

        if (!job) {
            return this.response.sendError(res, StatusCodes.NotFound, 'Job not found')
        }

        this.response.sendSuccess(res, StatusCodes.OK, { data: job })
    }
}
