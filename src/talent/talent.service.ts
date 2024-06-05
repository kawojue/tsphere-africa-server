import { Response } from 'express'
import { validateFile } from 'utils/file'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { AwsService } from 'lib/aws.service'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { titleText } from 'helpers/formatTexts'
import { genFileName } from 'helpers/genFilename'
import { PrismaService } from 'lib/prisma.service'
import { genReferralKey } from 'helpers/genReferralKey'
import { TalentBioStatsDto } from './dto/bio-stats.dto'
import { TalentPersonalInfoDto } from './dto/personal-info.dto'

@Injectable()
export class TalentService {
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
            language, xHandle, phone, username, firstname,
            igHandle, nationality, address, state, religion,
            gender, lastname, altPhone, country, fbHandle, dob,
            idType, playingMaxAge, workingTitle, playingMinAge,
        }: TalentPersonalInfoDto,
        file: Express.Multer.File
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: {
                    id: sub
                },
                include: {
                    talent: {
                        select: {
                            personalInfo: true
                        }
                    }
                }
            })

            if (user.verified) {
                return this.response.sendError(res, StatusCodes.Unauthorized, "Can't edit since you're verified")
            }

            const personalInfo = user.talent?.personalInfo

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

                const path = `${sub}/${genFileName()}.${this.misc.getFileExtension(file)}`
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

            const [_, talent] = await this.prisma.$transaction([
                this.prisma.user.update({
                    where: {
                        id: user.id
                    },
                    data: { username, firstname, lastname }
                }),
                this.prisma.talent.upsert({
                    where: { userId: user.id },
                    create: {
                        user: { connect: { id: user.id } }
                    },
                    update: {}
                })
            ])

            const languages = JSON.parse(language.replace(/'/g, '"')) as Array<string>

            const personalInfoData = await this.prisma.talentPersonalInfo.upsert({
                where: { talentId: talent.id },
                create: {
                    languages, fbHandle, igHandle, xHandle, workingTitle,
                    phone, altPhone, gender, religion, dob, playingMaxAge,
                    playingMinAge, nationality, country, state, address, idType,
                    proofOfId: proofOfId?.path ? proofOfId : personalInfo?.proofOfId,
                    talent: { connect: { id: talent.id } }
                },
                update: {
                    playingMaxAge, playingMinAge, nationality, country,
                    state, address, idType, languages, workingTitle, fbHandle,
                    igHandle, xHandle, dob, phone, altPhone, gender, religion,
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
            language, xHandle, phone, username, firstname,
            igHandle, nationality, address, state, religion,
            gender, lastname, altPhone, country, fbHandle, dob,
            idType, playingMaxAge, workingTitle, playingMinAge,
        }: TalentPersonalInfoDto,
        file: Express.Multer.File
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: {
                    id: userId
                },
                include: {
                    talent: {
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
            const personalInfo = user.talent?.personalInfo

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
                    where: { talentId: user.talent.id },
                    data: {
                        languages, fbHandle, igHandle, xHandle, workingTitle,
                        phone, altPhone, gender, religion, dob, playingMaxAge,
                        playingMinAge, nationality, country, state, address, idType,
                        proofOfId: proofOfId?.path ? proofOfId : personalInfo?.proofOfId,
                    }
                }),
                this.prisma.user.update({
                    where: {
                        id: user.id
                    },
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

    async bioStats(
        res: Response,
        bio: TalentBioStatsDto,
        { sub }: ExpressUser
    ) {
        try {
            const talent = await this.prisma.talent.findUnique({
                where: { userId: sub }
            })

            if (!talent) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Complete your personal information')
            }

            // @ts-ignore
            if (bio?.role) {
                // @ts-ignore
                delete bio.role
            }

            const bioStat = await this.prisma.talentBioStats.upsert({
                where: {
                    talentId: talent.id
                },
                create: { ...bio, talent: { connect: { id: talent.id } } },
                update: bio
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: bioStat })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error saving Bio and Statistics')
        }
    }

    async editBioStats(
        res: Response,
        userId: string,
        bio: TalentBioStatsDto,
    ) {
        try {
            const talent = await this.prisma.talent.findUnique({
                where: { userId }
            })

            if (!talent) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Talent not found')
            }

            const updatedBioStat = await this.prisma.talentBioStats.update({
                where: {
                    talentId: talent.id
                },
                data: bio
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: updatedBioStat })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error saving Bio and Statistics')
        }
    }

}
