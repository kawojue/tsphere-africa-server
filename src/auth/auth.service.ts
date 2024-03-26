import { Response } from 'express'
import { validateFile } from 'utils/file'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { titleName } from 'helpers/formatTexts'
import { PlunkService } from 'lib/plunk.service'
import { genFileName } from 'helpers/genFilename'
import { PrismaService } from 'lib/prisma.service'
import { WasabiService } from 'lib/wasabi.service'
import { EncryptionService } from 'lib/encryption.service'
import { LoginAdminDto, RegisterAdminDto } from './dto/admin.dto'
import { RequestTokenDto, LoginDto, EmailDto, SignupDto, SignupUnder18Dto } from './dto/auth.dto'
import { ResetPasswordDto, ResetPasswordTokenDto, UpdatePasswordDto } from './dto/reset-password.dto'

@Injectable()
export class AuthService {
    constructor(
        private misc: MiscService,
        private readonly response: SendRes,
        private readonly plunk: PlunkService,
        private readonly prisma: PrismaService,
        private readonly wasabi: WasabiService,
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
        files: Express.Multer.File[],
        {
            first_name, last_name,
            email, username, password,
            skill, role, issuingCountry,
        }: SignupUnder18Dto
    ) {
        try {
            last_name = titleName(last_name)
            first_name = titleName(first_name)

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

            password = await this.encryption.hashAsync(password)

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
                    this.misc.handleServerError(res, err, err.message)
                }
            }

            const user = await this.prisma.user.create({
                data: {
                    under18: true,
                    role, password,
                    lastname: last_name,
                    firstname: first_name,
                    email, username, skill,
                }
            })

            await this.prisma.under18Kyc.create({
                data: {
                    issuingCountry,
                    images: filesArray,
                    user: {
                        connect: {
                            id: user.id
                        }
                    }
                }
            })


            const token = this.misc.genenerateToken(user.id)
            await this.prisma.validation.create({
                data: {
                    ...token,
                    user: {
                        connect: {
                            id: user.id
                        }
                    }
                }
            })
            await this.plunk.sendVerificationEmail(email, token.token)

            await this.prisma.isSubscribed(email)

            this.response.sendSuccess(res, StatusCodes.Created, {
                message: "A verification link has been sent to your email"
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async signupOver18(
        res: Response,
        {
            email, password, role, skill,
            first_name, last_name, username,
        }: SignupDto
    ) {
        try {
            last_name = titleName(last_name)
            first_name = titleName(first_name)

            if (!this.misc.isValidUsername(username)) {
                this.response.sendError(res, StatusCodes.BadRequest, "Username is not allowed")
                return
            }

            const usernameExists = await this.prisma.user.findUnique({
                where: { username }
            })
            if (usernameExists) {
                this.response.sendError(res, StatusCodes.Conflict, "Username has been taken")
            }

            const user = await this.prisma.user.findUnique({
                where: { email }
            })
            if (user) {
                this.response.sendError(res, StatusCodes.Conflict, 'User with this email already exists')
                return
            }

            password = await this.encryption.hashAsync(password)

            const newUser = await this.prisma.user.create({
                data: {
                    under18: false,
                    skill, username,
                    lastname: last_name,
                    firstname: first_name,
                    password, email, role,
                }
            })

            const token = this.misc.genenerateToken(newUser.id)
            await this.prisma.validation.create({
                data: {
                    ...token,
                    user: {
                        connect: {
                            id: newUser.id
                        }
                    }
                }
            })
            await this.plunk.sendVerificationEmail(email, token.token)

            await this.prisma.isSubscribed(email)

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
                await this.plunk.sendVerificationEmail(email, token.token)
            } else if (token_type === 'password') {
                await this.plunk.sendPlunkEmail({
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

    async registerAdmin(
        res: Response,
        {
            password, fullName,
            email, registrationKey,
        }: RegisterAdminDto
    ) {
        try {
            fullName = titleName(fullName)
            const decodedKey = atob(registrationKey as string)
            if (decodedKey !== process.env.ADMIN_REGISTRATION_KEY) {
                this.response.sendError(res, StatusCodes.Unauthorized, 'Invalid registration key')
                return
            }

            const admins = await this.prisma.admin.count()
            if (admins === 10) {
                this.response.sendError(res, StatusCodes.Forbidden, "Maximum moderators reached.")
                return
            }

            const admin = await this.prisma.admin.findUnique({
                where: { email }
            })

            if (admin) {
                this.response.sendError(res, StatusCodes.Conflict, `Warning! Existing ${admin.role}`)
                return
            }

            password = await this.encryption.hashAsync(password)

            await this.prisma.admin.create({
                data: { email, fullName, password }
            })

            this.response.sendSuccess(res, StatusCodes.Created, { message: "You're now a Moderator!" })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async loginAdmin(
        res: Response,
        { email, password }: LoginAdminDto
    ) {
        try {
            const admin = await this.prisma.admin.findUnique({ where: { email } })
            if (!admin) {
                this.response.sendError(res, StatusCodes.NotFound, 'Warning! Invalid email or password')
                return
            }

            const isMatch = await this.encryption.compareAsync(password, admin.password)

            if (!isMatch) {
                this.response.sendError(res, StatusCodes.Unauthorized, 'Incorrect Password')
                return
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                access_token: await this.misc.generateAccessToken({
                    role: admin.role,
                    sub: admin.id,
                })
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
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
                this.response.sendError(res, StatusCodes.NotFound, 'Invalid email or password')
                return
            }

            const isMatch = await this.encryption.compareAsync(password, user.password)
            if (!isMatch) {
                this.response.sendError(res, StatusCodes.Unauthorized, 'Incorrect Password')
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
                        update: { ...token }
                    })
                    await this.plunk.sendVerificationEmail(user.email, token.token)
                }
            }

            const accessToken = await this.misc.generateAccessToken({
                sub: user.id,
                role: user.role,
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: {
                    email: user.email,
                    avatar: user.avatar,
                    lastname: user.lastname,
                    username: user.username,
                    firstname: user.firstname,
                    role: user.role,
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
                await this.wasabi.deleteS3(user.avatar.path)
            }

            const result = validateFile(file, 5 << 20, 'jpg', 'png')
            if (result?.status) {
                return this.response.sendError(res, result.status, result.message)
            }
            const { Key, Location } = await this.wasabi.uploadS3(result.file, genFileName())

            await this.prisma.user.update({
                where: {
                    id: sub
                },
                data: {
                    avatar: {
                        path: Key,
                        url: Location,
                        type: result.file.mimetype,
                    }
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Profile photo has been updated successfully",
                data: {
                    url: Location
                }
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }
}
