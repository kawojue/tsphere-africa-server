import { Response } from 'express'
import { validateFile } from 'utils/file'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { AwsService } from 'lib/aws.service'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { titleName } from 'helpers/formatTexts'
import { genFileName } from 'helpers/genFilename'
import { PrismaService } from 'lib/prisma.service'
import { TalentBioStatsDto } from './dto/bio-stats.dto'
import { TalentPersonalInfoDto } from './dto/personal-info.dto'
import { TalentRatesAvailabilityDto } from './dto/rates-availability.dto'

@Injectable()
export class TalentService {
    constructor(
        private readonly response: SendRes,
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
        private readonly aws: AwsService,
    ) { }

    async personalInfo(
        res: Response,
        { sub }: ExpressUser,
        {
            gender, idType, altPhone, country, dob, fbHandle, igHandle,
            lastname, playingAge, state, nationality, religion, address,
            language, xHandle, phone, username, firstname, workingTitle,
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

            const personalInfoData = await this.prisma.talentPersonalInfo.upsert({
                where: { talentId: talent.id },
                create: {
                    phone, altPhone, gender, religion, dob, playingAge, nationality,
                    country, state, proofOfId: proofOfId?.path ? proofOfId : personalInfo?.proofOfId,
                    address, idType, language, fbHandle, igHandle, xHandle, workingTitle,
                    talent: { connect: { id: talent.id } }
                },
                update: {
                    phone, altPhone, gender, religion, dob, playingAge, nationality, country,
                    state, address, idType, language, workingTitle, fbHandle, igHandle, xHandle
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

    async bioStats(
        res: Response,
        bio: TalentBioStatsDto,
        { sub }: ExpressUser
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

    async ratesAndAvailability(
        res: Response,
        { sub }: ExpressUser,
        ratesObj: TalentRatesAvailabilityDto
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

            if (!this.misc.isValidWorkday(ratesObj.from, ratesObj.to)) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'Invalid weekdays')
            }

            const rates = await this.prisma.talentRatesAndAvailability.upsert({
                where: {
                    talentId: talent.id
                },
                create: { ...ratesObj, talent: { connect: { id: talent.id } } },
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
