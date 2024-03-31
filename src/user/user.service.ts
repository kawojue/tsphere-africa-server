import { Response } from 'express'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { PrismaService } from 'lib/prisma.service'
import { FetchProfilesDto } from './dto/infinite-scroll.dto'

@Injectable()
export class UserService {
    constructor(
        private readonly response: SendRes,
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
    ) { }

    async fetchProfiles(
        res: Response,
        {
            profile, search = '',
            limit = 100, page = 1,
        }: FetchProfilesDto
    ) {
        try {
            page = Number(page)
            limit = Number(limit)
            const offset = (page - 1) * limit

            const users = await this.prisma.user.findMany({
                where: {
                    OR: [
                        { email: { contains: search, mode: 'insensitive' } },
                        { lastname: { contains: search, mode: 'insensitive' } },
                        { firstname: { contains: search, mode: 'insensitive' } },
                    ],
                    role: profile,
                },
                take: limit,
                skip: offset,
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: users })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }
}