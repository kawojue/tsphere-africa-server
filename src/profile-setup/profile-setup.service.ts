import { Response } from 'express'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { AwsService } from 'lib/aws.service'
import { SkillsDto } from './dto/skills.dto'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { Experience, Skill } from '@prisma/client'
import { PrismaService } from 'lib/prisma.service'
import { ExperiencesDTO } from './dto/experiece.dto'
import { genFileName, validateFile } from 'utils/file'
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

                        const path = `${user.id}/${genFileName(result.file)}`
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

            const path = `${user.id}/${genFileName(result.file)}`
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

            const path = `${user.id}/${genFileName(result.file)}`
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

    async deletePortfolio(
        res: Response,
        userId: string,
    ) {
        try {
            const portfolio = await this.prisma.portfolio.findUnique({
                where: { userId }
            })

            if (!portfolio) {
                return this.response.sendError(res, StatusCodes.NotFound, "Portfolio not found")
            }

            const files = [
                ...portfolio.images.map(image => image.path),
                portfolio.video?.path,
                portfolio.audio?.path
            ].filter(Boolean)

            for (const path of files) {
                await this.aws.deleteS3(path)
            }

            await this.prisma.portfolio.delete({
                where: { userId }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Portfolio has been deleted sucessfully"
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async addExperience(
        res: Response,
        { sub }: ExpressUser,
        { experiences }: ExperiencesDTO
    ) {
        try {
            let exps: Experience[] = []
            for (const experience of experiences) {
                const exp = await this.prisma.experience.create({
                    data: { ...experience, user: { connect: { id: sub } } }
                })

                exps.push(exp)
            }

            this.response.sendSuccess(res, StatusCodes.OK, { data: exps })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error adding experiences')
        }
    }

    async removeExperience(
        res: Response,
        { sub, role }: ExpressUser,
        experienceId: string
    ) {
        try {
            const experience = await this.prisma.experience.delete({
                where: role === "admin" ? {
                    id: experienceId
                } : {
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
        skillsDto: SkillsDto,
        files: Array<Express.Multer.File>,
    ) {
        try {
            // @ts-ignore
            const skills = JSON.parse(skillsDto.skills)
            if (files.length > 3) {
                return this.response.sendError(res, StatusCodes.BadRequest, "Media shouldn't be more than three")
            }

            const user = await this.prisma.user.findUnique({
                where: { id: sub },
                include: { skills: true }
            })

            let attachments = [] as IFile[]
            if (files.length > 0) {
                try {
                    const results = await Promise.all(files.map(async (file) => {
                        const result = validateFile(file, 10 << 20, 'jpg', 'png', 'mp4', 'mp3', 'wav', 'aac')
                        if (result?.status) {
                            return this.response.sendError(res, result.status, result.message)
                        }

                        const path = `${user.id}/${genFileName(result.file)}`
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

            const newUserSkills = [] as Skill[]
            const userSkillAttachments = user?.skillAttachments || []

            const countOldSkills = await this.prisma.skill.count({
                where: { userId: user.id }
            })

            if (countOldSkills > 0) {
                await this.prisma.skill.deleteMany({
                    where: { userId: user.id }
                })
            }

            for (const skill of skills) {
                const newSkill = await this.prisma.skill.create({
                    data: {
                        ...skill,
                        user: { connect: { id: user.id } }
                    }
                })
                newUserSkills.push(newSkill)
            }

            await this.prisma.user.update({
                where: { id: user.id },
                data: { skillAttachments: attachments }
            })

            if (userSkillAttachments.length > 0) {
                for (const userSkillAttachment of userSkillAttachments) {
                    if (userSkillAttachment?.path) {
                        await this.aws.deleteS3(userSkillAttachment.path)
                    }
                }
            }

            this.response.sendSuccess(res, StatusCodes.OK, { data: newUserSkills })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error saving skills")
        }
    }

    async deleteSkills(res: Response, userId: string) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                include: { skills: true }
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, "User not found")
            }

            if (user.skillAttachments?.length) {
                try {
                    for (const attachment of user.skillAttachments) {
                        if (attachment?.path) {
                            await this.aws.deleteS3(attachment.path)
                        }
                    }
                } catch (err) {
                    return this.misc.handleServerError(res, err, "Error deleting attachments")
                }
            }

            await this.prisma.$transaction([
                this.prisma.skill.deleteMany({
                    where: { userId: user.id }
                }),
                this.prisma.user.update({
                    where: { id: user.id },
                    data: { skillAttachments: [] }
                })
            ])


            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "All skills and attachments deleted successfully"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error deleting skills and attachments")
        }
    }

    async rateAndAvailability(
        res: Response,
        { sub }: ExpressUser,
        {
            availability, charge,
            weekdays, chargeTime,
        }: RateAndAvailabilityDto
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: sub }
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, 'User not found')
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

    async editRateAndAvailability(
        res: Response,
        userId: string,
        {
            availability, charge,
            weekdays, chargeTime,
        }: RateAndAvailabilityDto
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId }
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, 'User not found')
            }

            const existingRateAndAvailability = await this.prisma.rateAndAvailability.findUnique({
                where: { userId }
            })

            if (!existingRateAndAvailability) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Rate and availability not found for user')
            }

            const updatedRates = await this.prisma.rateAndAvailability.update({
                where: { userId },
                data: {
                    availability,
                    charge,
                    weekdays,
                    chargeTime,
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: updatedRates,
                message: 'Rate and availability updated successfully'
            })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error updating rate and availability')
        }
    }
}
