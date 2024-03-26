import { Module } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AppService } from './app.service'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { AuthModule } from './auth/auth.module'
import { FileModule } from './file/file.module'
import { AppController } from './app.controller'
import { PlunkService } from 'lib/plunk.service'
import { WasabiService } from 'lib/wasabi.service'
import { PrismaService } from 'lib/prisma.service'
import { TalentModule } from './talent/talent.module'
import { CreativeModule } from './creative/creative.module'

@Module({
  imports: [
    AuthModule,
    FileModule,
    TalentModule,
    CreativeModule,
  ],
  controllers: [AppController],
  providers: [
    MiscService, PlunkService, WasabiService,
    AppService, JwtService, PrismaService, SendRes,
  ]
})
export class AppModule { }
