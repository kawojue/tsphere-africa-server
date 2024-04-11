import { Response } from 'express'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { titleName } from 'helpers/formatTexts'
import { PrismaService } from 'lib/prisma.service'
import { EncryptionService } from 'lib/encryption.service'
import { LoginAdminDto, RegisterAdminDto } from './dto/auth.dto'
import { AnalyticsDto, SortUserDto, UserSuspensionDto } from './dto/user.dto'

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

            this.response.sendSuccess(res, StatusCodes.Created, { message: "You're now an Admin!" })
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

    async analytics(res: Response, { q }: AnalyticsDto) {
        try {
            let total: number

            if (q === "talent") {
                total = await this.prisma.user.count({
                    where: {
                        role: 'talent'
                    }
                })
            } else if (q === "creative") {
                total = await this.prisma.user.count({
                    where: {
                        role: 'creative'
                    }
                })
            } else if (q === "client") {
                total = await this.prisma.user.count({
                    where: {
                        role: 'client'
                    }
                })
            } else if (q === "job") {
                total = await this.prisma.job.count()
            } else if (q === "user") {
                total = await this.prisma.user.count()
            } else {
                return this.response.sendError(res, StatusCodes.BadRequest, 'Query is required')
            }

            this.response.sendSuccess(res, StatusCodes.OK, { data: { [`${q}s`]: total } })
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

    async fetchAllUsers(
        res: Response,
        { q, s = "", page = 1, limit = 50 }: SortUserDto,
    ) {
        try {
            let users

            page = Number(page)
            limit = Number(limit)
            const offset = (page - 1) * limit

            const OR: ({
                firstname: {
                    contains: string
                    mode: "insensitive"
                }
            } | {
                username: {
                    contains: string
                    mode: "insensitive"
                }
            } | {
                lastname: {
                    contains: string
                    mode: "insensitive"
                }
            } | {
                email: {
                    contains: string
                    mode: "insensitive"
                }
            })[] = [
                    { firstname: { contains: s, mode: 'insensitive' } },
                    { username: { contains: s, mode: 'insensitive' } },
                    { lastname: { contains: s, mode: 'insensitive' } },
                    { email: { contains: s, mode: 'insensitive' } }
                ]

            const select: {
                id: true
                role: true
                skill: true
                email: true
                avatar: true
                username: true
                lastname: true
                firstname: true,
                createdAt: true,
                skills: {
                    select: {
                        subSkills: true
                    }
                }
            } = {
                id: true,
                role: true,
                skill: true,
                email: true,
                avatar: true,
                username: true,
                lastname: true,
                firstname: true,
                createdAt: true,
                skills: {
                    select: {
                        subSkills: true
                    }
                },
            }

            if (q === "date") {
                users = await this.prisma.user.findMany({
                    where: { OR },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: limit,
                    skip: offset,
                    select,
                })
            } else {
                users = await this.prisma.user.findMany({
                    where: { OR },
                    orderBy: [
                        { firstname: 'desc' },
                        { lastname: 'desc' },
                    ],
                    take: limit,
                    skip: offset,
                    select,
                })
            }

            this.response.sendSuccess(res, StatusCodes.OK, { data: users })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async chart(res: Response) {
        try {
            const currentYear = new Date().getFullYear()
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ]

            const userCounts = []

            for (let i = 0; i < monthNames.length; i++) {
                const startDate = new Date(currentYear, i, 1)
                let endMonth = i + 1
                let endYear = currentYear

                if (endMonth === 12) {
                    endMonth = 1
                    endYear = currentYear + 1
                } else {
                    endMonth++
                }

                const endDate = new Date(endYear, endMonth - 1, 1)

                const count = await this.prisma.user.count({
                    where: {
                        AND: [
                            { createdAt: { gte: startDate } },
                            { createdAt: { lt: endDate } }
                        ]
                    }
                })

                userCounts.push({ monthName: monthNames[i], count })
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: {
                    chart: userCounts,
                    total: await this.prisma.user.count()
                }
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error caching chart")
        }
    }

}
