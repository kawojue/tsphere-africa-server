import { Response } from 'express'
import { JwtService } from '@nestjs/jwt'
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
        const token = Buffer.from(tk.token).toString('base64url')

        return {
            token,
            randomCode,
            token_expiry: tk.token_expiry
        }
    }

    async calculateReadingTime(content: string) {
        const base64Pattern: RegExp = /data:image\/[^]+base64[^'"]*/g
        const cleanedContent: string = content.replace(base64Pattern, '')
        const words: string[] = cleanedContent.split(/\s+/).filter(word => word !== '')
        const wordCount: number = words.length
        const wordPerMinute = 200 as const
        const readingTime: number = Math.ceil(wordCount / wordPerMinute)

        if (readingTime <= 1) {
            return '1 Min Read'
        } else if (readingTime >= 60) {
            return `${Math.round(readingTime / 60)} Hr Read`
        } else {
            return `${readingTime} Mins Read`
        }
    }

    async handleServerError(res: Response, err?: any, msg?: string) {
        console.error(err)
        return this.response.sendError(res, StatusCodes.InternalServerError, msg || 'Something went wrong')
    }
}