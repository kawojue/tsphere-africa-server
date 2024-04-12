import { Injectable } from '@nestjs/common'
import { AwsService } from 'lib/aws.service'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { PrismaService } from 'lib/prisma.service'

@Injectable()
export class BlogService {
    constructor(
        private readonly aws: AwsService,
        private readonly misc: MiscService,
        private readonly response: SendRes,
        private readonly prisma: PrismaService,
    ) { }
}
