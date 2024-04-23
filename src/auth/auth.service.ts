import { Response } from 'express'
import { Referral } from '@prisma/client'
import { validateFile } from 'utils/file'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { AwsService } from 'lib/aws.service'
import {
    RequestTokenDto, LoginDto, EmailDto,
    SignupDto, SignupUnder18Dto, ReferralDto,
} from './dto/auth.dto'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { BrevoService } from 'lib/brevo.service'
import { genFileName } from 'helpers/genFilename'
import { PrismaService } from 'lib/prisma.service'
import { genReferralKey } from 'helpers/genReferralKey'
import { EncryptionService } from 'lib/encryption.service'
import {
    ResetPasswordDto, ResetPasswordTokenDto, UpdatePasswordDto
} from './dto/reset-password.dto'

@Injectable()
export class AuthService {
    constructor(
        private readonly aws: AwsService,
        private readonly response: SendRes,
        private readonly misc: MiscService,
        private readonly brevo: BrevoService,
        private readonly prisma: PrismaService,
        private readonly encryption: EncryptionService,
    ) { }

    async subscribeToNewsletter(
        res: Response,
        { email }: EmailDto,
    ) {
        try {
            email = email.trim().toLowerCase()
            const user = await this.prisma.user.findUnique({
                where: { email }
            })

            const subscribedEmail = await this.prisma.subscribedEmails.findUnique({
                where: { email }
            })

            if ((user && user.subscribed) || subscribedEmail) {
                return this.response.sendError(res, StatusCodes.Conflict, `You've already subscribed`)
            } else if (!user && !subscribedEmail) {
                await this.prisma.subscribedEmails.create({
                    data: { email }
                })
            } else {
                await this.prisma.user.update({
                    where: { email },
                    data: {
                        subscribed: true
                    }
                })
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: 'Thanks for subscribing to our news letter!'
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error subscribing to news letter")
        }
    }

    async signupUnder18(
        res: Response,
        { refKey }: ReferralDto,
        files: Express.Multer.File[],
        {
            first_name, last_name,
            email, username, password,
            skill, role, issuingCountry,
        }: SignupUnder18Dto
    ) {
        try {
            if (files.length === 0) {
                return this.response.sendError(res, StatusCodes.BadRequest, "ID is required")
            }

            if (files.length > 2) {
                return this.response.sendError(res, StatusCodes.PayloadTooLarge, "Images shouldn't be greater than 2")
            }

            if (!this.misc.isValidUsername(username)) {
                return this.response.sendError(res, StatusCodes.BadRequest, "Username is not allowed")
            }

            const findUserByUsername = await this.prisma.user.findUnique({
                where: { username }
            })

            if (findUserByUsername) {
                return this.response.sendError(res, StatusCodes.Conflict, "Username has been taken")
            }

            const findUserByEmail = await this.prisma.user.findUnique({
                where: { email }
            })

            if (findUserByEmail) {
                return this.response.sendError(res, StatusCodes.Conflict, 'User with this email already exists')
            }

            let filesArray = [] as IFile[]
            try {
                const results = await Promise.all(files.map(async (file) => {
                    const result = validateFile(file, 5 << 20, 'jpg', 'png')
                    if (result.status) {
                        return this.response.sendError(res, result.status, result.message)
                    }

                    const path = `${user.id}/${genFileName()}`
                    await this.aws.uploadS3(result.file, path)
                    return {
                        path,
                        url: this.aws.getS3(path),
                        type: result.file.mimetype,
                    }
                }))

                filesArray = results.filter((result): result is IFile => !!result)
            } catch {
                try {
                    if (filesArray.length > 0) {
                        for (const file of filesArray) {
                            if (file?.path) {
                                await this.aws.deleteS3(file.path)
                            }
                        }
                    }
                    filesArray = []
                } catch (err) {
                    this.misc.handleServerError(res, err, err.message)
                }
            }

            password = await this.encryption.hashAsync(password)

            let referral: Referral

            if (refKey) {
                referral = await this.prisma.referral.findUnique({
                    where: { key: refKey }
                })

                if (referral) {
                    await this.prisma.referral.update({
                        where: { key: refKey },
                        data: { points: { increment: 10 } }
                    })
                }
            }

            const user = await this.prisma.user.create({
                data: {
                    under18: true,
                    role, password,
                    email, username,
                    primarySkill: skill,
                    lastname: last_name,
                    firstname: first_name,
                }
            })

            if (user) {
                const token = this.misc.genenerateToken(user.id)

                await this.prisma.$transaction([
                    this.prisma.under18Kyc.create({
                        data: {
                            issuingCountry,
                            images: filesArray,
                            user: { connect: { id: user.id } }
                        }
                    }),
                    this.prisma.validation.create({
                        data: {
                            ...token,
                            user: { connect: { id: user.id } }
                        }
                    }),
                    this.prisma.referral.create({
                        data: {
                            key: genReferralKey(user.username),
                            user: { connect: { id: user.id } }
                        }
                    })
                ])

                if (referral) {
                    await this.prisma.referred.create({
                        data: {
                            user: { connect: { id: user.id } },
                            referral: { connect: { id: referral.id } },
                        }
                    })
                }

                await this.brevo.sendVerificationEmail(email, token.token)
                await this.prisma.isSubscribed(email)
            }

            this.response.sendSuccess(res, StatusCodes.Created, {
                message: "A verification link has been sent to your email"
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async signupOver18(
        res: Response,
        { refKey }: ReferralDto,
        {
            email, password, role, skill,
            first_name, last_name, username,
        }: SignupDto
    ) {
        try {
            if (!this.misc.isValidUsername(username)) {
                this.response.sendError(res, StatusCodes.BadRequest, "Username is not allowed")
                return
            }

            const usernameExists = await this.prisma.user.findUnique({
                where: { username }
            })

            if (usernameExists) {
                this.response.sendError(res, StatusCodes.Conflict, "Username has been taken")
                return
            }

            const user = await this.prisma.user.findUnique({
                where: { email }
            })

            if (user) {
                this.response.sendError(res, StatusCodes.Conflict, 'User with this email already exists')
                return
            }

            let referral: Referral

            if (refKey) {
                referral = await this.prisma.referral.findUnique({
                    where: { key: refKey }
                })

                if (referral) {
                    await this.prisma.referral.update({
                        where: { key: refKey },
                        data: { points: { increment: 10 } }
                    })
                }
            }

            password = await this.encryption.hashAsync(password)

            const newUser = await this.prisma.user.create({
                data: {
                    username,
                    under18: false,
                    primarySkill: skill,
                    lastname: last_name,
                    firstname: first_name,
                    password, email, role,
                }
            })

            if (newUser) {
                const token = this.misc.genenerateToken(newUser.id)

                await this.prisma.$transaction([
                    this.prisma.validation.create({
                        data: {
                            ...token,
                            user: { connect: { id: newUser.id } }
                        }
                    }),
                    this.prisma.referral.create({
                        data: {
                            key: genReferralKey(newUser.username),
                            user: { connect: { id: newUser.id } }
                        }
                    })
                ])

                if (referral) {
                    await this.prisma.referred.create({
                        data: {
                            user: { connect: { id: newUser.id } },
                            referral: { connect: { id: referral.id } },
                        }
                    })
                }

                await this.brevo.sendVerificationEmail(email, token.token)
                await this.prisma.isSubscribed(email)
            }

            this.response.sendSuccess(res, StatusCodes.Created, {
                message: "A verification link has been sent to your email"
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async verifyEmail(res: Response, token: string) {
        try {
            const validation = await this.prisma.validation.findUnique({
                where: { token }
            })
            const isMatch = this.prisma.validateToken(token, validation)

            if (!validation || !isMatch) {
                this.response.sendError(res, StatusCodes.Unauthorized, 'Token does not match')
                return
            }

            if ((await this.prisma.isTokenExpired(validation))) {
                this.response.sendError(res, StatusCodes.Forbidden, 'Token has expired')
                return
            }

            await this.prisma.user.update({
                where: {
                    id: validation.userId
                },
                data: {
                    email_verified: true
                }
            })
            await this.prisma.validation.delete({
                where: {
                    id: validation.id
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Your email is now verified"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error verifying emaail")
        }
    }

    async requestToken(
        res: Response,
        { email, token_type }: RequestTokenDto
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { email }
            })

            if (!user) {
                this.response.sendError(res, StatusCodes.NotFound, "There is no email associated with this account")
                return
            }

            const token = this.misc.genenerateToken(user.id)

            if (token_type === 'email') {
                await this.brevo.sendVerificationEmail(email, token.token)
            } else if (token_type === 'password') {
                await this.brevo.sendTransactionalEmail({
                    to: email,
                    subject: "Reset Password",
                    body: `${process.env.CLIENT_URL}/reset-password?token=${token.token}&token_type=password`
                })
            } else {
                this.response.sendError(res, StatusCodes.BadRequest, 'Invalid token type')
                return
            }

            await this.prisma.validation.upsert({
                where: {
                    userId: user.id
                },
                create: {
                    ...token,
                    user: {
                        connect: {
                            id: user.id
                        }
                    }
                },
                update: token
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "New verification link has been sent to your email"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error sending verification link")
        }
    }

    async resetPassword(
        res: Response,
        { password, password2 }: ResetPasswordDto,
        { token_type, token }: ResetPasswordTokenDto,
    ) {
        try {
            if (token_type !== 'password') {
                this.response.sendError(res, StatusCodes.BadRequest, 'Invalid token type')
                return
            }

            if (password !== password2) {
                this.response.sendError(res, StatusCodes.BadRequest, 'Passwords not match')
                return
            }

            const validation = await this.prisma.validation.findUnique({
                where: { token }
            })
            const isMatch = this.prisma.validateToken(token, validation)

            if (!validation || !isMatch) {
                this.response.sendError(res, StatusCodes.Unauthorized, 'Token does not match')
                return
            }

            if ((await this.prisma.isTokenExpired(validation))) {
                this.response.sendError(res, StatusCodes.Forbidden, 'Token has expired')
                return
            }

            const newPassword = await this.encryption.hashAsync(password)
            await this.prisma.user.update({
                where: {
                    id: validation.userId
                },
                data: {
                    password: newPassword
                }
            })
            await this.prisma.validation.delete({
                where: { token }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Password reseted successfully"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error resetting password')
        }
    }

    async emailExists(res: Response, email: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                email: email.trim().toLowerCase()
            }
        })

        this.response.sendSuccess(res, StatusCodes.OK, {
            isExist: user ? true : false,
            message: user ? "Account with this email exist" : 'There is no account associated with this email'
        })
    }

    async usernameExists(res: Response, username: string) {
        if (!this.misc.isValidUsername(username)) {
            this.response.sendError(res, StatusCodes.BadRequest, "Username is not allowed")
            return
        }

        const user = await this.prisma.user.findUnique({
            where: {
                username: username.trim().toLowerCase()
            }
        })

        this.response.sendSuccess(res, StatusCodes.OK, {
            isExist: user ? true : false,
            message: user ? "Username has been taken" : "Username is valid"
        })
    }

    async login(res: Response, { email, password }: LoginDto) {
        try {
            const user = await this.prisma.user.findUnique({
                where: {
                    email: email.trim().toLowerCase()
                },
                include: {
                    validation: true
                }
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Invalid email or password')
            }

            const isMatch = await this.encryption.compareAsync(password, user.password)
            if (!isMatch) {
                return this.response.sendError(res, StatusCodes.Unauthorized, 'Incorrect Password')
            }

            if (!user.email_verified) {
                const token = this.misc.genenerateToken(user.id)
                let expired = user.validation ? new Date() > user.validation.token_expiry : false
                if ((!expired && !user.validation) || (expired && user.validation)) {
                    await this.prisma.validation.upsert({
                        where: {
                            userId: user.id,
                        },
                        create: {
                            ...token,
                            user: {
                                connect: {
                                    id: user.id
                                }
                            }
                        },
                        update: token
                    })
                    await this.brevo.sendVerificationEmail(user.email, token.token)
                }
            }

            const accessToken = await this.misc.generateAccessToken({
                sub: user.id,
                role: user.role,
                userStatus: user.userStatus
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: {
                    role: user.role,
                    email: user.email,
                    avatar: user.avatar,
                    lastname: user.lastname,
                    username: user.username,
                    firstname: user.firstname,
                },
                access_token: accessToken,
                message: "Login Successful"
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async updatePassword(
        res: Response,
        { sub }: ExpressUser,
        { oldPassword, password }: UpdatePasswordDto
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: {
                    id: sub
                }
            })

            const isMatch = await this.encryption.compareAsync(oldPassword, user.password)
            if (!isMatch) {
                return this.response.sendError(res, StatusCodes.Unauthorized, 'Incorrect old password')
            }

            const hashedPassword = await this.encryption.hashAsync(password)
            await this.prisma.user.update({
                where: {
                    id: sub
                },
                data: {
                    password: hashedPassword
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Password updated successfully"
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async uploadAvatar(
        res: Response,
        { sub }: ExpressUser,
        file: Express.Multer.File
    ) {
        try {
            if (!file) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'No file was selected')
            }

            const user = await this.prisma.user.findUnique({
                where: {
                    id: sub
                }
            })

            if (user.avatar?.path) {
                await this.aws.deleteS3(user.avatar.path)
            }

            const result = validateFile(file, 5 << 20, 'jpg', 'png')
            if (result?.status) {
                return this.response.sendError(res, result.status, result.message)
            }

            const path = `${user.id}/${genFileName()}`
            await this.aws.uploadS3(result.file, path)
            const url = this.aws.getS3(path)

            await this.prisma.user.update({
                where: {
                    id: sub
                },
                data: {
                    avatar: {
                        url,
                        path,
                        type: result.file.mimetype,
                    }
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Profile photo has been updated successfully",
                data: { data: { url } }
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }
}
