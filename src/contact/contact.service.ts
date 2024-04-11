import { Response } from 'express'
import StatusCodes from 'enums/StatusCodes'
import { Injectable } from '@nestjs/common'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { BrevoService } from 'lib/brevo.service'
import { PrismaService } from 'lib/prisma.service'
import { ContactDto, ReplyContactDto } from './dto/contact.dto'
import { InfiniteScrollDto } from 'src/user/dto/infinite-scroll.dto'

@Injectable()
export class ContactService {
    constructor(
        private readonly misc: MiscService,
        private readonly response: SendRes,
        private readonly brevo: BrevoService,
        private readonly prisma: PrismaService,
    ) { }

    async contactUs(
        res: Response,
        body: ContactDto
    ) {
        await this.prisma.contact.create({ data: body })
        this.response.sendSuccess(res, StatusCodes.OK, { message: "Message sent!" })
    }

    async fetchContacts(
        res: Response,
        { search = '', page = 1, limit = 50 }: InfiniteScrollDto
    ) {
        page = Number(page)
        limit = Number(limit)
        const offset = (page - 1) * limit

        const contacts = await this.prisma.contact.findMany({
            where: {
                OR: [
                    { email: { contains: search, mode: 'insensitive' } },
                    { fullname: { contains: search, mode: 'insensitive' } },
                ]
            },
            orderBy: [
                { replied: 'asc' },
                { repliedAt: 'asc' },
                { sentAt: 'desc' }
            ],
            select: {
                id: true,
                email: true,
                replied: true,
                fullname: true,
                sentAt: true,
                repliedAt: true
            },
            take: limit,
            skip: offset,
        })

        this.response.sendSuccess(res, StatusCodes.OK, { data: contacts })
    }

    async getContact(res: Response, contactId: string) {
        const contact = await this.prisma.contact.findUnique({
            where: { id: contactId }
        })

        if (!contact) {
            return this.response.sendError(res, StatusCodes.NotFound, 'Contact not found')
        }

        this.response.sendSuccess(res, StatusCodes.OK, { data: contact })
    }

    async deleteContact(res: Response, contactId: string) {
        const contact = await this.prisma.contact.findUnique({
            where: { id: contactId }
        })

        if (!contact) {
            return this.response.sendError(res, StatusCodes.NotFound, 'Contact not found')
        }

        await this.prisma.contact.delete({
            where: { id: contactId }
        })

        this.response.sendSuccess(res, StatusCodes.OK, { message: "Contact deleted" })
    }

    async replyContact(
        res: Response,
        contactId: string,
        { subject, messageBody }: ReplyContactDto
    ) {
        try {
            const contact = await this.prisma.contact.findUnique({
                where: { id: contactId }
            })

            if (!contact) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Contact not found')
            }

            await this.brevo.sendTransactionalEmail({
                subject,
                to: contact.email,
                body: messageBody
            })

            await this.prisma.contact.update({
                where: { id: contactId },
                data: { replied: true, repliedAt: new Date() }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { message: "Message sent!" })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error replying contact")
        }
    }
}
