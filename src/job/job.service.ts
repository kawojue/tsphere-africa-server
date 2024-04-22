import { Job } from '@prisma/client'
import { validateFile } from 'utils/file'
import { PostJobDto } from './dto/job.dto'
import { Request, Response } from 'express'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { AwsService } from 'lib/aws.service'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { genFileName } from 'helpers/genFilename'
import { PrismaService } from 'lib/prisma.service'
import { InfiniteScrollDto } from 'src/user/dto/infinite-scroll.dto'

@Injectable()
export class JobService {
    constructor(
        private readonly aws: AwsService,
        private readonly response: SendRes,
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
    ) { }

    async postJob(
        res: Response,
        { sub, role }: ExpressUser,
        files: Express.Multer.File[],
        {
            duration, applicaion_deadline, description,
            experience, requirement, location, job_role,
            job_title, job_type, playingAge, rate, gender,
        }: PostJobDto
    ) {
        try {
            if (files.length > 10) {
                return this.response.sendError(res, StatusCodes.PayloadTooLarge, "Only a maximum of 10 files is allowed")
            }

            if (new Date(applicaion_deadline) < new Date()) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'Invalid deadline date')
            }

            let filesArray = [] as IFile[]
            try {
                const results = await Promise.all(files.map(async (file) => {
                    const result = validateFile(file, 30 << 20, 'jpg', 'png', 'mp4', 'mp3', 'wav', 'aac')
                    if (result?.status) {
                        return this.response.sendError(res, result.status, result.message)
                    }

                    const path = `${sub}/${genFileName()}`
                    await this.aws.uploadS3(result.file, path)
                    return {
                        path,
                        type: file.mimetype,
                        url: this.aws.getS3(path),
                    }
                }))

                filesArray = results.filter((result): result is IFile => !!result)
            } catch {
                try {
                    if (filesArray.length > 0) {
                        for (const file of filesArray) {
                            if (file?.path) {
                                await this.aws.deleteS3(file.path)
                            }
                        }
                    }
                    filesArray = []
                } catch (err) {
                    this.misc.handleServerError(res, err, err.message)
                }
            }

            const job = await this.prisma.job.create({
                data: {
                    role: job_role, type: job_type, title: job_title,
                    app_deadline: new Date(applicaion_deadline), location,
                    duration: duration ? new Date(duration) : null, description,
                    status: role === "admin" ? 'APPROVED' : 'PENDING', playingAge,
                    attachments: filesArray, gender, requirement, experience, rate,
                    [role === "admin" ? 'admin' : 'user']: { connect: { id: sub } },
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: job,
                message: `${role === "admin" ? 'Job has been posted' : 'Posted but pending approval'}`
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

            limit = Number(limit)
            const offset = (Number(page) - 1) * limit

            let jobs: Job[] = await this.prisma.job.findMany({
                where: {
                    status: 'APPROVED',
                    app_deadline: { gte: new Date() },
                    OR: [
                        { rate: { contains: search } },
                        { playingAge: { contains: search } },
                        { role: { contains: search, mode: 'insensitive' } },
                        { location: { contains: search, mode: 'insensitive' } },
                        { experience: { contains: search, mode: 'insensitive' } },
                        { requirement: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } }
                    ]
                },
                orderBy: { approvedAt: 'desc' },
                skip: offset,
                take: limit,
            })

            if (userId) {
                const user = await this.prisma.user.findUnique({
                    where: { id: userId },
                    include: {
                        talent: { include: { bioStats: true, personalInfo: true } },
                        creative: { include: { personalInfo: true } }
                    }
                })

                if (user) {
                    const personalInfo = user[role]?.personalInfo
                    const bio = user[role]?.bioStats?.bio

                    if (personalInfo && bio) {
                        const recommendedJobs = await this.prisma.job.findMany({
                            where: {
                                status: 'APPROVED',
                                app_deadline: { gte: new Date() },
                                OR: [
                                    { role: { contains: user.role || '', mode: 'insensitive' } },
                                    { requirement: { contains: bio, mode: 'insensitive' } },
                                    { description: { contains: bio, mode: 'insensitive' } },
                                    { location: { contains: personalInfo.state || '', mode: 'insensitive' } },
                                    { location: { contains: personalInfo.country || '', mode: 'insensitive' } },
                                    { location: { contains: personalInfo.localGovt || '', mode: 'insensitive' } }
                                ]
                            },
                            orderBy: { approvedAt: 'desc' },
                            skip: offset,
                            take: limit,
                            distinct: ['id']
                        })

                        jobs = recommendedJobs.concat(jobs).slice(0, limit)
                    }
                }
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
                                email: true,
                                avatar: true,
                                username: true,
                                lastname: true,
                                firstname: true,
                                primarySkill: true,
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
                        email: true,
                        avatar: true,
                        username: true,
                        lastname: true,
                        firstname: true,
                        primarySkill: true,
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
