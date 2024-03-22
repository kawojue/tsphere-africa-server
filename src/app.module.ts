import { Module } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { FileModule } from './file/file.module'
import { AppController } from './app.controller'
import { CreativeModule } from './creative/creative.module'

@Module({
  imports: [
    AuthModule,
    FileModule,
    CreativeModule
  ],
  controllers: [AppController],
  providers: [AppService, JwtService],
})
export class AppModule { }
