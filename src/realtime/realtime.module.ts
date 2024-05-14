import { Module } from '@nestjs/common'
import { SendRes } from 'lib/sendRes.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { PassportModule } from '@nestjs/passport'
import { PrismaService } from 'lib/prisma.service'
import { RealtimeService } from './realtime.service'
import { RealtimeGateway } from './realtime.gateway'
import { JwtService } from '@nestjs/jwt'

@Module({
  imports: [
    JwtModule,
    PassportModule.register({ defaultStrategy: 'jwt' })
  ],
  providers: [RealtimeGateway, RealtimeService, PrismaService, SendRes, JwtService],
})
export class RealtimeModule { }
