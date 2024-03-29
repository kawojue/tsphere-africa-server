import { Response } from 'express'
import { validateFile } from 'utils/file'
import StatusCodes from 'enums/StatusCodes'
import { Injectable, } from '@nestjs/common'
import { AwsService } from 'lib/aws.service'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { titleName } from 'helpers/formatTexts'
import { genFileName } from 'helpers/genFilename'
import { PrismaService } from 'lib/prisma.service'
import { PersonalInfoDto } from './dto/personal-info.dto'
import { CreativeRatesAvailabilityDto } from './dto/rates-availability.dto'

@Injectable()
export class CreativeService {
    constructor(
        private readonly aws: AwsService,
        private readonly response: SendRes,
        private readonly misc: MiscService,
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

                const path = `${sub}/${genFileName()}`
                await this.aws.uploadS3(result.file, path)
                proofOfId = {
                    path,
                    type: file.mimetype,
                    url: this.aws.getS3(path)
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
                    country, state, religion,
                    address, idType, language,
                    fbHandle, igHandle, xHandle,
                    phone, altPhone, gender, dob,
                    creative: { connect: { id: creative.id } },
                    proofOfId: proofOfId?.path ? proofOfId : null,
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
            this.misc.handleServerError(res, err, 'Error saving personal information')
        }
    }

    async bio(
        res: Response,
        bio: string,
        { sub }: ExpressUser
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

            const creative = await this.prisma.creative.upsert({
                where: {
                    userId: user.id
                },
                create: { bio, user: { connect: { id: user.id } } },
                update: { bio }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: { bio: creative.bio }
            })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error saving Bio')
        }
    }

    async ratesAndAvailability(
        res: Response,
        { sub }: ExpressUser,
        ratesObj: CreativeRatesAvailabilityDto
    ) {
        try {
            const creative = await this.prisma.creative.findUnique({
                where: {
                    userId: sub
                }
            })

            if (!creative) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Add your personal information')
            }

            if (!this.misc.isValidWorkday(ratesObj.from, ratesObj.to)) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'Invalid weekdays')
            }

            const rates = await this.prisma.creativeRatesAndAvailability.upsert({
                where: {
                    creativeId: creative.id
                },
                create: { ...ratesObj, creative: { connect: { id: creative.id } } },
                update: ratesObj
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
