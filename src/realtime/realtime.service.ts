import { Server } from 'socket.io'
import { Message } from '@prisma/client'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { AwsService } from 'lib/aws.service'
import { genFileName } from 'helpers/genFilename'
import { PrismaService } from 'lib/prisma.service'

@Injectable()
export class RealtimeService {
    private server: Server

    setServer(server: Server) {
        this.server = server
    }

    getServer(): Server {
        return this.server
    }

    constructor(
        private readonly aws: AwsService,
        private readonly prisma: PrismaService,
    ) { }

    async createInbox(senderId: string, receiverId: string, senderRole: string) {
        const newInbox = await this.prisma.inbox.create({
            data: senderRole === "admin" ? {
                user: { connect: { id: receiverId } },
                admin: { connect: { id: senderId } },
            } : {
                admin: { connect: { id: receiverId } },
                user: { connect: { id: senderId } },
            }
        })

        return newInbox.id
    }

    validateFile(file: string) {
        const maxSize = 10 << 20
        const allowedTypes = ['video/mp4', 'image/png', 'image/jpeg']
        const fileSize = Buffer.byteLength(file, 'base64')

        if (fileSize > maxSize) {
            return { status: StatusCodes.BadRequest, message: 'File size exceeds limit' }
        }

        const fileType = this.getFileType(file)
        if (!allowedTypes.includes(fileType)) {
            return { status: StatusCodes.UnsupportedContent, message: 'Unsupported file type' }
        }

        return { file }
    }

    getFileType(file: string): string {
        const match = file.match(/^data:(.*?);base64,/)
        return match ? match[1] : ''
    }

    async saveFile(file: string, userId: string) {
        const base64Data = file.replace(/^data:.*;base64,/, '')
        const fileName = `${genFileName()}.mp4`
        const filePath = `${userId}/${fileName}`
        const fileType = this.getFileType(file)

        await this.aws.uploadS3Base64(Buffer.from(base64Data, 'base64'), filePath, fileType)

        return {
            path: filePath,
            type: fileType,
            url: this.aws.getS3(filePath),
        }
    }

    async markMessagesAsRead(messages: Message[]) {
        const updatePromises = messages.map(async (message) => {
            if (!message.isRead) {
                await this.prisma.message.update({
                    where: { id: message.id },
                    data: { isRead: true },
                })
            }
        })

        await Promise.all(updatePromises)
    }
}
