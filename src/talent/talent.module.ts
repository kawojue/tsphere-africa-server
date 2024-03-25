import { Module } from '@nestjs/common'
import { SendRes } from 'lib/sendRes.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { TalentService } from './talent.service'
import { PassportModule } from '@nestjs/passport'
import { PrismaService } from 'lib/prisma.service'
import { WasabiService } from 'lib/wasabi.service'
import { TalentController } from './talent.controller'

@Module({
  imports: [
    JwtModule,
    PassportModule.register({ defaultStrategy: 'jwt' })
  ],
  controllers: [TalentController],
  providers: [TalentService, PrismaService, SendRes, WasabiService],
})
export class TalentModule { }
