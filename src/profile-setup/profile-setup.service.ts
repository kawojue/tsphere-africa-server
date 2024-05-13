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
import { RateAndAvailabilityDto } from './dto/rate-availability.dto'

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
        files: Array<Express.Multer.File>
    ) {
        try {
            if (files.length > 3) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'Images should not exceed of three')
            } else if (files.length === 0) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'No Images were selected')
            } else {
                const user = await this.prisma.user.findUnique({
                    where: { id: sub },
                    include: { portfolio: true }
                })

                let filesArray = [] as IFile[]
                try {
                    const results = await Promise.all(files.map(async (file) => {
                        const result = validateFile(file, 10 << 20, 'jpg', 'png')
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

            const result = validateFile(file, 30 << 20, 'mp4')
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

            const result = validateFile(file, 3 << 20, 'wav', 'mp3', 'aac')
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

    async addSkills(
        res: Response,
        { sub }: ExpressUser,
        { skills }: SkillsDto,
        files: Array<Express.Multer.File>,
    ) {
        try {
            if (files.length > 3) {
                return this.response.sendError(res, StatusCodes.BadRequest, "Images shouldn't more than three")
            }

            const user = await this.prisma.user.findUnique({
                where: { id: sub },
                include: { skills: true }
            })

            let attachments = [] as IFile[]
            if (files.length > 0) {
                try {
                    const results = await Promise.all(files.map(async (file) => {
                        const result = validateFile(file, 10 << 20, 'jpg', 'png')
                        if (result?.status) {
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

                    attachments = results.filter((result): result is IFile => !!result)
                } catch {
                    try {
                        if (attachments.length > 0) {
                            for (const file of attachments) {
                                if (file?.path) {
                                    await this.aws.deleteS3(file.path)
                                }
                            }
                        }
                        attachments = []
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
                const newSkill = await this.prisma.skill.upsert({
                    where: { userId: user.id },
                    create: {
                        charge: skill.charge,
                        category: skill.category,
                        subSkills: skill.subSkills,
                        chargeTime: skill.chargeTime,
                        yearsOfExperience: skill.yearsOfExperience,
                        user: { connect: { id: user.id } }
                    },
                    update: {
                        charge: skill.charge,
                        category: skill.category,
                        subSkills: skill.subSkills,
                        chargeTime: skill.chargeTime,
                        yearsOfExperience: skill.yearsOfExperience,
                    }
                })
                newUserSkills.push(newSkill)
            }

            await this.prisma.user.update({
                where: { id: user.id },
                data: { skillAttachments: attachments }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: newUserSkills })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error saving skills")
        }
    }

    async rateAndAvailability(
        res: Response,
        { sub }: ExpressUser,
        {
            availability, charge,
            weekday, chargeTime,
        }: RateAndAvailabilityDto
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: sub }
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, 'User not found')
            }

            let weekdays = []
            if (weekday) {
                weekdays = JSON.parse(weekday.replace(/'/g, '"')) as Array<string>
            }

            const rates = await this.prisma.rateAndAvailability.upsert({
                where: { userId: sub },
                create: {
                    weekdays, chargeTime,
                    availability, charge,
                    user: { connect: { id: sub } }
                },
                update: {
                    availability, charge,
                    weekdays, chargeTime,
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: rates,
                message: 'Saved'
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }
}
