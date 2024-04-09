import { Response } from 'express'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { titleName } from 'helpers/formatTexts'
import { PrismaService } from 'lib/prisma.service'
import { EncryptionService } from 'lib/encryption.service'
import { LoginAdminDto, RegisterAdminDto } from './dto/auth.dto'
import { AnalyticsDto, UserSuspensionDto } from './dto/user.dto'

@Injectable()
export class ModminService {
    constructor(
        private readonly response: SendRes,
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
        private readonly encryption: EncryptionService,
    ) { }

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

    async analytics(res: Response, { role }: AnalyticsDto) {
        try {
            let total: number

            if (role === "talent") {
                total = await this.prisma.user.count({
                    where: {
                        role: 'talent'
                    }
                })
            } else if (role === "creative") {
                total = await this.prisma.user.count({
                    where: {
                        role: 'creative'
                    }
                })
            } else if (role === "client") {
                total = await this.prisma.user.count({
                    where: {
                        role: 'client'
                    }
                })
            } else {
                total = await this.prisma.user.count()
            }

            this.response.sendSuccess(res, StatusCodes.OK, { data: { total } })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async toggleUserSuspension(
        res: Response,
        userId: string,
        { action }: UserSuspensionDto
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: {
                    id: userId
                }
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, 'User not found')
            }

            await this.prisma.user.update({
                where: {
                    id: userId
                },
                data: {
                    userStatus: action === 'active' ? 'active' : 'suspended'
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { message: "Successful" })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }


}
