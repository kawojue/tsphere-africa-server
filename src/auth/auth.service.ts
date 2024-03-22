import { User } from '@prisma/client'
import { JwtService } from '@nestjs/jwt'
import { USER_REGEX } from 'utils/regExp'
import { Injectable } from '@nestjs/common'
import { Request, Response } from 'express'
import StatusCodes from 'enums/StatusCodes'
import { genToken } from 'helpers/genToken'
import { SendRes } from 'lib/sendRes.service'
import { titleName } from 'helpers/formatTexts'
import { PlunkService } from 'lib/plunk.service'
import { Profile } from 'passport-google-oauth20'
import { Role, Validation } from '@prisma/client'
import { genRandomCode } from 'helpers/genRandStr'
import { PrismaService } from 'lib/prisma.service'
import { EncryptionService } from 'lib/encryption.service'
import { generateUsername } from 'unique-username-generator'
import { LoginAdminDto, RegisterAdminDto } from './dto/admin.dto'
import { ResetPasswordDto, ResetPasswordTokenDto } from './dto/reset-password.dto'
import { GoogleOnboardingDto, RequestTokenDto, LoginDto, EmailDto, SignupDto } from './dto/auth.dto'

@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,
        private readonly response: SendRes,
        private readonly plunk: PlunkService,
        private readonly prisma: PrismaService,
        private readonly encryption: EncryptionService,
    ) { }

    private async generateAccessToken({ sub, role }: JwtPayload) {
        return await this.jwtService.signAsync({ sub, role })
    }

    private isValidUsername(username: string) {
        return USER_REGEX.test(username)
    }

    private async isTokenExpired(validation: Validation) {
        const isExpired = new Date() > new Date(validation.token_expiry)
        if (isExpired) {
            await this.prisma.validation.delete({
                where: {
                    token: validation.token
                }
            })

            return true
        }

        return false
    }

    private async validateToken(recv_token: string, validation: Validation) {
        const decodedToken = atob(recv_token)
        const token = genToken(validation?.userId, validation?.randomCode)

        return token.token === decodedToken
    }

    private genenerateToken(id: string) {
        const randomCode = genRandomCode()
        const tk = genToken(id, randomCode)
        const token = Buffer.from(tk.token).toString('base64')

        return {
            token,
            randomCode,
            token_expiry: tk.token_expiry
        }
    }

    private async sendVerificationEmail(email: string, token: string) {
        await this.plunk.sendPlunkEmail({
            to: email,
            subject: "Verify your email",
            body: `${process.env.CLIENT_URL}/verify-email?token=${token}&token_type=email`
        })
    }

    async googleAuth(
        req: Request,
        refreshToken: string,
        accessToken: string,
        profile: Profile,
    ): Promise<{
        access_token: string
        user: User
    }> {
        try {
            const email: string = profile.emails![0].value

            let user = await this.prisma.user.findFirst({
                where: {
                    OR: [
                        { email },
                        {
                            provider_id: String(profile.id)
                        }
                    ]
                }
            })

            let username: string = profile.name?.givenName?.toLowerCase()
                || profile.name?.middleName?.toLowerCase()
                || profile.name?.familyName?.toLowerCase()
                || email.split('@')[0]?.toLowerCase()

            if (!user) {
                const usernameTaken = await this.prisma.user.findUnique({
                    where: { username }
                })
                if (usernameTaken || !this.isValidUsername(username)) {
                    username = generateUsername("", 0, 9)
                }

                const subscribed = await this.prisma.subscribedEmails.findUnique({
                    where: { email }
                })

                user = await this.prisma.user.create({
                    data: {
                        email,
                        username,
                        auth_method: 'google',
                        subscribed: subscribed ? true : false,
                        email_verified: true,
                        firstname: profile.name?.givenName || profile.name.middleName,
                        lastname: profile.name?.familyName || profile.displayName,
                        provider_id: String(profile.id)
                    }
                })
            }

            return {
                access_token: await this.generateAccessToken({
                    sub: user.id,
                    role: user.role,
                }),
                user
            }
        } catch (err) {
            throw err
        }
    }

    async completeGoogleOnboarding(
        res: Response,
        { sub }: ExpressUser,
        { username, role, firstname, lastname }: GoogleOnboardingDto,
    ) {
        try {
            firstname = titleName(firstname)
            lastname = titleName(lastname)

            if (!this.isValidUsername(username)) {
                this.response.sendError(res, StatusCodes.BadRequest, 'Username is not allowed')
                return
            }

            if (!['talent', 'creative', 'client'].includes(role)) {
                this.response.sendError(res, StatusCodes.BadRequest, 'Invalid role selected')
                return
            }

            const isUsernameTaken = await this.prisma.user.findUnique({
                where: { username }
            })

            if (isUsernameTaken) {
                this.response.sendError(res, StatusCodes.Conflict, 'Username has been taken')
                return
            }

            await this.prisma.user.update({
                where: {
                    id: sub
                },
                data: { role, firstname, lastname }
            })

            const access_token = await this.generateAccessToken({ sub, role })

            this.response.sendSuccess(res, StatusCodes.Created, { access_token, role })
        } catch (err) {
            this.handleError(res, err, "Error completing onboarding")
        }
    }

    async subscribeToNewsletter(
        res: Response,
        { email }: EmailDto,
    ): Promise<{ message: string }> {
        try {
            email = email.trim().toLowerCase()
            const user = await this.prisma.user.findUnique({
                where: { email }
            })

            const subscribedEmail = await this.prisma.subscribedEmails.findUnique({
                where: { email }
            })

            if ((user && user.subscribed) || subscribedEmail) {
                this.response.sendError(res, StatusCodes.Conflict, `You've already subscribed`)
                return
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
            this.handleError(res, err, "Error subscribing to news letter")
        }
    }

    async signup(
        res: Response,
        {
            first_name, last_name, username,
            email, password, role,
        }: SignupDto
    ) {
        try {
            last_name = titleName(last_name)
            first_name = titleName(first_name)

            if (!this.isValidUsername(username)) {
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
                    email,
                    username,
                    password,
                    role: role as Role,
                    auth_method: 'local',
                    firstname: first_name,
                    lastname: last_name,
                }
            })

            const token = this.genenerateToken(newUser.id)
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
            await this.sendVerificationEmail(email, token.token)

            this.response.sendSuccess(res, StatusCodes.Created, {
                message: "A verification link has been sent to you email"
            })
        } catch (err) {
            this.handleError(res, err)
        }
    }

    async verifyEmail(res: Response, token: string) {
        try {
            const validation = await this.prisma.validation.findUnique({
                where: { token }
            })
            const isMatch = this.validateToken(token, validation)

            if (!validation || !isMatch) {
                this.response.sendError(res, StatusCodes.Unauthorized, 'Token does not match')
                return
            }

            if ((await this.isTokenExpired(validation))) {
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
            this.handleError(res, err, "Error verifying emaail")
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

            const token = this.genenerateToken(user.id)

            if (token_type === 'email') {
                await this.sendVerificationEmail(email, token.token)
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
            this.handleError(res, err, "Error sending verification link")
        }
    }

    async resetPassword(
        res: Response,
        { password1, password2 }: ResetPasswordDto,
        { token_type, token }: ResetPasswordTokenDto,
    ) {
        try {
            if (token_type !== 'password') {
                this.response.sendError(res, StatusCodes.BadRequest, 'Invalid token type')
                return
            }

            if (password1 !== password2) {
                this.response.sendError(res, StatusCodes.BadRequest, 'Passwords not match')
                return
            }

            const validation = await this.prisma.validation.findUnique({
                where: { token }
            })
            const isMatch = this.validateToken(token, validation)

            if (!validation || !isMatch) {
                this.response.sendError(res, StatusCodes.Unauthorized, 'Token does not match')
                return
            }

            if ((await this.isTokenExpired(validation))) {
                this.response.sendError(res, StatusCodes.Forbidden, 'Token has expired')
                return
            }

            const password = await this.encryption.hashAsync(password1)
            await this.prisma.user.update({
                where: {
                    id: validation.userId
                },
                data: { password }
            })
            await this.prisma.validation.delete({
                where: { token }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Password reseted successfully"
            })
        } catch (err) {
            this.handleError(res, err, 'Error resetting password')
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
        if (!this.isValidUsername(username)) {
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
            message: user ? "Username has been taken" : 'Username is valid'
        })
    }

    async registerAdmin(
        res: Response,
        { email, password, fullName, registrationKey }: RegisterAdminDto
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
            this.handleError(res, err)
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
                access_token: await this.generateAccessToken({
                    role: admin.role,
                    sub: admin.id,
                })
            })
        } catch (err) {
            this.handleError(res, err)
        }
    }

    handleError(res: Response, err?: any, msg?: string) {
        console.error(err)
        return this.response.sendError(res, StatusCodes.InternalServerError, msg || 'Somthing went wrong')
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

            if (user.auth_method === 'google') {
                this.response.sendError(res, StatusCodes.Forbidden, 'Login through Google Provider')
                return
            }

            const isMatch = await this.encryption.compareAsync(password, user.password)
            if (!isMatch) {
                this.response.sendError(res, StatusCodes.Unauthorized, 'Incorrect Password')
            }

            if (!user.email_verified) {
                const token = this.genenerateToken(user.id)
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
                    await this.sendVerificationEmail(user.email, token.token)
                }
            }

            const accessToken = await this.generateAccessToken({
                sub: user.id,
                role: user.role,
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                role: user.role,
                access_token: accessToken,
                message: "Login Successful"
            })
        } catch (err) {
            this.handleError(res, err)
        }
    }
}
