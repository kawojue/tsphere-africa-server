import { Response } from 'express'
import { validateFile } from 'utils/file'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { PrismaService } from 'lib/prisma.service'
import { WasabiService } from 'lib/wasabi.service'
import { genFileName } from 'helpers/genFilename'

@Injectable()
export class ProfileSetupService {
    constructor(
        private readonly response: SendRes,
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
        private readonly wasabi: WasabiService,
    ) { }

    async uploadPortfolioImages(
        res: Response,
        { sub }: ExpressUser,
        files: Express.Multer.File[]
    ) {
        try {
            if (files.length > 3) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'Images should be maximum of three')
            } else if (files.length === 0) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'No Images were selected')
            } else {
                const user = await this.prisma.user.findUnique({
                    where: {
                        id: sub
                    },
                    include: {
                        portfolio: true
                    }
                })

                let filesArray = [] as IFile[]
                try {
                    const results = await Promise.all(files.map(async (file) => {
                        const result = validateFile(file, 5 << 20, 'jpg', 'png')
                        if (result.status) {
                            return this.response.sendError(res, result.status, result.message)
                        }

                        const { Key, Location } = await this.wasabi.uploadS3(result.file, genFileName())
                        return {
                            path: Key,
                            url: Location,
                            type: file.mimetype
                        }
                    }))

                    filesArray = results.filter((result): result is IFile => !!result)
                } catch {
                    try {
                        if (filesArray.length > 0) {
                            for (const file of filesArray) {
                                if (file?.path) {
                                    await this.wasabi.deleteS3(file.path)
                                }
                            }
                        }
                        filesArray = []
                    } catch (err) {
                        return this.misc.handleServerError(res, err, err.message)
                    }
                }

                const images = user?.portfolio?.images || []
                if (images.length > 0) {
                    for (const img of images) {
                        if (img?.path) {
                            await this.wasabi.deleteS3(img.path)
                        }
                    }
                }

                const portfolio = await this.prisma.portfolio.upsert({
                    where: {
                        userId: user.id
                    },
                    create: {
                        images: filesArray,
                        user: { connect: { id: user.id } }
                    },
                    update: { images: filesArray }
                })

                this.response.sendSuccess(res, StatusCodes.OK, { data: portfolio })
            }
        } catch (err) {
            return this.misc.handleServerError(res, err)
        }
    }

    async uploadPortfolioVideo(
        res: Response,
        { sub }: ExpressUser,
        file: Express.Multer.File
    ) {
        try {
            if (!file) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'No video was selected')
            }

            const user = await this.prisma.user.findUnique({
                where: {
                    id: sub
                },
                include: {
                    portfolio: true
                }
            })

            const result = validateFile(file, 5 << 20, 'mp4')
            if (result?.status) {
                return this.response.sendError(res, result.status, result.message)
            }

            const { Key, Location } = await this.wasabi.uploadS3(result.file, genFileName())
            const video = {
                url: Location,
                path: Key,
                type: result.file.mimetype
            }

            if (user?.portfolio?.video?.path) {
                await this.wasabi.deleteS3(user.portfolio.video.path)
            }

            const portfolio = await this.prisma.portfolio.upsert({
                where: {
                    userId: user.id
                },
                create: { video, user: { connect: { id: user.id } } },
                update: { video }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: portfolio })
        } catch (err) {
            return this.misc.handleServerError(res, err)
        }
    }

    async uploadPortfolioAudio(
        res: Response,
        { sub }: ExpressUser,
        file: Express.Multer.File
    ) {
        try {
            if (!file) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'No video was selected')
            }

            const user = await this.prisma.user.findUnique({
                where: {
                    id: sub
                },
                include: {
                    portfolio: true
                }
            })

            const result = validateFile(file, 5 << 20, 'wav', 'mp3', 'aac')
            if (result?.status) {
                return this.response.sendError(res, result.status, result.message)
            }

            const { Key, Location } = await this.wasabi.uploadS3(result.file, genFileName())
            const audio = {
                url: Location,
                path: Key,
                type: result.file.mimetype
            }

            if (user?.portfolio?.audio?.path) {
                await this.wasabi.deleteS3(user.portfolio.audio.path)
            }

            const portfolio = await this.prisma.portfolio.upsert({
                where: {
                    userId: user.id
                },
                create: { audio, user: { connect: { id: user.id } } },
                update: { audio }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: portfolio })
        } catch (err) {
            return this.misc.handleServerError(res, err)
        }
    }

}
