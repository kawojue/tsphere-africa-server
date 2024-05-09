import {
    CreateProjectFillDTO,
    ToggleProjectStatusDTO,
    CreateProjectDocumentDTO,
} from './dto/project.dto'
import { Response } from 'express'
import { validateFile } from 'utils/file'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { AwsService } from 'lib/aws.service'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { FundWalletDTO } from './dto/wallet.dto'
import { genFileName } from 'helpers/genFilename'
import { extractTime } from 'helpers/formatTexts'
import { PrismaService } from 'lib/prisma.service'
import { $Enums, BriefForm } from '@prisma/client'
import { genRandomCode } from 'helpers/genRandStr'
import { SortUserDto } from 'src/modmin/dto/user.dto'
import { PaystackService } from 'lib/Paystack/paystack.service'

@Injectable()
export class ClientService {
    constructor(
        private readonly aws: AwsService,
        private readonly response: SendRes,
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
        private readonly paystack: PaystackService,
    ) { }

    private async removeFiles(files: IFile[]) {
        if (files.length > 0) {
            for (const file of files) {
                if (file?.path) {
                    await this.aws.deleteS3(file.path)
                }
            }
        }
    }

    private async getClient(sub: string) {
        const client = await this.prisma.client.findUnique({
            where: { userId: sub }
        })

        if (!client) return

        return client
    }

