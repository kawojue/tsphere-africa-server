import { Job } from '@prisma/client'
import { Request, Response } from 'express'
import { PostJobDto } from './dto/job.dto'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { PrismaService } from 'lib/prisma.service'
import { InfiniteScrollDto } from 'src/user/dto/infinite-scroll.dto'

@Injectable()
export class JobService {
    constructor(
        private readonly response: SendRes,
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
    ) { }

    async postJob(
        res: Response,
        { sub, role }: ExpressUser,
        {
            job_title, job_type, playingAge, rate, duration,
            applicaion_deadline, description, experience,
            gender, requirement, job_role, location,
        }: PostJobDto
    ) {
        try {
            let job: Job
            if (role === "admin") {
                job = await this.prisma.job.create({
                    data: {
                        type: job_type, title: job_title, playingAge, rate,
                        role: job_role, app_deadline: applicaion_deadline,
                        duration: duration ? new Date(duration) : null,
                        gender, requirement, description, experience,
                        approvedAt: new Date(), status: 'APPROVED',
                        admin: { connect: { id: sub } }, location,
                    }
                })
            } else {
                job = await this.prisma.job.create({
                    data: {
                        role: job_role, type: job_type,
                        app_deadline: applicaion_deadline,
                        title: job_title, playingAge, rate, location,
                        gender, requirement, description, experience,
                        duration: duration ? new Date(duration) : null,
                        user: { connect: { id: sub } }, status: 'PENDING'
                    }
                })
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: job,
                message: "Job has been posted"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Encountered an error while posting job")
        }
    }

    async removeJob(
        res: Response,
        jobId: string,
        { sub, role }: ExpressUser,
    ) {
        try {
            const job = await this.prisma.job.findUnique({
                where: { id: jobId }
            })

            if (!job) {
                return this.response.sendError(res, StatusCodes.NotFound, "Job not found")
            }

            if (role === "client") {
                if (job.userId !== sub) {
                    return this.response.sendError(res, StatusCodes.Unauthorized, "Can't delete job")
                }

                await this.prisma.job.delete({
                    where: { id: jobId }
                })
            } else if (role === "admin") {
                await this.prisma.job.delete({
                    where: { id: jobId }
                })
            } else {
                return this.response.sendError(res, StatusCodes.Forbidden, "Invalid role")
            }

            this.response.sendSuccess(res, StatusCodes.OK, { message: "Job removed successfully" })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async approveJob(res: Response, jobId: string) {
        try {
            const job = await this.prisma.job.findUnique({
                where: { id: jobId }
            })

            if (!job) {
                return this.response.sendError(res, StatusCodes.NotFound, "Job not found")
            }

            if (job.status === 'PENDING') {
                return this.response.sendError(res, StatusCodes.Unauthorized, "Job is pending approval")
            }

            await this.prisma.job.update({
                where: { id: jobId },
                data: { status: 'APPROVED', approvedAt: new Date() }
            })
            this.response.sendSuccess(res, StatusCodes.OK, { message: "Job removed successfully" })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async applyJob(
        res: Response,
        jobId: string,
        { sub }: ExpressUser
    ) {
        try {
            const job = await this.prisma.job.findUnique({
                where: { id: jobId }
            })

            if (!job) {
                return this.response.sendError(res, StatusCodes.NotFound, "Job not found")
            }

            const alreadyApplied = await this.prisma.jobApplication.findUnique({
                where: {
                    userId_jobId: {
                        userId: sub,
                        jobId,
                    }
                }
            })

            if (alreadyApplied) {
                return this.response.sendError(res, StatusCodes.Conflict, "You've already applied for this job")
            }

            await this.prisma.jobApplication.create({
                data: {
                    job: { connect: { id: jobId } },
                    user: { connect: { id: sub } }
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { message: "Your profile has been sent" })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fetchJobs(
        res: Response,
        { sub, role }: ExpressUser
    ) {
        let jobs: Job[]

        if (role === "client") {
            jobs = await this.prisma.job.findMany({
                where: { userId: sub },
                orderBy: [{ status: 'desc' }, { postedAt: 'desc' }]
            })
        } else if (role === "admin") {
            jobs = await this.prisma.job.findMany({
                orderBy: [{ status: 'desc' }, { postedAt: 'desc' }]
            })
        } else {
            return this.response.sendError(res, StatusCodes.Forbidden, "Invalid role")
        }

        this.response.sendSuccess(res, StatusCodes.OK, { data: jobs })
    }

    async jobList(
        req: Request,
        res: Response,
        { page = 1, limit = 50, search = '' }: InfiniteScrollDto
    ) {
        try {
            // @ts-ignore
            const role = req.user?.role
            // @ts-ignore
            const userId = req.user?.sub

            page = Number(page)
            limit = Number(limit)
            const offset = (page - 1) * limit

            let jobs: Job[] = []

            if (userId) {
                const user = await this.prisma.user.findUnique({
                    where: { id: userId },
                    include: {
                        talent: {
                            include: {
                                bioStats: true,
                                personalInfo: {
                                    select: {
                                        state: true,
                                        gender: true,
                                        country: true,
                                        localGovt: true,
                                    }
                                },
                            }
                        },
                        creative: {
                            include: {
                                personalInfo: {
                                    select: {
                                        state: true,
                                        gender: true,
                                        country: true,
                                        localGovt: true,
                                    }
                                }
                            }
                        }
                    }
                })

                if (user) {
                    const personalInfo = role === "creative" ? user.creative?.personalInfo : user.talent?.personalInfo
                    const bio = role === "creative" ? user.creative?.bio : user.talent?.bioStats.bio

                    if (personalInfo && bio) {
                        jobs = await this.prisma.job.findMany({
                            where: {
                                status: 'APPROVED',
                                OR: [
                                    { gender: { equals: personalInfo.gender } },
                                    { role: { contains: user.role, mode: 'insensitive' } },
                                    { role: { contains: user.skill, mode: 'insensitive' } },
                                    { requirement: { contains: bio, mode: 'insensitive' } },
                                    { description: { contains: bio, mode: 'insensitive' } },
                                    { requirement: { contains: user.role, mode: 'insensitive' } },
                                    { description: { contains: user.skill, mode: 'insensitive' } },
                                    { location: { contains: personalInfo.state, mode: 'insensitive' } },
                                    { location: { contains: personalInfo.country, mode: 'insensitive' } },
                                    { location: { contains: personalInfo.localGovt, mode: 'insensitive' } },
                                ]
                            },
                            orderBy: { approvedAt: 'desc' },
                            skip: offset,
                            take: limit,
                        })
                    }
                }
            } else if (search) {
                jobs = await this.prisma.job.findMany({
                    where: {
                        status: 'APPROVED',
                        OR: [
                            { role: { contains: search, mode: 'insensitive' } },
                            { role: { contains: search, mode: 'insensitive' } },
                            { location: { contains: search, mode: 'insensitive' } },
                            { location: { contains: search, mode: 'insensitive' } },
                            { location: { contains: search, mode: 'insensitive' } },
                            { requirement: { contains: search, mode: 'insensitive' } },
                            { description: { contains: search, mode: 'insensitive' } },
                            { requirement: { contains: search, mode: 'insensitive' } },
                            { description: { contains: search, mode: 'insensitive' } },
                        ]
                    },
                    orderBy: { approvedAt: 'desc' },
                    skip: offset,
                    take: limit,
                })
            } else {
                jobs = await this.prisma.job.findMany({
                    where: { status: 'APPROVED' },
                    orderBy: { approvedAt: 'desc' },
                    skip: offset,
                    take: limit,
                })
            }

            this.response.sendSuccess(res, StatusCodes.OK, { data: jobs })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error listing jobs")
        }
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

    async fetchJobApplicants(
        res: Response,
        jobId: string,
        { role, sub }: ExpressUser,
    ) {
        try {
            let job: Job
            let applicants = []

            if (role === "client") {
                let job = await this.prisma.job.findUnique({
                    where: { id: jobId, userId: sub }
                })

                if (!job) {
                    return this.response.sendError(res, StatusCodes.NotFound, 'Job not found')
                }
            } else if (role === "admin") {
                let job = await this.prisma.job.findUnique({
                    where: { id: jobId }
                })

                if (!job) {
                    return this.response.sendError(res, StatusCodes.NotFound, 'Job not found')
                }
            } else {
                return this.response.sendError(res, StatusCodes.Forbidden, "Invalid role")
            }

            if (job) {
                applicants = await this.prisma.jobApplication.findMany({
                    where: { jobId: job.id },
                    include: {
                        job: true,
                        user: {
                            select: {
                                role: true,
                                skill: true,
                                email: true,
                                avatar: true,
                                username: true,
                                lastname: true,
                                firstname: true,
                                email_verified: true,
                                rateAndAvailability: true,
                            }
                        }
                    }
                })
            }

            this.response.sendSuccess(res, StatusCodes.OK, { data: applicants })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fetchAllJobApplicants(res: Response) {
        const applicants = await this.prisma.jobApplication.findMany({
            include: {
                job: true,
                user: {
                    select: {
                        role: true,
                        skill: true,
                        email: true,
                        avatar: true,
                        username: true,
                        lastname: true,
                        firstname: true,
                        email_verified: true,
                        rateAndAvailability: true,
                    }
                }
            },
            orderBy: { appliedAt: 'desc' }
        })

        this.response.sendSuccess(res, StatusCodes.OK, { data: applicants })
    }
}
