import { Response } from 'express'
import { validateFile } from 'utils/file'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { ResourceType } from 'enums/base.enum'
import { Gender, Talent } from '@prisma/client'
import { genFileName } from 'helpers/genFilename'
import { WasabiService } from 'lib/wasabi.service'
import { PrismaService } from 'lib/prisma.service'
import { PersonalInfoDto } from './dto/personalInfo.dto'

@Injectable()
export class TalentService {
    constructor(
        private readonly response: SendRes,
        private readonly prisma: PrismaService,
        private readonly wasabi: WasabiService,
    ) { }

    private async handleServerError(res: Response, err?: any, msg?: string) {
        console.error(err)
        return this.response.sendError(res, StatusCodes.InternalServerError, msg || 'Something went wrong')
    }

    async personalInfo(
        res: Response,
        { sub }: ExpressUser,
        {
            nationality, religion, address,
            gender, idNumber, instagramHandle, idType,
            xHandle, yearsOfExperience, languages, phone,
        }: PersonalInfoDto,
        file: Express.Multer.File
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: {
                    id: sub
                },
                include: {
                    talent: true
                }
            })

            let talent: Talent | null = user.talent
            if (!talent) {
                talent = await this.prisma.talent.create({ data: { user: { connect: { id: sub } } } })
            }

            let newFile = {} as {
                url: string
                path: string
                type: string
            }

            if (file) {
                const validatedFile = await validateFile(res, file, 4 << 20, 'jpg', 'mp4')
                const { Key, Location } = await this.wasabi.uploadS3(validatedFile, genFileName())

                newFile = {
                    url: Location,
                    path: Key,
                    type: file.mimetype
                }
            }

            const personalInfoData = {}
            if (nationality !== undefined) {
                personalInfoData['nationality'] = nationality
            }
            if (address !== undefined) {
                personalInfoData['address'] = address
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
            if (yearsOfExperience !== undefined) {
                personalInfoData['yearsOfExperience'] = yearsOfExperience
            }
            if (idNumber !== undefined) {
                personalInfoData['idNumber'] = idNumber
            }
            if (idType !== undefined) {
                personalInfoData['idType'] = idType
            }
            if (instagramHandle !== undefined) {
                personalInfoData['instagramHandle'] = instagramHandle
            }
            if (xHandle !== undefined) {
                personalInfoData['xHandle'] = xHandle
            }

            const personalInfo = await this.prisma.talentPersonalInfo.upsert({
                where: {
                    talentId: talent.id,
                },
                create: {
                    idPhoto: newFile,
                    languages, phone, talent: {
                        connect: { id: talent.id }
                    },
                    nationality, religion, address,
                    gender, idNumber, instagramHandle,
                    idType, xHandle, yearsOfExperience,
                },
                update: personalInfoData
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: personalInfo,
                message: "Personal Information has been updated successfully"
            })
        } catch (err) {
            this.handleServerError(res, err, 'Error saving personal information')
        }
    }

    async portfolio(
        res: Response,
        action: string,
        { sub }: ExpressUser,
        file: Express.Multer.File,
        resource_type: ResourceType,
        files: Express.Multer.File[]
    ) {
        try {
            const talent = await this.prisma.talent.findUnique({
                where: {
                    userId: sub
                }
            })

            if (!talent) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Add your personal information')
            }

            const portfolio = await this.prisma.talentPortfolio.findUnique({
                where: {
                    talentId: talent.id
                }
            })

            if (file) {
                if (portfolio.video?.path) {
                    await this.wasabi.deleteS3(portfolio.video.path)
                }
            }


        } catch (err) {
            return this.handleServerError(res, err, 'Error uploading portfolio')
        }
    }
}
