import { Module } from '@nestjs/common'
import { AwsService } from 'lib/aws.service'
import { SendRes } from 'lib/sendRes.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { MiscService } from 'lib/misc.service'
import { PassportModule } from '@nestjs/passport'
import { PrismaService } from 'lib/prisma.service'
import { CreativeService } from './creative.service'
import { CreativeController } from './creative.controller'

@Module({
  imports: [
    JwtModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  providers: [CreativeService, AwsService, PrismaService, SendRes, MiscService],
  controllers: [CreativeController],
})
export class CreativeModule { }
