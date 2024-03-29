import { Module } from '@nestjs/common'
import { FileService } from './file.service'
import { AwsService } from 'lib/aws.service'
import { SendRes } from 'lib/sendRes.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { PassportModule } from '@nestjs/passport'
import { FileController } from './file.controller'

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule,
  ],
  controllers: [FileController],
  providers: [FileService, SendRes, AwsService],
})
export class FileModule { }