    async createProjectDocument(
        res: Response,
        { sub }: ExpressUser,
        files: {
            docs?: Array<Express.Multer.File>,
            videos?: Array<Express.Multer.File>,
            images?: Array<Express.Multer.File>,
        },
        { category, title, type }: CreateProjectDocumentDTO
    ) {
        try {
            const client = await this.getClient(sub)

            let docs = [] as IFile[]
            let videos = [] as IFile[]
            let images = [] as IFile[]

            if (files.docs?.length) {
                try {
                    const results = await Promise.all(files.docs.map(async file => {
                        const result = validateFile(file, 5 << 20, 'pdf', 'docx')

                        if (result?.status) {
                            return this.response.sendError(res, result.status, result.message)
                        }

                        const path = `brief_form/${sub}/${genFileName()}`
                        await this.aws.uploadS3(result.file, path)
                        return {
                            path,
                            type: file.mimetype,
                            url: this.aws.getS3(path),
                        }
                    }))

                    docs = results.filter((result): result is IFile => !!result)
                } catch {
                    try {
                        await this.removeFiles(docs)
                    } catch (err) {
                        this.misc.handleServerError(res, err, err?.message)
                    }
                }
            }

            if (files.images?.length) {
                try {
                    const results = await Promise.all(files.images.map(async file => {
                        const result = validateFile(file, 10 << 20, 'jpg', 'png')

                        if (result?.status) {
                            return this.response.sendError(res, result.status, result.message)
                        }

                        const path = `brief_form/${sub}/${genFileName()}`
                        await this.aws.uploadS3(result.file, path)
                        return {
                            path,
                            type: file.mimetype,
                            url: this.aws.getS3(path),
                        }
                    }))

                    images = results.filter((result): result is IFile => !!result)
                } catch {
                    try {
                        await this.removeFiles(images)
                    } catch (err) {
                        this.misc.handleServerError(res, err, err?.message)
                    }
                }
            }

            if (files.videos?.length) {
                try {
                    const results = await Promise.all(files.videos.map(async file => {
                        const result = validateFile(file, 20 << 20, 'mp4',)

                        if (result?.status) {
                            return this.response.sendError(res, result.status, result.message)
                        }

                        const path = `brief_form/${sub}/${genFileName()}`
                        await this.aws.uploadS3(result.file, path)
                        return {
                            path,
                            type: file.mimetype,
                            url: this.aws.getS3(path),
                        }
                    }))

                    videos = results.filter((result): result is IFile => !!result)
                } catch {
                    try {
                        await this.removeFiles(videos)
                    } catch (err) {
                        this.misc.handleServerError(res, err, err?.message)
                    }
                }
            }

            const briefForm = await this.prisma.briefForm.create({
                data: {
                    docs, images, videos,
                    client: { connect: { id: client.id } },
                    category, title, type, projectType: 'doc',
                }
            })

            this.response.sendSuccess(res, StatusCodes.Created, {
                data: briefForm,
                messages: "Successful"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error uploading attachments. Retry..")
        }
    }

    async createProjectFill(
        res: Response,
        { sub }: ExpressUser,
        body: CreateProjectFillDTO
    ) {
        try {
            // @ts-ignore
            if (body?.role) {
                // @ts-ignore
                delete body.role
            }

            const client = await this.getClient(sub)

            const briefForm = await this.prisma.briefForm.create({
                data: {
                    ...body,
                    projectType: 'fill',
                    shoot_time: extractTime(body.shoot_time),
                    audition_time: extractTime(body.audition_time),
                    brief_time_expiry: extractTime(body.brief_time_expiry),
                    client: { connect: { id: client.id } }
                }
            })

            this.response.sendSuccess(res, StatusCodes.Created, {
                data: briefForm,
                messages: "Successful"
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async analytics(res: Response, { sub, role }: ExpressUser) {
        try {
            let total = 0
            let pending = 0
            let approved = 0
            let completed = 0

            if (role === "admin") {
                pending = await this.prisma.briefForm.count({
                    where: {
                        status: 'PENDING'
                    }
                })
                completed = await this.prisma.briefForm.count({
                    where: {
                        status: 'COMPLETED'
                    }
                })

                total = await this.prisma.briefForm.count()

                const cancelled = await this.prisma.briefForm.count({
                    where: {
                        status: 'CANCELLED'
                    }
                })

                approved = total - (pending + cancelled)
            } else {
                const client = await this.getClient(sub)

                pending = await this.prisma.briefForm.count({
                    where: {
                        status: 'PENDING',
                        clientId: client.id,
                    }
                })
                completed = await this.prisma.briefForm.count({
                    where: {
                        status: 'COMPLETED',
                        clientId: client.id,
                    }
                })

                total = await this.prisma.briefForm.count()

                const cancelled = await this.prisma.briefForm.count({
                    where: {
                        status: 'CANCELLED',
                        clientId: client.id,
                    }
                })

                approved = total - (pending + cancelled)
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: { total, approved, pending, completed }
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fetchProject(
        res: Response,
        projectId: string,
        { role, sub }: ExpressUser,
    ) {
        try {
            let project: BriefForm

            if (role === "admin") {
                project = await this.prisma.briefForm.findUnique({
                    where: { id: projectId }
                })
            } else {
                const client = await this.getClient(sub)

                project = await this.prisma.briefForm.findUnique({
                    where: {
                        id: projectId,
                        clientId: client.id,
                    }
                })
            }

            if (!project) {
                return this.response.sendError(res, StatusCodes.NotFound, "Project not found")
            }

            this.response.sendSuccess(res, StatusCodes.OK, { data: project })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fetchProjects(
        res: Response,
        { role, sub }: ExpressUser,
        {
            q, s, limit = 50, page = 1
        }: SortUserDto
    ) {
        try {
            limit = Number(limit)
            const offset = (Number(page) - 1) * limit

            let projects: {
                id: string
                type: string
                title: string
                createdAt: Date
                category: string
                status: $Enums.ProjectStatus
                projectType: $Enums.ProjectType
            }[]

            let length = 0
            let totalPages = 0

            const OR: ({
                type: {
                    contains: string
                    mode: "insensitive"
                }
            } | {
                title: {
                    contains: string
                    mode: "insensitive"
                }
            } | {
                category: {
                    contains: string
                    mode: "insensitive"
                }
            })[] = [
                    { type: { contains: s, mode: 'insensitive' } },
                    { title: { contains: s, mode: 'insensitive' } },
                    { category: { contains: s, mode: 'insensitive' } },
                ]

            const query: {
                select: {
                    id: boolean
                    type: boolean
                    title: boolean
                    status: boolean
                    category: boolean
                    createdAt: boolean
                    projectType: boolean
                }
                orderBy: ({
                    type: "asc"
                } | {
                    title: "asc"
                } | {
                    category: "asc"
                })[] | {
                    createdAt: "desc"
                }
                skip: number
                take: number
            } = {
                select: {
                    id: true,
                    type: true,
                    title: true,
                    status: true,
                    category: true,
                    createdAt: true,
                    projectType: true
                },
                take: limit,
                skip: offset,
                orderBy: q === "name" ? [
                    { type: 'asc' },
                    { title: 'asc' },
                    { category: 'asc' },
                ] : { createdAt: 'desc' },
            }

            if (role === "admin") {
                projects = await this.prisma.briefForm.findMany({
                    where: { OR },
                    ...query,
                })

                length = await this.prisma.briefForm.count({ where: { OR } })
                totalPages = Math.ceil(length / limit)
            } else {
                const client = await this.getClient(sub)

                projects = await this.prisma.briefForm.findMany({
                    where: { clientId: client.id, OR },
                    ...query,
                })

                length = await this.prisma.briefForm.count({ where: { clientId: client.id, OR } })
                totalPages = Math.ceil(length / limit)
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: { projects, length, totalPages }
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async toggleStatus(
        res: Response,
        projectId: string,
        { sub, role }: ExpressUser,
        { q }: ToggleProjectStatusDTO,
    ) {
        try {
            let project: BriefForm

            if (role === "admin") {
                project = await this.prisma.briefForm.findUnique({
                    where: { id: projectId }
                })
            } else {
                const client = await this.getClient(sub)

                project = await this.prisma.briefForm.findUnique({
                    where: { id: projectId, clientId: client.id }
                })
            }

            if (!project) {
                return this.response.sendError(res, StatusCodes.NotFound, "Project not found")
            }

            const newProject = await this.prisma.briefForm.update({
                where: { id: project.id },
                data: {
                    status: q
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: newProject,
                message: "Status has been changed"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "error changing status")
        }
    }

    async fundWallet(
        res: Response,
        { sub }: ExpressUser,
        { ref }: FundWalletDTO
    ) {
        try {
            const wallet = await this.prisma.wallet.findUnique({ where: { userId: sub } })

            if (!wallet) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Wallet not found')
            }

            const verifyTx = await this.paystack.verifyTransaction(ref)
            if (!verifyTx.status || verifyTx?.data?.status !== "success") {
                return this.response.sendError(res, StatusCodes.PaymentIsRequired, 'Payment is required')
            }

            const { data } = verifyTx
            const amountPaid = data.amount / 100
            const channel = data?.authorization?.channel
            const authorization_code = data?.authorization?.authorization_code

            const [_, tx] = await this.prisma.$transaction([
                this.prisma.wallet.update({
                    where: { userId: sub },
                    data: {
                        lastDepoistedAt: new Date(),
                        lastAmountDeposited: amountPaid,
                        balance: { increment: amountPaid }
                    }
                }),
                this.prisma.txHistory.create({
                    data: {
                        channel,
                        type: 'DEPOSIT',
                        source: 'external',
                        status: 'SUCCESS',
                        amount: amountPaid,
                        authorization_code,
                        reference: `deposit-${sub}-${genRandomCode()}`,
                        user: { connect: { id: sub } },
                    }
                })
            ])

            this.response.sendSuccess(res, StatusCodes.OK, { data: tx })
        } catch (err) {
            this.misc.handlePaystackAndServerError(res, err)
        }
    }
}
