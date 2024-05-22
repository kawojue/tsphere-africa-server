import { Response } from 'express'
import { validateFile } from 'utils/file'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { AwsService } from 'lib/aws.service'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import {
    CreateBriefFillDTO, CreateBriefDocumentDTO,
} from './dto/brief.dto'
import { titleText } from 'helpers/formatTexts'
import { FundWalletDTO } from './dto/wallet.dto'
import { genFileName } from 'helpers/genFilename'
import {
    ClientSetup, Project, ProjectStatus, TxStatus
} from '@prisma/client'
import { PrismaService } from 'lib/prisma.service'
import { SortUserDto } from 'src/modmin/dto/user.dto'
import {
    ClientProfileSetupDTO, ClientProfileSetupQueryDTO
} from './dto/profile.dto'
import { PaystackService } from 'lib/Paystack/paystack.service'
import { UpdateHireStatusDTO } from 'src/modmin/dto/status.dto'
import { CreateProjectDTO, ExistingProjectDTO } from './dto/project.dto'

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

    async profileSetup(
        res: Response,
        { sub }: ExpressUser,
        files: Array<Express.Multer.File>,
        { type }: ClientProfileSetupQueryDTO,
        {
            address, country, website, firstname, lastname,
            lga, state, dob, document_type, facebook, id_type,
            instagram, linkedIn, reg_type, reg_no, prof_title,
        }: ClientProfileSetupDTO,
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: sub }
            })

            if (user.verified) {
                return this.response.sendError(res, StatusCodes.Unauthorized, "Can't edit since you're verified")
            }

            if (firstname && firstname?.trim()) {
                firstname = titleText(firstname)
            } else {
                firstname = user.firstname
            }

            if (lastname && lastname?.trim()) {
                lastname = titleText(lastname)
            } else {
                lastname = user.lastname
            }

            const filteredDoc = files.find(file => file.fieldname === "doc")
            const filteredProof = files.filter(file => file.fieldname === "proofOfId")

            const client = await this.getClient(sub)
            const setup = await this.prisma.clientSetup.findUnique({
                where: { clientId: client.id }
            })

            if (!filteredProof.length && !setup.proof_of_id?.length) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'Upload your proof of ID')
            }

            if (filteredProof.length > 2) {
                return this.response.sendError(res, StatusCodes.BadRequest, "Only the front and back of the ID")
            }

            let document: IFile
            let proof_of_id: IFile[] = []

            let clientSetup: ClientSetup

            if (filteredProof.length > 0) {
                const results = await Promise.all(filteredProof.map(async file => {
                    const result = validateFile(file, 10 << 20, 'png', 'jpg', 'jpeg')

                    if (result?.status) {
                        return this.response.sendError(res, result.status, result.message)
                    }

                    const path = `profile/${sub}/${genFileName()}`
                    await this.aws.uploadS3(result.file, path)
                    return {
                        path,
                        type: file.mimetype,
                        url: this.aws.getS3(path),
                    }
                }))

                proof_of_id = results.filter((result): result is IFile => !!result)
            }

            if (type === "PERSONAL") {
                const [_,] = await this.prisma.$transaction([
                    this.prisma.clientSetup.upsert({
                        where: { clientId: client.id },
                        create: {
                            state, facebook, id_type, lga, type,
                            instagram, linkedIn, dob, prof_title,
                            address, country, website, proof_of_id,
                            client: { connect: { id: client.id } },
                        },
                        update: {
                            lga, type, instagram, linkedIn, dob, prof_title,
                            address, country, website, state, facebook, id_type,
                        }
                    }),
                    this.prisma.user.update({
                        where: { id: sub },
                        data: { firstname, lastname }
                    })
                ])

                clientSetup = _
            }

            if (type === "COMPANY") {
                if (!filteredDoc) {
                    return this.response.sendError(res, StatusCodes.BadRequest, "Company's proof of document is required")
                }

                const result = validateFile(filteredDoc, 10 << 20, 'png', 'jpg', 'jpeg')

                if (result?.status) {
                    return this.response.sendError(res, result.status, result.message)
                }

                const path = `profile/${sub}/${genFileName()}`
                await this.aws.uploadS3(result.file, path)

                document = {
                    path,
                    url: this.aws.getS3(path),
                    type: result.file.mimetype,
                }

                const [_,] = await this.prisma.$transaction([
                    this.prisma.clientSetup.upsert({
                        where: { clientId: client.id },
                        create: {
                            client: { connect: { id: client.id } },
                            address, country, website, proof_of_id, document,
                            instagram, linkedIn, dob, prof_title, document_type,
                            state, facebook, id_type, lga, type, reg_type, reg_no,
                        },
                        update: {
                            address, country, website, instagram, linkedIn, dob, prof_title,
                            document_type, state, facebook, id_type, lga, type, reg_type, reg_no,
                        }
                    }),
                    this.prisma.user.update({
                        where: { id: sub },
                        data: { firstname, lastname }
                    })
                ])

                clientSetup = _
            }

            this.response.sendSuccess(res, StatusCodes.OK, { data: clientSetup })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async createBriefDocument(
        res: Response,
        { sub }: ExpressUser,
        files: Array<Express.Multer.File>,
        { category, title, type }: CreateBriefDocumentDTO
    ) {
        try {
            const client = await this.getClient(sub)

            const filteredDocs = files.filter(file => file.fieldname === "docs")
            const filteredImages = files.filter(file => file.fieldname === "images")
            const filteredVideos = files.filter(file => file.fieldname === "videos")

            let docs = [] as IFile[]
            let videos = [] as IFile[]
            let images = [] as IFile[]

            if (filteredDocs.length) {
                try {
                    const results = await Promise.all(filteredDocs.map(async file => {
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

            if (filteredImages.length) {
                try {
                    const results = await Promise.all(filteredImages.map(async file => {
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

            if (filteredVideos.length) {
                try {
                    const results = await Promise.all(filteredVideos.map(async file => {
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
                    category, title, type, briefType: 'doc',
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

    async createBriefFill(
        res: Response,
        { sub }: ExpressUser,
        body: CreateBriefFillDTO
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
                    briefType: 'fill',
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
                pending = await this.prisma.project.count({
                    where: {
                        status: 'PENDING'
                    }
                })
                completed = await this.prisma.project.count({
                    where: {
                        status: 'COMPLETED'
                    }
                })

                total = await this.prisma.project.count()

                const cancelled = await this.prisma.project.count({
                    where: {
                        status: 'CANCELLED'
                    }
                })

                approved = total - (pending + cancelled)
            } else {
                const client = await this.getClient(sub)

                pending = await this.prisma.project.count({
                    where: {
                        status: 'PENDING',
                        clientId: client.id,
                    }
                })
                completed = await this.prisma.project.count({
                    where: {
                        status: 'COMPLETED',
                        clientId: client.id,
                    }
                })

                total = await this.prisma.project.count()

                const cancelled = await this.prisma.project.count({
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

    async directHire(
        res: Response,
        profileId: string,
        { sub }: ExpressUser,
        files: Array<Express.Multer.File>,
        {
            role_type, role_name, proj_type, proj_title,
            additional_note, proj_duration, phone_number,
            proj_time, proj_date, payment_option, location,
            org_name, means_of_id, job_title, country, offer,
        }: CreateProjectDTO
    ) {
        try {
            const extractedProofOfId = files.filter(file => file.fieldname === "proof_of_id")
            const extractedAttachments = files.filter(file => file.fieldname === "attachments")

            const user = await this.prisma.user.findUnique({
                where: { id: sub }
            })

            const profile = await this.prisma.user.findUnique({
                where: { id: profileId }
            })

            if (!profile || profile.userStatus === "suspended") {
                return this.response.sendError(res, StatusCodes.NotFound, "User not found")
            }

            if (!user.verified && extractedProofOfId.length === 0) {
                return this.response.sendError(res, StatusCodes.BadRequest, "You're not verified yet. Upload your proof of ID with the project")
            }

            let attachments: IFile[]
            let proof_of_id: IFile[]

            if (extractedAttachments.length) {
                try {
                    const results = await Promise.all(extractedAttachments.map(async file => {
                        const result = validateFile(file, 5 << 20, 'jpg', 'png', 'mp4', 'wav', 'aac', 'mp3')

                        if (result?.status) {
                            return this.response.sendError(res, result.status, result.message)
                        }

                        const path = `project/${sub}/${genFileName()}`
                        await this.aws.uploadS3(result.file, path)
                        return {
                            path,
                            type: file.mimetype,
                            url: this.aws.getS3(path),
                        }
                    }))

                    attachments = results.filter((result): result is IFile => !!result)
                } catch {
                    try {
                        await this.removeFiles(attachments)
                    } catch (err) {
                        this.misc.handleServerError(res, err, err?.message)
                    }
                }
            }

            const project = await this.prisma.project.create({
                data: {
                    additional_note, proj_duration,
                    role_name, attachments, proj_time,
                    payment_option, location, proj_type,
                    proj_title, client: { connect: { id: user.id } },
                    proj_date: proj_date ? new Date(proj_date) : null,
                }
            })

            if (project && !user.verified) {
                try {
                    const results = await Promise.all(extractedProofOfId.map(async file => {
                        const result = validateFile(file, 5 << 20, 'jpg', 'png')

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

                    proof_of_id = results.filter((result): result is IFile => !!result)
                } catch {
                    try {
                        await this.removeFiles(proof_of_id)
                    } catch (err) {
                        this.misc.handleServerError(res, err, err?.message)
                    }
                }

                await this.prisma.additionalInfoProject.create({
                    data: {
                        org_name, means_of_id, job_title, country, proof_of_id,
                        phone_number, project: { connect: { id: project.id } }
                    }
                })
            }

            if (project) {
                const roleInfo = await this.prisma.projectRoleInfo.create({
                    data: {
                        role_type, offer: Number(offer),
                        project: { connect: { id: project.id } },
                        talentOrCreative: { connect: { id: profile.id } }
                    }
                })

                if (roleInfo) {
                    await this.prisma.hire.create({
                        data: {
                            client: { connect: { id: sub } },
                            project: { connect: { id: project.id } },
                            talentOrCreative: { connect: { id: profile.id } }
                        }
                    })
                }
            }

            this.response.sendSuccess(res, StatusCodes.OK, { data: project })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async directHireWithExistingProject(
        res: Response,
        projectId: string,
        profileId: string,
        { sub }: ExpressUser,
        {
            role_type, offer
        }: ExistingProjectDTO,
    ) {
        try {
            const profile = await this.prisma.user.findUnique({
                where: { id: profileId }
            })

            if (!profile || profile.userStatus === "suspended") {
                return this.response.sendError(res, StatusCodes.NotFound, "User not found")
            }

            const project = await this.prisma.project.findUnique({
                where: { id: projectId, clientId: sub },
                select: {
                    id: true,
                    status: true,
                    location: true,
                    proj_date: true,
                    proj_type: true,
                    proj_time: true,
                    proj_title: true,
                    attachments: true,
                    proj_duration: true,
                    payment_option: true,
                    additional_note: true,
                }
            })

            if (!project) {
                return this.response.sendError(res, StatusCodes.NotFound, "Project not found")
            }

            if (project.status === "CANCELLED" || project.status === "ONHOLD") {
                return this.response.sendError(res, StatusCodes.Unauthorized, "Selected project is either cancelled or onhold")
            }

            const roleInfo = await this.prisma.projectRoleInfo.create({
                data: {
                    role_type, offer: Number(offer),
                    project: { connect: { id: project.id } },
                    talentOrCreative: { connect: { id: profile.id } }
                }
            })

            if (roleInfo) {
                await this.prisma.hire.create({
                    data: {
                        client: { connect: { id: sub } },
                        project: { connect: { id: project.id } },
                        talentOrCreative: { connect: { id: profile.id } }
                    }
                })
            }

            this.response.sendSuccess(res, StatusCodes.OK, { data: project })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async updateHireStatus(
        res: Response,
        hireId: string,
        { sub }: ExpressUser,
        { q }: UpdateHireStatusDTO,
    ) {
        try {
            const hire = await this.prisma.hire.findUnique({
                where: { id: hireId, clientId: sub }
            })

            if (!hire) {
                return this.response.sendError(res, StatusCodes.NotFound, "Request not found")
            }

            const newHire = await this.prisma.hire.update({
                where: { id: hire.id },
                data: { status: q }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: newHire,
                message: "Status has been updated"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error updating status")
        }
    }

    async fetchProject(
        res: Response,
        projectId: string,
        { role, sub }: ExpressUser,
    ) {
        try {
            let project: Project

            if (role === "admin") {
                project = await this.prisma.project.findUnique({
                    where: { id: projectId }
                })
            } else if (role === "client") {
                project = await this.prisma.project.findUnique({
                    where: {
                        id: projectId,
                        clientId: sub,
                    }
                })
            } else {
                project = await this.prisma.project.findUnique({
                    where: {
                        id: projectId,
                        roleInfo: {
                            talentOrCreativeId: sub
                        },
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

    async fetchProjectApplicants(
        res: Response,
        projectId: string,
        { role, sub }: ExpressUser,
    ) {
        try {
            let project: Project

            if (role === "admin") {
                project = await this.prisma.project.findUnique({
                    where: { id: projectId }
                })
            } else {
                project = await this.prisma.project.findUnique({
                    where: {
                        id: projectId,
                        clientId: sub,
                    },
                })
            }

            if (!project) {
                return this.response.sendError(res, StatusCodes.NotFound, "Project not found")
            }

            const hires = await this.prisma.hire.findMany({
                where: { projectId },
                include: {
                    talentOrCreative: {
                        select: {
                            role: true,
                            email: true,
                            avatar: true,
                            lastname: true,
                            username: true,
                            firstname: true,
                            primarySkill: true,
                        }
                    }
                }
            })

            if (!project) {
                return this.response.sendError(res, StatusCodes.NotFound, "Project not found")
            }

            this.response.sendSuccess(res, StatusCodes.OK, { data: hires })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fetchProjectsDropdown(res: Response, { sub }: ExpressUser) {
        try {
            const projects = await this.prisma.project.findMany({
                where: { clientId: sub },
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true,
                    status: true,
                    clientId: true,
                    proj_type: true,
                    proj_title: true,
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: projects })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fetchProjects(
        res: Response,
        { role, sub }: ExpressUser,
        {
            q, s = '', limit = 50, page = 1
        }: SortUserDto
    ) {
        try {
            s = s?.trim() ?? ''
            limit = Number(limit)
            const offset = (Number(page) - 1) * limit

            let length = 0
            let projects: Project[]

            const OR: ({
                proj_title: {
                    contains: string
                    mode: "insensitive"
                }
            } | {
                proj_type: {
                    contains: string
                    mode: "insensitive"
                }
            } | {
                role_name: {
                    contains: string
                    mode: "insensitive"
                }
            })[] = [
                    { proj_title: { contains: s, mode: 'insensitive' } },
                    { proj_type: { contains: s, mode: 'insensitive' } },
                    { role_name: { contains: s, mode: 'insensitive' } },
                ]

            const query: {
                orderBy: ({
                    proj_title: "asc"
                } | {
                    proj_type: "asc"
                })[] | {
                    updatedAt: "desc"
                }
                skip: number
                take: number
            } = {
                take: limit,
                skip: offset,
                orderBy: q === "name" ? [
                    { proj_title: 'asc' },
                    { proj_type: 'asc' },
                ] : { updatedAt: 'desc' }
            }

            if (role === "admin") {
                projects = await this.prisma.project.findMany({
                    where: { OR },
                    ...query,
                })

                length = await this.prisma.project.count({ where: { OR } })
            } else if (role === "client") {
                const client = await this.getClient(sub)

                projects = await this.prisma.project.findMany({
                    where: { clientId: client.userId, OR },
                    ...query,
                })

                length = await this.prisma.project.count({ where: { clientId: client.id, OR } })
            } else {
                projects = await this.prisma.project.findMany({
                    where: { roleInfo: { talentOrCreativeId: sub }, OR },
                    ...query,
                })

                length = await this.prisma.project.count({ where: { roleInfo: { talentOrCreativeId: sub }, OR } })
            }

            const totalPages = Math.ceil(length / limit)

            const projectsWithTotalApplied = await Promise.all(
                projects.map(async (project) => {
                    const totalApplied = await this.prisma.hire.count({
                        where: { projectId: project.id },
                    })
                    return { ...project, totalApplied }
                })
            )

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: { projects: projectsWithTotalApplied, length, totalPages }
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
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
                        amount: amountPaid,
                        authorization_code,
                        reference: `deposit-${ref}}`,
                        user: { connect: { id: sub } },
                        status: data.status.toUpperCase() as TxStatus,
                    }
                })
            ])

            this.response.sendSuccess(res, StatusCodes.OK, { data: tx })
        } catch (err) {
            this.misc.handlePaystackAndServerError(res, err)
        }
    }

    async uploadContract(
        res: Response,
        projectId: string,
        { sub }: ExpressUser,
        file: Express.Multer.File,
    ) {
        try {
            if (!file) {
                return this.response.sendError(res, StatusCodes.BadRequest, "Blank Contract")
            }

            const re = validateFile(file, 5 << 20, 'pdf', 'png', 'jpg', 'jpeg')
            if (re?.status) {
                return this.response.sendError(res, re.status, re.message)
            }

            const project = await this.prisma.project.findUnique({
                where: { id: projectId },
            })

            if (!project) {
                return this.response.sendError(res, StatusCodes.NotFound, "Project not found")
            }

            const statuses: ProjectStatus[] = ['CANCELLED', 'PENDING', 'ONHOLD', 'COMPLETED']
            if (statuses.includes(project.status)) {
                if (project.status === "COMPLETED" || project.status === "CANCELLED") {
                    return this.response.sendError(res, StatusCodes.Unauthorized, `Project has been ${project.status.toLowerCase()}`)
                } else {
                    return this.response.sendError(res, StatusCodes.Unauthorized, `Project is ${project.status.toLowerCase()}`)
                }
            }

            const path = `${sub}/${projectId}/${genFileName()}`
            const url = this.aws.getS3(path)
            await this.aws.uploadS3(file, path)

            const contract = await this.prisma.contract.create({
                data: {
                    project: { connect: { id: projectId } },
                    file: {
                        url,
                        path,
                        type: file.mimetype
                    }
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: contract })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }
}
