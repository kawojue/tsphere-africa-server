import { Response } from 'express'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { WasabiService } from 'lib/wasabi.service'
import { Injectable, NotFoundException } from '@nestjs/common'

@Injectable()
export class FileService {
    constructor(
        private readonly response: SendRes,
        private readonly wasabiService: WasabiService
    ) { }

    async downloadFile(res: Response, key: string) {
        try {
            const fileBuffer = await this.wasabiService.downloadS3(key)
            res.setHeader('Content-Disposition', `attachment; filename=${key}`)
            res.setHeader('Content-Type', 'application/octet-stream')
            res.send(fileBuffer)
        } catch (err) {
            if (err instanceof NotFoundException) {
                return this.response.sendError(res, StatusCodes.NotFound, 'File not found')
            } else {
                return this.response.sendError(res, StatusCodes.InternalServerError, 'Internal server error')
            }
        }
    }
}
