import { Response } from 'express'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'

@Injectable()
export class SendRes {
    sendError(res: Response, statusCode: StatusCodes, message: string): void {
        res.status(statusCode).json({ success: false, message })
    }

    sendSuccess(res: Response, statusCode: StatusCodes, data: any): void {
        res.status(statusCode).json({ success: true, ...data })
    }
}