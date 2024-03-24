import { SkillDto } from './dto/skill.dto'
import { Request, Response } from 'express'
import StatusCodes from 'enums/StatusCodes'
import { Injectable, } from '@nestjs/common'
import { SendRes } from 'lib/sendRes.service'
import { Creative, Gender } from '@prisma/client'
import { genFileName } from 'helpers/genFilename'
import { EducationDto } from './dto/education.dto'
import { PortfolioDto } from './dto/portfolio.dto'
import { PrismaService } from 'lib/prisma.service'
import { WasabiService } from 'lib/wasabi.service'
import { ExperienceDto } from './dto/experience.dto'
import { PersonalInfoDto } from './dto/personalInfo.dto'
import { RatesAvailabilityDto } from './dto/rates-availability.dto'

@Injectable()
export class CreativeService {
    constructor(
        private readonly response: SendRes,
        private readonly wasabi: WasabiService,
        private readonly prisma: PrismaService,
    ) { }

    async personalInfo(
        res: Response,
        { sub }: ExpressUser,
        {
            nationality, languages,
            gender, religion, phone,
        }: PersonalInfoDto
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: {
                    id: sub
                },
                include: {
                    creative: true
                }
            })

            let creative: Creative | null = user.creative
            if (!creative) {
                creative = await this.prisma.creative.create({ data: { user: { connect: { id: sub } } } })
            }

            const personalInfoData = {}

            if (nationality !== undefined) {
                personalInfoData['nationality'] = nationality
            }
            if (languages !== undefined) {
                personalInfoData['languages'] = languages
            }
            if (gender !== undefined) {
                personalInfoData['gender'] = gender as Gender
            }
            if (religion !== undefined) {
                personalInfoData['religion'] = religion
            }
            if (phone !== undefined) {
                personalInfoData['phone'] = phone
            }

            const personalInfo = await this.prisma.creativePersonalInfo.upsert({
                where: {
                    creativeId: creative.id,
                },
                create: {
                    phone,
                    gender,
                    religion,
                    languages,
                    nationality,
                    creative: { connect: { id: creative.id } },
                },
                update: personalInfoData,
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: personalInfo,
                message: "Personal Information has been updated successfully"
            })
        } catch (err) {
            this.handleServerError(res, err)
        }
    }

    private handleServerError(res: Response, err?: string, msg?: string) {
        console.error(err)
        return this.response.sendError(res, StatusCodes.InternalServerError, msg || 'Something went wrong')
    }

    async updateSkills(
        res: Response,
        { sub }: ExpressUser,
        { skills, level }: SkillDto
    ) {
        try {
            const MAX_SKILL = 5 as const
            const creativeSkills = JSON.parse(skills.replace(/'/g, '"')) as Array<string>
            if (creativeSkills.length > 5) {
                return this.response.sendError(res, StatusCodes.BadRequest, `Maximum skill is ${MAX_SKILL}`)
            }

            const user = await this.prisma.user.findUnique({
                where: {
                    id: sub
                },
                include: {
                    creative: true
                }
            })

            if (user && !user.creative) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Add your personal information')
            }

            const creativeId = user.creative.id
            const existingSkills = await this.prisma.creativeSkill.findMany({
                where: {
                    creativeId: creativeId,
                },
            })

            if (existingSkills) {
                await this.prisma.creativeSkill.delete({
                    where: {
                        creativeId: creativeId
                    }
                })
            }

            const creativeSkill = await this.prisma.creativeSkill.create({
                data: {
                    level,
                    skills: creativeSkills,
                    creative: {
                        connect: {
                            id: creativeId
                        }
                    }
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: creativeSkill,
                message: 'Skill has been saved successfully'
            })
        } catch (err) {
            this.handleServerError(res, err)
        }
    }

    async addExperience(
        res: Response,
        { sub }: ExpressUser,
        {
            details, employer, endDate,
            startDate, location, title,
        }: ExperienceDto
    ) {
        try {
            if (startDate && endDate) {
                if (new Date(startDate) > new Date(endDate)) {
                    return this.response.sendError(res, StatusCodes.OK, "Invalid date")
                }
            }

            const user = await this.prisma.user.findUnique({
                where: {
                    id: sub
                },
                include: {
                    creative: true
                }
            })

            if (user && !user.creative) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Add your personal information')
            }

            const MAX_EXPEIRENCE = 3 as const
            const totalExperiences = await this.prisma.creativeExperience.count()
            if (totalExperiences >= MAX_EXPEIRENCE) {
                return this.response.sendError(res, StatusCodes.OK, `Maximum experiences is ${MAX_EXPEIRENCE}.`)
            }

            const experience = await this.prisma.creativeExperience.create({
                data: {
                    title,
                    details,
                    location,
                    employer,
                    startDate: new Date(startDate),
                    endDate: endDate ? new Date(endDate) : undefined,
                    creative: {
                        connect: {
                            id: user.creative.id
                        }
                    }
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: experience,
                message: "New experience has been added"
            })
        } catch (err) {
            this.handleServerError(res, err)
        }
    }

    async removeExperience(
        res: Response,
        experienceId: string,
    ) {
        try {
            await this.prisma.creativeExperience.delete({
                where: {
                    id: experienceId
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Experience has been removed"
            })
        } catch (err) {
            this.handleServerError(res, err)
        }
    }

    async addEducation(
        res: Response,
        { sub }: ExpressUser,
        {
            startDate, endDate, study, school,
            levelOfCertification, typeOfDegree,
        }: EducationDto,
    ) {
        try {
            if (new Date(startDate) > new Date(endDate)) {
                return this.response.sendError(res, StatusCodes.OK, "Invalid date")
            }

            const user = await this.prisma.user.findUnique({
                where: {
                    id: sub
                },
                include: {
                    creative: {
                        include: {
                            education: true
                        }
                    }
                }
            })

            if (user && !user.creative) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Add your personal information')
            }

            const newEducationData = {}
            const educationData = user.creative.education

            if (startDate !== educationData.startDate) {
                newEducationData['startDate'] = new Date(startDate)
            }
            if (endDate !== educationData.endDate) {
                newEducationData['endDate'] = new Date(endDate)
            }
            if (study !== educationData.study) {
                newEducationData['study'] = study
            }
            if (school !== educationData.school) {
                newEducationData['school'] = school
            }
            if (levelOfCertification !== educationData.levelOfCertification) {
                newEducationData['levelOfCertification'] = levelOfCertification
            }
            if ((typeOfDegree !== undefined) && (typeOfDegree !== educationData.typeOfDegree)) {
                newEducationData['typeOfDegree'] = typeOfDegree
            }

            const education = await this.prisma.creativeEducation.upsert({
                where: {
                    creativeId: user.creative.id
                },
                create: {
                    study,
                    school,
                    typeOfDegree,
                    levelOfCertification,
                    startDate: new Date(startDate),
                    endDate: endDate ? new Date(endDate) : undefined,
                    creative: {
                        connect: {
                            id: user.creative.id
                        }
                    }
                },
                update: newEducationData
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: education,
                message: "Education has been updated"
            })
        } catch (err) {
            this.handleServerError(res, err)
        }
    }

    async removeEducation(
        res: Response,
        educationId: string,
    ) {
        try {
            await this.prisma.creativeEducation.delete({
                where: {
                    id: educationId
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Education has been removed"
            })
        } catch (err) {
            this.handleServerError(res, err)
        }
    }

    async portfolio(
        req: Request,
        res: Response,
        files: Express.Multer.File[],
        { title, description }: PortfolioDto,
    ) {
        try {
            // @ts-ignore
            const userId = req.user?.sub
            const user = await this.prisma.user.findUnique({
                where: {
                    id: userId
                },
                include: {
                    creative: {
                        include: {
                            portfolio: true
                        }
                    }
                }
            })

            if (user && !user.creative) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Add your personal information')
            }

            let filesArr = [] as {
                url: string
                path: string
                type: string
            }[]
            const portfolioData = user.creative.portfolio

            if (files.length > 0) {
                const MAX_SIZE = 10 << 20
                const allowedExt: string[] = ['jpg', 'png', 'pdf', 'mp4']

                const isContainAtLeastImg = files.some((file) => allowedExt.slice(0, 2).includes(file.originalname.split('.').pop()))

                if (!isContainAtLeastImg) {
                    return this.response.sendError(res, StatusCodes.BadRequest, 'Files must contain at least an Image')
                }

                for (const file of files) {
                    if (MAX_SIZE < file.size) {
                        return this.response.sendError(res, StatusCodes.PayloadTooLarge, `${file.originalname} is too large`)
                    }

                    if (!allowedExt.includes(file.originalname.split('.').pop())) {
                        return this.response.sendError(res, StatusCodes.UnsupportedContent, `File extension is not allowed - ${file.originalname}`)
                    }
                }

                try {
                    filesArr = await Promise.all(files.map(async (file) => {
                        const key = genFileName()
                        const { Key, Location } = await this.wasabi.uploadS3(file, key)
                        return {
                            path: Key,
                            url: Location,
                            type: file.mimetype
                        }
                    }))

                    const portfolioFiles = portfolioData?.files
                    if (portfolioFiles && (portfolioFiles.length > 0)) {
                        for (const file of portfolioFiles) {
                            await this.wasabi.deleteS3(file.path)
                        }
                    }
                } catch {
                    try {
                        if (filesArr.length > 0) {
                            for (const file of filesArr) {
                                await this.wasabi.deleteS3(file.path)
                            }
                        }
                        filesArr = []
                    } catch (err) {
                        return this.handleServerError(res, err, "Error uploading file(s)")
                    }
                }
            }

            const newPortfolioData = {}
            if (title !== portfolioData.title) {
                newPortfolioData['title'] = title
            }
            if (description !== portfolioData.description) {
                newPortfolioData['description'] = description
            }

            const portfolio = await this.prisma.creativePortfolio.upsert({
                where: {
                    creativeId: user.creative.id
                },
                create: {
                    title,
                    description,
                    files: filesArr,
                    creative: {
                        connect: {
                            id: user.creative.id
                        }
                    }
                },
                update: {
                    files: filesArr,
                    ...newPortfolioData,
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: portfolio,
                message: "Saved"
            })
        } catch (err) {
            this.handleServerError(res, err)
        }
    }

    async ratesAndAvailability(
        res: Response,
        { sub }: ExpressUser,
        {
            chargePerTime, chargeTime,
            workHoursPerTime, workingDays,
        }: RatesAvailabilityDto
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: {
                    id: sub
                },
                include: {
                    creative: {
                        include: {
                            rateAndAvailabilty: true
                        }
                    }
                }
            })

            if (user && !user.creative) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Add your personal information')
            }

            const newRateData = {}
            const rateData = user.creative.rateAndAvailabilty

            if (chargePerTime !== rateData.chargePerTime) {
                newRateData['chargePerTime'] = chargePerTime
            }
            if (chargeTime !== rateData.chargeTime) {
                newRateData['chargeTime'] = chargeTime
            }
            if (workHoursPerTime !== rateData.workHoursPerTime) {
                newRateData['chargeTime'] = workHoursPerTime
            }
            if (workingDays !== rateData.workingDays) {
                newRateData['workingDays'] = workingDays
            }

            const rateAndAvailabilty = await this.prisma.rateAndAvailabilty.upsert({
                where: {
                    creativeId: user.creative.id
                },
                create: {
                    chargeTime,
                    workingDays,
                    chargePerTime,
                    workHoursPerTime,
                    creative: {
                        connect: {
                            id: user.creative.id
                        }
                    }
                },
                update: newRateData
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: rateAndAvailabilty,
                message: "Saved"
            })
        } catch (err) {
            this.handleServerError(res, err)
        }
    }
}
