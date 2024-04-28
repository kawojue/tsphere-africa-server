import { Response } from 'express'
import { validateFile } from 'utils/file'
import StatusCodes from 'enums/StatusCodes'
import { Injectable, } from '@nestjs/common'
import { AwsService } from 'lib/aws.service'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { titleText } from 'helpers/formatTexts'
import { genFileName } from 'helpers/genFilename'
import { PrismaService } from 'lib/prisma.service'
import { genReferralKey } from 'helpers/genReferralKey'
import { CertificationDto } from './dto/certification.dto'
import { CreativePersonalInfoDto } from './dto/personal-info.dto'

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
            lastname, state, religion, address, gender, idType, altPhone, country,
            dob, fbHandle, igHandle, language, xHandle, phone, username, firstname,
        }: CreativePersonalInfoDto,
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

                await this.prisma.referral.update({
                    where: { userId: sub },
                    data: { key: genReferralKey(username) }
                })
            } else {
                username = user.username
            }

            if (firstname && user.firstname !== firstname) {
                firstname = titleText(firstname)
            } else {
                firstname = user.firstname
            }

            if (lastname && user.lastname !== lastname) {
                lastname = titleText(lastname)
            } else {
                lastname = user.lastname
            }

            const languages = JSON.parse(language.replace(/'/g, '"')) as Array<string>

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
                    country, state, religion, address, idType, languages,
                    fbHandle, igHandle, xHandle, phone, altPhone, gender, dob,
                    proofOfId: proofOfId?.path ? proofOfId : personalInfo?.proofOfId,
                    creative: { connect: { id: creative.id } },
                },
                update: {
                    phone, altPhone, gender, religion, dob, country, state,
                    address, idType, languages, fbHandle, igHandle, xHandle,
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

    async addCertification(
        res: Response,
        { sub }: ExpressUser,
        certification: CertificationDto
    ) {
        try {
            const creative = await this.prisma.creative.findUnique({
                where: { userId: sub }
            })

            if (!creative) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'Add your personal information')
            }

            const data = await this.prisma.creativeCertification.create({
                data: { ...certification, creative: { connect: { id: creative.id } } }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data, message: "Saved!" })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Encountered an error while saving certification')
        }
    }

    async removeCertification(
        res: Response,
        { sub }: ExpressUser,
        certificateId: string,
    ) {
        try {
            const where = { userId: sub, id: certificateId }

            const certification = await this.prisma.creative.findUnique({ where })

            if (!certification) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'Certification not found')
            }

            await this.prisma.creativeCertification.delete({ where })

            this.response.sendSuccess(res, StatusCodes.OK, { message: "Certification removed!" })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Encountered an error while saving certification')
        }
    }
}
