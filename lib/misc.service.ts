import { Response } from 'express'
import { JwtService } from '@nestjs/jwt'
import { Weekday } from '@prisma/client'
import { USER_REGEX } from 'utils/regExp'
import { genToken } from 'helpers/genToken'
import { Injectable } from '@nestjs/common'
import { SendRes } from './sendRes.service'
import StatusCodes from 'enums/StatusCodes'
import { genRandomCode } from 'helpers/genRandStr'

@Injectable()
export class MiscService {
    constructor(
        private readonly response: SendRes,
        private readonly jwtService: JwtService,
    ) { }

    async generateAccessToken({ sub, role, userStatus }: JwtPayload) {
        return await this.jwtService.signAsync({ sub, role, userStatus })
    }

    isValidUsername(username: string) {
        return USER_REGEX.test(username)
    }

    genenerateToken(id: string) {
        const randomCode = genRandomCode()
        const tk = genToken(id, randomCode)
        const token = Buffer.from(tk.token).toString('base64')

        return {
            token,
            randomCode,
            token_expiry: tk.token_expiry
        }
    }

    isValidWorkday(from: Weekday, to: Weekday) {
        const weekdays = [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday'
        ]

        return weekdays.indexOf(from) < weekdays.indexOf(to)
    }

    async handleServerError(res: Response, err?: any, msg?: string) {
        console.error(err)
        return this.response.sendError(res, StatusCodes.InternalServerError, msg || 'Something went wrong')
    }
}