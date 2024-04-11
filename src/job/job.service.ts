import { Response } from 'express'
import { Job } from '@prisma/client'
import { PostJobDto } from './dto/job.dto'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { PrismaService } from 'lib/prisma.service'

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
            job_title, job_type, playingAge, rate,
            duration, gender, requirement, job_role,
            applicaion_deadline, description, experience,
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
                        admin: { connect: { id: sub } }
                    }
                })
            } else {
                job = await this.prisma.job.create({
                    data: {
                        role: job_role, type: job_type,
                        app_deadline: applicaion_deadline,
                        title: job_title, playingAge, rate,
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
}
