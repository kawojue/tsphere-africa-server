import { Response } from 'express'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { AwsService } from 'lib/aws.service'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import {
    CreateBriefFillDTO, CreateBriefDocumentDTO,
} from './dto/brief.dto'
import { FundWalletDTO } from './dto/wallet.dto'
import { PrismaService } from 'lib/prisma.service'
import { SortUserDto } from 'src/modmin/dto/user.dto'
import { genFileName, validateFile } from 'utils/file'
import {
    ClientProfileSetupDTO, ClientProfileSetupQueryDTO
} from './dto/profile.dto'
import { PaystackService } from 'lib/Paystack/paystack.service'
import { UpdateHireStatusDTO } from 'src/modmin/dto/status.dto'
import {
    ClientSetup, HireStatus, Prisma, Project, ProjectStatus, TxStatus
} from '@prisma/client'
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

    private async removeFiles(files: any[]) {
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
            address, country, website, firstname, lastname, dob,
            city, state, document_type, facebook, id_type, reg_no,
            instagram, linkedIn, reg_type, prof_title, company_name,
        }: ClientProfileSetupDTO,
    ) {
        try {
            const filteredDoc = files.find(file => file.fieldname === "doc")
            const filteredProof = files.filter(file => file.fieldname === "proofOfId")

            const client = await this.getClient(sub)
            const setup = await this.prisma.clientSetup.findUnique({
                where: { clientId: client.id }
            })

            const formerProofOfId = setup?.proof_of_id as any[] || []
            if (filteredProof.length === 0 && formerProofOfId.length === 0) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'Upload your proof of ID')
            }

            if (filteredProof.length > 2) {
                return this.response.sendError(res, StatusCodes.BadRequest, "Upload only the front and back of the ID")
            }

            let document: Prisma.JsonValue
            let proof_of_id = []

            let clientSetup: ClientSetup

            if (filteredProof.length > 0) {
                proof_of_id = await Promise.all(filteredProof.map(async file => {
                    const result = validateFile(file, 10 << 20, 'png', 'jpg', 'jpeg')

                    if (result?.status) {
                        return this.response.sendError(res, result.status, result.message)
                    }

                    const path = `profile/${sub}/${genFileName(result.file)}`
                    await this.aws.uploadS3(result.file, path)
                    return {
                        type: file.mimetype,
                        path, size: file.mimetype,
                        url: this.aws.getS3(path),
                    }
                }))

                if (formerProofOfId.length) {
                    for (const proofOfId of formerProofOfId) {
                        if (proofOfId?.path) {
                            await this.aws.deleteS3(proofOfId.path)
                        }
                    }
                }
            }

            if (type === "PERSONAL") {
                clientSetup = await this.prisma.clientSetup.upsert({
                    where: { clientId: client.id },
                    create: {
                        state, facebook, id_type, city, type,
                        instagram, linkedIn, dob, prof_title,
                        address, country, website, proof_of_id,
                        client: { connect: { id: client.id } },
                    },
                    update: {
                        city, type, instagram, linkedIn,
                        dob, prof_title, proof_of_id, address,
                        country, website, state, facebook, id_type,
                    }
                })
            }

            if (type === "COMPANY") {
                if (!filteredDoc) {
                    return this.response.sendError(res, StatusCodes.BadRequest, "Company's proof of document is required")
                }

                const result = validateFile(filteredDoc, 10 << 20, 'png', 'jpg', 'jpeg')

                if (result?.status) {
                    return this.response.sendError(res, result.status, result.message)
                }

                const path = `profile/${sub}/${genFileName(result.file)}`
                await this.aws.uploadS3(result.file, path)

                document = {
                    url: this.aws.getS3(path),
                    type: result.file.mimetype,
                    path, size: result.file.size,
                }

                const formerDocument = setup?.document as any
                if (document?.path && formerDocument?.path) {
                    await this.aws.deleteS3(formerDocument.path)
                }

                clientSetup = await this.prisma.clientSetup.upsert({
                    where: { clientId: client.id },
                    create: {
                        client: { connect: { id: client.id } },
                        address, country, proof_of_id, document, company_name,
                        website, instagram, linkedIn, prof_title, document_type,
                        state, facebook, id_type, dob, city, type, reg_type, reg_no,
                    },
                    update: {
                        document, address, country, website, instagram,
                        linkedIn, prof_title, company_name, document_type, dob,
                        state, facebook, id_type, city, type, reg_type, reg_no,
                    }
                })
            }

            if (firstname || lastname) {
                await this.prisma.user.update({
                    where: { id: sub },
                    data: { firstname, lastname }
                })
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

            let docs = []
            let videos = []
            let images = []

            if (filteredDocs.length) {
                try {
                    docs = await Promise.all(filteredDocs.map(async file => {
                        const result = validateFile(file, 5 << 20, 'pdf', 'docx')

                        if (result?.status) {
                            return this.response.sendError(res, result.status, result.message)
                        }

                        const path = `brief_form/${sub}/${genFileName(result.file)}`
                        await this.aws.uploadS3(result.file, path)
                        return {
                            type: file.mimetype,
                            path, size: file.size,
                            url: this.aws.getS3(path),
                        }
                    }))
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
                    images = await Promise.all(filteredImages.map(async file => {
                        const result = validateFile(file, 10 << 20, 'jpg', 'png', 'jpeg')

                        if (result?.status) {
                            return this.response.sendError(res, result.status, result.message)
                        }

                        const path = `brief_form/${sub}/${genFileName(result.file)}`
                        await this.aws.uploadS3(result.file, path)
                        return {
                            type: file.mimetype,
                            path, size: file.size,
                            url: this.aws.getS3(path),
                        }
                    }))
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
                    videos = await Promise.all(filteredVideos.map(async file => {
                        const result = validateFile(file, 20 << 20, 'mp4',)

                        if (result?.status) {
                            return this.response.sendError(res, result.status, result.message)
                        }

                        const path = `brief_form/${sub}/${genFileName(result.file)}`
                        await this.aws.uploadS3(result.file, path)
                        return {
                            type: file.mimetype,
                            path, size: file.size,
                            url: this.aws.getS3(path),
                        }
                    }))
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
                pending = await this.prisma.project.count({
                    where: {
                        status: 'PENDING',
                        clientId: sub,
                    }
                })
                completed = await this.prisma.project.count({
                    where: {
                        status: 'COMPLETED',
                        clientId: sub,
                    }
                })

                total = await this.prisma.project.count()

                const cancelled = await this.prisma.project.count({
                    where: {
                        status: 'CANCELLED',
                        clientId: sub,
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

            if (profile.role !== "talent" && profile.role !== "creative") {
                return this.response.sendError(res, StatusCodes.BadRequest, "You can only hire a Talent/Creative")
            }

            if (!user.verified && extractedProofOfId.length === 0) {
                return this.response.sendError(res, StatusCodes.BadRequest, "You're not verified yet. Upload your proof of ID with the project")
            }

            let attachments = []
            let proof_of_id = []

            if (extractedAttachments.length) {
                try {
                    attachments = await Promise.all(extractedAttachments.map(async file => {
                        const result = validateFile(file, 5 << 20, 'jpg', 'png', 'jpeg', 'mp4', 'wav', 'aac', 'mp3')

                        if (result?.status) {
                            return this.response.sendError(res, result.status, result.message)
                        }

                        const path = `project/${sub}/${genFileName(result.file)}`
                        await this.aws.uploadS3(result.file, path)
                        return {
                            type: file.mimetype,
                            path, size: file.size,
                            url: this.aws.getS3(path),
                        }
                    }))
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
                    proof_of_id = await Promise.all(extractedProofOfId.map(async file => {
                        const result = validateFile(file, 5 << 20, 'jpg', 'png', 'jpeg')

                        if (result?.status) {
                            return this.response.sendError(res, result.status, result.message)
                        }

                        const path = `brief_form/${sub}/${genFileName(result.file)}`
                        await this.aws.uploadS3(result.file, path)
                        return {
                            path,
                            type: file.mimetype,
                            url: this.aws.getS3(path),
                        }
                    }))
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

            if (profile.role !== "talent" && profile.role !== "creative") {
                return this.response.sendError(res, StatusCodes.BadRequest, "You can only hire a Talent/Creative")
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

            const hire = await this.prisma.hire.findFirst({
                where: {
                    clientId: sub,
                    project: {
                        id: projectId,
                        roleInfo: {
                            some: {
                                talentOrCreativeId: profile.id
                            }
                        }
                    },
                    talentOrCreativeId: profile.id,
                }
            })

            if (hire) {
                return this.response.sendError(res, StatusCodes.Conflict, "Error hiring same user for the same project and role")
            }

            if (!project) {
                return this.response.sendError(res, StatusCodes.NotFound, "Project not found")
            }

            if (project.status === "CANCELLED" || project.status === "ONHOLD" || project.status === "COMPLETED") {
                return this.response.sendError(res, StatusCodes.Unauthorized, "Selected project is either cancelled, onhold, or completed")
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
        id: string,
        { sub, role }: ExpressUser,
        { q }: UpdateHireStatusDTO,
    ) {
        try {
            const hire = await this.prisma.hire.findUnique({
                where: { id, clientId: sub }
            })

            let statuses: HireStatus[]

            if (role === "admin") {
                statuses = ['CANCELLED', 'APPROVED']
            } else {
                statuses = ['HIRED', 'REJECTED']
            }

            if (!statuses.includes(q)) {
                return this.response.sendError(res, StatusCodes.Unauthorized, "Invalid status")
            }

            if (!hire) {
                return this.response.sendError(res, StatusCodes.NotFound, "Request not found")
            }

            const newHire = await this.prisma.hire.update({
                where: { id },
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
                            some: {
                                talentOrCreativeId: sub
                            }
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
            limit = Number(limit)
            const offset = (Number(page) - 1) * limit

            let length = 0
            let projects: any[]

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
                take: number,
            } = {
                take: limit,
                skip: offset,
                orderBy: q === "name" ? [
                    { proj_title: 'asc' },
                    { proj_type: 'asc' },
                ] : { updatedAt: 'desc' },
            }

            const include = {
                client: {
                    select: {
                        id: true,
                        avatar: true,
                        lastname: true,
                        firstname: true,
                    }
                }
            }

            if (role === "admin") {
                projects = await this.prisma.project.findMany({
                    where: { OR },
                    ...query,
                    include,
                })

                length = await this.prisma.project.count({ where: { OR } })
            } else if (role === "client") {
                const client = await this.getClient(sub)

                projects = await this.prisma.project.findMany({
                    where: { clientId: client.userId, OR },
                    ...query,
                    include,
                })

                length = await this.prisma.project.count({ where: { clientId: client.id, OR } })
            } else {
                projects = await this.prisma.project.findMany({
                    where: {
                        status: { notIn: ['PENDING', 'CANCELLED'] },
                        roleInfo: {
                            some: { talentOrCreativeId: sub }
                        }, OR
                    },
                    ...query,
                    include
                })

                length = await this.prisma.project.count({
                    where: {
                        roleInfo: {
                            some: { talentOrCreativeId: sub }
                        }, OR
                    }
                })
            }

            const totalPages = Math.ceil(length / limit)

            projects = await Promise.all(
                projects.map(async (project) => {
                    const totalApplied = await this.prisma.hire.count({
                        where: { projectId: project.id },
                    })
                    return { ...project, totalApplied }
                })
            )

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: { projects, length, totalPages }
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

            const re = validateFile(file, 10 << 20, 'pdf', 'png', 'jpg', 'jpeg')
            if (re?.status) {
                return this.response.sendError(res, re.status, re.message)
            }

            const project = await this.prisma.project.findUnique({
                where: { id: projectId, clientId: sub },
            })

            if (!project) {
                return this.response.sendError(res, StatusCodes.NotFound, "Project not found")
            }

            const statuses: ProjectStatus[] = ['CANCELLED', 'PENDING', 'ONHOLD', 'COMPLETED',]
            if (statuses.includes(project.status)) {
                if (project.status === "COMPLETED" || project.status === "CANCELLED") {
                    return this.response.sendError(res, StatusCodes.Unauthorized, `Project has been ${project.status.toLowerCase()}`)
                } else {
                    return this.response.sendError(res, StatusCodes.Unauthorized, `Project is currently ${project.status.toLowerCase()}`)
                }
            }

            const path = `contract/${projectId}/${genFileName(re.file)}`
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

    async directJobCastingRequests(
        res: Response,
        { sub, role }: ExpressUser,
        { q, s = '', page = 1, limit = 50 }: SortUserDto
    ) {
        try {
            limit = Number(limit)
            const offset = (Number(page) - 1) * limit

            const OR: ({
                project: {
                    proj_title: {
                        contains: string
                        mode: "insensitive"
                    }
                }
            } | {
                project: {
                    role_name: {
                        contains: string
                        mode: "insensitive"
                    }
                }
            })[] = [
                    { project: { proj_title: { contains: s, mode: 'insensitive' } } },
                    { project: { role_name: { contains: s, mode: 'insensitive' } } },
                ]

            const hires = await this.prisma.hire.findMany({
                where: role === "admin" ? { OR } : role === "client" ? {
                    OR,
                    clientId: sub
                } : {
                    OR,
                    status: { in: ['APPROVED', 'HIRED', 'DECLINED', 'ACCEPTED'] },
                    talentOrCreativeId: sub
                },
                select: {
                    id: true,
                    talentOrCreative: {
                        select: {
                            id: true,
                            avatar: true,
                            lastname: true,
                            firstname: true,
                        }
                    },
                    status: true,
                    createdAt: true,
                    project: {
                        select: {
                            id: true,
                            status: true,
                            location: true,
                            proj_type: true,
                            role_name: true,
                            proj_date: true,
                            proj_title: true,
                        }
                    },
                    client: {
                        select: {
                            id: true,
                            avatar: true,
                            lastname: true,
                            firstname: true,
                        }
                    }
                },
                take: limit,
                skip: offset,
                orderBy: q === "name" ? [
                    { project: { proj_title: 'asc' } },
                    { project: { role_name: 'asc' } }
                ] : { updatedAt: 'desc' }
            })

            const length = await this.prisma.hire.count({
                where: role === "admin" ? { OR } : role === "client" ? {
                    OR,
                    clientId: sub
                } : {
                    OR,
                    status: { in: ['APPROVED', 'HIRED', 'DECLINED', 'ACCEPTED'] },
                    talentOrCreativeId: sub
                },
            })

            const totalPages = Math.ceil(length / limit)

            this.response.sendSuccess(res, StatusCodes.OK, { data: hires, totalPages, length })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }
}
