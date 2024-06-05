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
import { CreativeCertification } from '@prisma/client'
import { genReferralKey } from 'helpers/genReferralKey'
import { CertificationsDTO } from './dto/certification.dto'
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
            igHandle, xHandle, phone, username, firstname,
            idType, altPhone, country, language, fbHandle,
            lastname, state, religion, dob, address, gender,
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

            if (user.verified) {
                return this.response.sendError(res, StatusCodes.Unauthorized, "Can't edit since you're verified")
            }

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

            let proofOfId: IFile
            if (file) {
                const result = validateFile(file, 5 << 20, 'jpg', 'png')

                if (result?.status) {
                    return this.response.sendError(res, result.status, result.message)
                }

                const path = `${sub}/${genFileName()}.${this.misc.getFileExtension(result.file)}`
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

            firstname = firstname && user.firstname !== firstname ? titleText(firstname) : user.firstname
            lastname = lastname && user.lastname !== lastname ? titleText(lastname) : user.lastname

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

    async editPersonalInfo(
        res: Response,
        userId: string,
        {
            igHandle, xHandle, phone, username, firstname,
            idType, altPhone, country, language, fbHandle,
            lastname, state, religion, dob, address, gender,
        }: CreativePersonalInfoDto,
        file: Express.Multer.File
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                include: {
                    creative: {
                        select: {
                            id: true,
                            personalInfo: true
                        }
                    }
                }
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, "User not found")
            }

            let proofOfId: IFile
            const personalInfo = user.creative?.personalInfo

            if (file) {
                const result = validateFile(file, 5 << 20, 'jpg', 'png')

                if (result?.status) {
                    return this.response.sendError(res, result.status, result.message)
                }

                const path = `${userId}/${genFileName()}.${this.misc.getFileExtension(file)}`
                await this.aws.uploadS3(result.file, path)
                proofOfId = {
                    path,
                    type: file.mimetype,
                    url: this.aws.getS3(path)
                }

                if (personalInfo?.proofOfId?.path) {
                    await this.aws.deleteS3(personalInfo.proofOfId.path)
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
                    where: { userId },
                    data: { key: genReferralKey(username) }
                })
            } else {
                username = user.username
            }

            firstname = firstname && user.firstname !== firstname ? titleText(firstname) : user.firstname
            lastname = lastname && user.lastname !== lastname ? titleText(lastname) : user.lastname

            let languages: string[] = []

            if (language) {
                languages = JSON.parse(language.replace(/'/g, '"')) as Array<string>
            }

            const [personalInfoData] = await this.prisma.$transaction([
                this.prisma.talentPersonalInfo.update({
                    where: { talentId: user.creative.id },
                    data: {
                        gender, religion, dob, country, state, address, idType,
                        languages, fbHandle, igHandle, xHandle, phone, altPhone,
                        proofOfId: proofOfId?.path ? proofOfId : personalInfo?.proofOfId,
                    }
                }),
                this.prisma.user.update({
                    where: { id: userId },
                    data: { username, firstname, lastname }
                })
            ])

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
            const creative = await this.prisma.creative.upsert({
                where: { userId: sub },
                create: { bio, user: { connect: { id: sub } } },
                update: { bio }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: { bio: creative.bio }
            })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error saving Bio')
        }
    }

    async updateBio(
        res: Response,
        userId: string,
        bio: string,
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, "User not found")
            }

            if (user.role !== "creative") {
                return this.response.sendError(res, StatusCodes.UnprocessableEntity, "User's role is not creative")
            }

            const creative = await this.prisma.creative.update({
                where: { userId },
                data: { bio }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: creative,
                message: "User bio has been updated successfully"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error saving Bio')
        }
    }

    async addCertification(
        res: Response,
        { sub }: ExpressUser,
        { certifications }: CertificationsDTO
    ) {
        try {
            const creative = await this.prisma.creative.findUnique({
                where: { userId: sub }
            })

            if (!creative) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'Complete your personal information')
            }

            const certs: CreativeCertification[] = []
            for (const certification of certifications) {
                const cert = await this.prisma.creativeCertification.create({
                    data: { ...certification, creative: { connect: { id: creative.id } } }
                })

                certs.push(cert)
            }

            this.response.sendSuccess(res, StatusCodes.OK, { data: certs, message: "Saved!" })
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
