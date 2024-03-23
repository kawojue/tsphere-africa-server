import { Response } from 'express'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { Gender, Talent } from '@prisma/client'
import { PrismaService } from 'lib/prisma.service'
import { PersonalInfoDto } from './dto/personalInfo.dto'

@Injectable()
export class TalentService {
    constructor(
        private readonly response: SendRes,
        private readonly prisma: PrismaService,
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
                    talent: { connect: { id: talent.id } },
                    nationality, religion, address,
                    gender, idNumber, instagramHandle, idType,
                    xHandle, yearsOfExperience, languages, phone,
                },
                update: personalInfoData,
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: personalInfo,
                message: "Personal Information has been updated successfully"
            })
        } catch (err) {
            this.handleServerError(res, err, 'Error saving personal information')
        }
    }
}
