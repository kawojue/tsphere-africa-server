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

    getFileExtension(file: Express.Multer.File | string) {
        let mimetype: string
        if (typeof file === "object") {
            mimetype = file.mimetype
        }

        let extension: string

        switch (mimetype) {
            case 'video/mp4':
                extension = 'mp4'
                break
            case 'video/webm':
                extension = 'webm'
                break
            case 'video/avi':
                extension = 'avi'
                break
            case 'image/png':
                extension = 'png'
                break
            case 'image/jpeg':
                extension = 'jpg'
                break
            case 'audio/mp3':
                extension = 'mp3'
                break
            case 'audio/wav':
                extension = 'wav'
                break
            case 'audio/aac':
                extension = 'aac'
                break
            case 'audio/ogg':
                extension = 'ogg'
                break
            case 'application/pdf':
                extension = 'pdf'
                break
            case 'application/msword':
                extension = 'doc'
                break
            default:
                break
        }

        return extension
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

    async calculateWithdrawalFee(amount: number) {
        let processingFee = amount * 0.01

        if (processingFee > 10) {
            processingFee = 10
        }

        let fee = { processingFee } as {
            totalFee: number
            paystackFee: number
            processingFee: number
        }

        if (amount > 5_000) {
            fee.paystackFee = 10
        } else {
            fee.paystackFee = amount <= 50_000 ? 25 : 50
        }

        return { ...fee, totalFee: fee.paystackFee + fee.processingFee }
    }

    handlePaystackAndServerError(res: Response, err: any) {
        if (err.response?.message) {
            console.error(err)
            this.response.sendError(res, err.status, err.response.message)
        } else {
            this.handleServerError(res, err)
        }
    }

    async handleServerError(res: Response, err?: any, msg?: string) {
        console.error(err)
        return this.response.sendError(res, StatusCodes.InternalServerError, msg || 'Something went wrong')
    }
}