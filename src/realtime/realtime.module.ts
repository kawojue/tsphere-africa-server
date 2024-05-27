import { Module } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AwsService } from 'lib/aws.service'
import { SendRes } from 'lib/sendRes.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { MiscService } from 'lib/misc.service'
import { PassportModule } from '@nestjs/passport'
import { PrismaService } from 'lib/prisma.service'
import { RealtimeService } from './realtime.service'
import { RealtimeGateway } from './realtime.gateway'

@Module({
  imports: [
    JwtModule,
    PassportModule.register({ defaultStrategy: 'jwt' })
  ],
  providers: [
    RealtimeGateway,
    RealtimeService,
    PrismaService,
    MiscService,
    JwtService,
    AwsService,
    SendRes,
  ],
})
export class RealtimeModule { }
