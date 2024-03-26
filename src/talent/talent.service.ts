import { Response } from 'express'
import { validateFile } from 'utils/file'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { titleName } from 'helpers/formatTexts'
import { genFileName } from 'helpers/genFilename'
import { WasabiService } from 'lib/wasabi.service'
import { PrismaService } from 'lib/prisma.service'
import { PersonalInfoDto } from './dto/personalInfo.dto'
import { BioDto } from './dto/bio.dto'

@Injectable()
export class TalentService {
    constructor(
        private readonly response: SendRes,
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
        private readonly wasabi: WasabiService,
    ) { }

    async personalInfo(
        res: Response,
        { sub }: ExpressUser,
        {
            lastname, playingAge, state,
            nationality, religion, address,
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
                    address, idType, language,
                    fbHandle, igHandle, xHandle,
                    phone, altPhone, gender, religion, dob,
                    playingAge, nationality, country, state,
                    proofOfId: proofOfId?.path ? proofOfId : null,
                    talent: { connect: { id: talent.id } }
                },
                update: {
                    phone, altPhone, gender, religion, dob,
                    playingAge, nationality, country, state,
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

    async uploadPortfolioImages(
        res: Response,
        { sub }: ExpressUser,
        files: Express.Multer.File[]
    ) {
        try {
            if (files.length > 3) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'Images should be maximum of three')
            } else if (files.length === 0) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'No Images were selected')
            } else {
                const talent = await this.prisma.talent.findUnique({
                    where: {
                        id: sub
                    },
                    include: {
                        portfolio: true
                    }
                })

                if (!talent) {
                    return this.response.sendError(res, StatusCodes.NotFound, 'Add your personal information')
                }

                let filesArray = [] as IFile[]
                try {
                    const results = await Promise.all(files.map(async (file) => {
                        const result = validateFile(file, 5 << 20, 'jpg', 'png')
                        if (result.status) {
                            return this.response.sendError(res, result.status, result.message)
                        }

                        const { Key, Location } = await this.wasabi.uploadS3(result.file, genFileName())
                        return {
                            path: Key,
                            url: Location,
                            type: file.mimetype
                        }
                    }))

                    filesArray = results.filter((result): result is IFile => !!result)
                } catch {
                    try {
                        if (filesArray.length > 0) {
                            for (const file of filesArray) {
                                if (file?.path) {
                                    await this.wasabi.deleteS3(file.path)
                                }
                            }
                        }
                        filesArray = []
                    } catch (err) {
                        return this.misc.handleServerError(res, err, err.message)
                    }
                }

                const talentImages = talent?.portfolio?.images || []
                if (talentImages.length > 0) {
                    for (const talentImg of talentImages) {
                        if (talentImg?.path) {
                            await this.wasabi.deleteS3(talentImg.path)
                        }
                    }
                }

                const portfolio = await this.prisma.talentPortfolio.upsert({
                    where: {
                        talentId: talent.id
                    },
                    create: {
                        images: filesArray,
                        talent: { connect: { id: talent.id } }
                    },
                    update: { images: filesArray }
                })

                this.response.sendSuccess(res, StatusCodes.OK, { data: portfolio })
            }
        } catch (err) {
            return this.misc.handleServerError(res, err)
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

            const talent = await this.prisma.talent.findUnique({
                where: {
                    id: sub
                },
                include: {
                    portfolio: true
                }
            })

            if (!talent) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Add your personal information')
            }

            const result = validateFile(file, 5 << 20, 'mp4')
            if (result?.status) {
                return this.response.sendError(res, result.status, result.message)
            }

            const { Key, Location } = await this.wasabi.uploadS3(result.file, genFileName())
            const video = {
                url: Location,
                path: Key,
                type: result.file.mimetype
            }

            const portfolio = await this.prisma.talentPortfolio.upsert({
                where: {
                    talentId: talent.id
                },
                create: { video, talent: { connect: { id: talent.id } } },
                update: { video }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: portfolio })
        } catch (err) {
            return this.misc.handleServerError(res, err)
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

            const talent = await this.prisma.talent.findUnique({
                where: {
                    id: sub
                },
                include: {
                    portfolio: true
                }
            })

            if (!talent) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Add your personal information')
            }

            const result = validateFile(file, 5 << 20, 'wav', 'mp3', 'aac')
            if (result?.status) {
                return this.response.sendError(res, result.status, result.message)
            }

            const { Key, Location } = await this.wasabi.uploadS3(result.file, genFileName())
            const audio = {
                url: Location,
                path: Key,
                type: result.file.mimetype
            }

            const portfolio = await this.prisma.talentPortfolio.upsert({
                where: {
                    talentId: talent.id
                },
                create: { audio, talent: { connect: { id: talent.id } } },
                update: { audio }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: portfolio })
        } catch (err) {
            return this.misc.handleServerError(res, err)
        }
    }

    async bio(
        res: Response,
        bio: BioDto,
        { sub }: ExpressUser
    ) {
        try {
            const talent = await this.prisma.talent.findUnique({
                where: {
                    id: sub
                },
                include: {
                    portfolio: true
                }
            })

            if (!talent) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Add your personal information')
            }

            const bioStat = await this.prisma.talentBio.upsert({
                where: {
                    talentId: talent.id
                },
                create: { ...bio, talent: { connect: { id: talent.id } } },
                update: bio
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: bioStat })
        } catch (err) {
            return this.misc.handleServerError(res, err, 'Error saving Bio and Statistics')
        }
    }
}
