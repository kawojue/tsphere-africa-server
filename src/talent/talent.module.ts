import { Module } from '@nestjs/common'
import { AwsService } from 'lib/aws.service'
import { SendRes } from 'lib/sendRes.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { MiscService } from 'lib/misc.service'
import { TalentService } from './talent.service'
import { PassportModule } from '@nestjs/passport'
import { PrismaService } from 'lib/prisma.service'
import { TalentController } from './talent.controller'

@Module({
  imports: [
    JwtModule,
    PassportModule.register({ defaultStrategy: 'jwt' })
  ],
  controllers: [TalentController],
  providers: [TalentService, PrismaService, SendRes, AwsService, MiscService],
})
export class TalentModule { }
