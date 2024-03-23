import { Response } from 'express'
import { Injectable } from '@nestjs/common'
import { SendRes } from 'lib/sendRes.service'
import { PrismaService } from 'lib/prisma.service'
import { PersonalInfo } from './dto/personalInfo.dto'

@Injectable()
export class TalentService {
    constructor(
        private readonly response: SendRes,
        private readonly prisma: PrismaService,
    ) { }

    async personalInfo(
        res: Response,
        { sub }: ExpressUser,
        {
            gender, idNumber, instagramHandle,
            idType, xHandle, yearsOfExperience,
            languages, nationality, phone, religion,
        }: PersonalInfo,
    ) {
        try {

        } catch (err) {

        }
    }
}
