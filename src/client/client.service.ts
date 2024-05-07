import { Injectable } from '@nestjs/common'
import { AwsService } from 'lib/aws.service'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { PrismaService } from 'lib/prisma.service'
import { Response } from 'express'
import { validateFile } from 'utils/file'
import { genFileName } from 'test'
import StatusCodes from 'enums/StatusCodes'
import { CreateProjectDocumentDTO } from './dto/project.dto'

@Injectable()
export class ClientService {
    constructor(
        private readonly aws: AwsService,
        private readonly response: SendRes,
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
    ) { }

    private async removeFile(files: IFile[]) {
        if (files.length > 0) {
            for (const file of files) {
                if (file?.path) {
                    await this.aws.deleteS3(file.path)
                }
            }
        }
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
            const client = await this.prisma.client.findUnique({
                where: { userId: sub }
            })

            if (!client) return

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
                        await this.removeFile(docs)
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
                        await this.removeFile(images)
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
                        await this.removeFile(videos)
                    } catch (err) {
                        this.misc.handleServerError(res, err, err?.message)
                    }
                }
            }

            await this.prisma.briefForm.create({
                data: {
                    docs, images, videos,
                    client: { connect: { id: client.id } },
                    category, title, type, projectType: 'doc',
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { messages: "Successful" })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error uploading attachments. Retry..")
        }
    }

    async createProjectFill() {
        try {

        } catch (err) {

        }
    }
}
