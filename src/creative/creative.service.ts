import { validateFile } from 'utils/file'
import { SkillDto } from './dto/skill.dto'
import { Request, Response } from 'express'
import StatusCodes from 'enums/StatusCodes'
import { Injectable, } from '@nestjs/common'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { titleName } from 'helpers/formatTexts'
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
        private readonly misc: MiscService,
        private readonly wasabi: WasabiService,
        private readonly prisma: PrismaService,
    ) { }

    async personalInfo(
        res: Response,
        { sub }: ExpressUser,
        {
            lastname, state, religion, address,
            gender, idType, altPhone, country,
            dob, fbHandle, igHandle, language,
            xHandle, phone, username, firstname,
        }: PersonalInfoDto,
        file: Express.Multer.File
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: {
                    id: sub
                },
                include: {
                    creative: {
                        select: {
                            personalInfo: true
                        }
                    }
                }
            })

            const personalInfo = user.creative?.personalInfo

            if (!personalInfo?.proofOfId?.path) {
                if (!file) {
                    return this.response.sendError(res, StatusCodes.BadRequest, 'Upload your proof of ID')
                }
            } else {
                if (file) {
                    return this.response.sendError(res, StatusCodes.Conflict, 'Already uploaded proof of ID')
                }
            }

            let proofOfId = {} as IFile
            if (file) {
                const result = validateFile(file, 5 << 20, 'jpg', 'png')

                if (result?.status) {
                    return this.response.sendError(res, result.status, result.message)
                }

                const { Key, Location } = await this.wasabi.uploadS3(result.file, genFileName())
                proofOfId = {
                    path: Key,
                    url: Location,
                    type: file.mimetype
                }
            }

            if (username && username !== user.username) {
                if (!this.misc.isValidUsername(username)) {
                    return this.response.sendError(res, StatusCodes.BadRequest, 'Username is not allowed')
                }

                const usernameExists = await this.prisma.user.findUnique({
                    where: { username }
                })

                if (usernameExists) {
                    return this.response.sendError(res, StatusCodes.Conflict, 'Username has been taken')
                }
            } else {
                username = user.username
            }

            if (firstname && user.firstname !== firstname) {
                firstname = titleName(firstname)
            } else {
                firstname = user.firstname
            }

            if (lastname && user.lastname !== lastname) {
                lastname = titleName(lastname)
            } else {
                lastname = user.lastname
            }

            const [_, creative] = await this.prisma.$transaction([
                this.prisma.user.update({
                    where: {
                        id: user.id
                    },
                    data: { username, firstname, lastname }
                }),
                this.prisma.creative.upsert({
                    where: { userId: user.id },
                    create: {
                        user: { connect: { id: user.id } }
                    },
                    update: {}
                })
            ])

            const personalInfoData = await this.prisma.creativePersonalInfo.upsert({
                where: { creativeId: creative.id },
                create: {
                    address, idType, language,
                    fbHandle, igHandle, xHandle,
                    phone, altPhone, gender, religion, dob,
                    country, state,
                    proofOfId: proofOfId?.path ? proofOfId : null,
                    creative: { connect: { id: creative.id } }
                },
                update: {
                    phone, altPhone, gender, religion, dob,
                    country, state,
                    address, idType, language,
                    fbHandle, igHandle, xHandle
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: personalInfoData,
                message: "Personal Information has been updated successfully"
            })
        } catch (err) {
            return this.misc.handleServerError(res, err, 'Error saving personal information')
        }
    }
}
