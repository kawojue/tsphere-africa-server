import { Module } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { FileModule } from './file/file.module'
import { AppController } from './app.controller'
import { WasabiService } from 'lib/wasabi.service'
import { PrismaService } from 'lib/prisma.service'
import { TalentModule } from './talent/talent.module'
import { CreativeModule } from './creative/creative.module'

@Module({
  imports: [
    AuthModule,
    FileModule,
    CreativeModule,
    TalentModule
  ],
  controllers: [AppController],
  providers: [AppService, JwtService, WasabiService, PrismaService],
})
export class AppModule { }
