import { Module } from '@nestjs/common'
import { FileService } from './file.service'
import { SendRes } from 'lib/sendRes.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { PassportModule } from '@nestjs/passport'
import { FileController } from './file.controller'
import { WasabiService } from 'lib/wasabi.service'

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule,
  ],
  controllers: [FileController],
  providers: [FileService, SendRes, WasabiService],
})
export class FileModule { }
