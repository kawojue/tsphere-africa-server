import { Response } from 'express'
import { Skill } from '@prisma/client'
import { validateFile } from 'utils/file'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { AwsService } from 'lib/aws.service'
import { SkillsDto } from './dto/skills.dto'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { genFileName } from 'helpers/genFilename'
import { PrismaService } from 'lib/prisma.service'
import { ExperienceDto } from './dto/experiece.dto'
import { BankDetailsDto } from './dto/bank-details.dto'

@Injectable()
export class ProfileSetupService {
    constructor(
        private readonly aws: AwsService,
        private readonly response: SendRes,
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
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
                        if (result?.status) {
                            return this.response.sendError(res, result.status, result.message)
                        }

                        const path = `${user.id}/${genFileName()}`
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

                const images = user?.portfolio?.images || []
                if (images.length > 0) {
                    for (const img of images) {
                        if (img?.path) {
                            await this.aws.deleteS3(img.path)
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
            this.misc.handleServerError(res, err)
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

            const path = `${user.id}/${genFileName()}`
            await this.aws.uploadS3(result.file, path)
            const video = {
                path,
                url: this.aws.getS3(path),
                type: result.file.mimetype,
            }

            if (user?.portfolio?.video?.path) {
                await this.aws.deleteS3(user.portfolio.video.path)
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
            this.misc.handleServerError(res, err)
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

            const path = `${user.id}/${genFileName()}`
            await this.aws.uploadS3(result.file, path)
            const audio = {
                path,
                url: this.aws.getS3(path),
                type: result.file.mimetype,
            }

            if (user?.portfolio?.audio?.path) {
                await this.aws.deleteS3(user.portfolio.audio.path)
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
            this.misc.handleServerError(res, err)
        }
    }

    async addExperience(
        res: Response,
        { sub }: ExpressUser,
        experience: ExperienceDto
    ) {
        try {
            const exp = await this.prisma.experience.create({
                data: { ...experience, user: { connect: { id: sub } } }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: exp })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error adding experience')
        }
    }

    async removeExperience(
        res: Response,
        { sub }: ExpressUser,
        experienceId: string
    ) {
        try {
            const experience = await this.prisma.experience.delete({
                where: {
                    id: experienceId,
                    userId: sub
                }
            })

            if (!experience) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Experience not found')
            }

            this.response.sendSuccess(res, StatusCodes.OK, {})
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error removing experience')
        }
    }

    async manageBankDetails(
        res: Response,
        { sub }: ExpressUser,
        bankDetails: BankDetailsDto
    ) {
        try {
            const details = await this.prisma.bankDetails.upsert({
                where: {
                    userId: sub
                },
                create: { ...bankDetails, user: { connect: { id: sub } } },
                update: bankDetails
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: details })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error updating bank account')
        }
    }

    async addSkills(
        res: Response,
        { sub }: ExpressUser,
        { skills }: SkillsDto,
        attachments: Express.Multer.File[],
    ) {
        try {
            if (attachments.length > 3) {
                return this.response.sendError(res, StatusCodes.BadRequest, "Attachments shouldn't more than three")
            }

            const user = await this.prisma.user.findUnique({
                where: {
                    id: sub
                },
                include: {
                    skills: true
                }
            })

            let filesArray = [] as IFile[]
            if (attachments.length > 0) {
                try {
                    const results = await Promise.all(attachments.map(async (file) => {
                        const result = validateFile(file, 10 << 20, 'jpg', 'png')
                        if (result.status) {
                            return this.response.sendError(res, result.status, result.message)
                        }

                        const path = `${user.id}/${genFileName()}`
                        await this.aws.uploadS3(result.file, path)
                        return {
                            path,
                            url: this.aws.getS3(path),
                            type: result.file.mimetype,
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
            }

            const userSkillAttachments = user?.skillAttachments || []
            if (userSkillAttachments.length > 0) {
                for (const userSkillAttachment of userSkillAttachments) {
                    if (userSkillAttachment?.path) {
                        await this.aws.deleteS3(userSkillAttachment.path)
                    }
                }
            }

            const newUserSkills = [] as Skill[]
            for (const skill of skills) {
                const newSkill = await this.prisma.skill.create({
                    data: {
                        category: skill.category,
                        subSkills: skill.subSkills,
                        yearsOfExperience: skill.yearsOfExperience,
                        charge: skill.charge,
                        chargeTime: skill.chargeTime,
                        user: {
                            connect: {
                                id: user.id
                            }
                        }
                    }
                })
                newUserSkills.push(newSkill)
            }

            await this.prisma.user.update({
                where: {
                    id: user.id
                },
                data: {
                    skillAttachments: filesArray
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: newUserSkills })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error saving skills")
        }
    }
}
