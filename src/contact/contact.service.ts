import { Injectable } from '@nestjs/common'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { PrismaService } from 'lib/prisma.service'

@Injectable()
export class ContactService {
    constructor(
        private readonly misc: MiscService,
        private readonly response: SendRes,
        private readonly prisma: PrismaService,
    ) { }
}
