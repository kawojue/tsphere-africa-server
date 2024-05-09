import { Response } from 'express'
import StatusCodes from 'enums/StatusCodes'
import { AwsService } from 'lib/aws.service'
import { SendRes } from 'lib/sendRes.service'
import { Injectable, NotFoundException } from '@nestjs/common'

@Injectable()
export class FileService {
    constructor(
        private readonly aws: AwsService,
        private readonly response: SendRes,
    ) { }

    async downloadFile(res: Response, path: string) {
        try {
            const { data, contentLength } = await this.aws.downloadS3(path)

            res.setHeader('Content-Length', contentLength)
            res.setHeader('Content-Disposition', `attachment; filename="${path.split('/').pop()}"`)
            res.setHeader('Content-Type', 'application/octet-stream')

            res.send(data)
        } catch (error) {
            if (error instanceof NotFoundException) {
                return this.response.sendError(res, StatusCodes.NotFound, 'File not found')
            } else {
                return this.response.sendError(res, StatusCodes.InternalServerError, 'Internal server error')
            }
        }
    }
}
