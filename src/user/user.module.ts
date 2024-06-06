import { Module } from '@nestjs/common'
import { AwsService } from 'lib/aws.service'
import { UserService } from './user.service'
import { SendRes } from 'lib/sendRes.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { MiscService } from 'lib/misc.service'
import { PassportModule } from '@nestjs/passport'
import { UserController } from './user.controller'
import { PrismaService } from 'lib/prisma.service'

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule,
  ],
  controllers: [UserController],
  providers: [UserService, PrismaService, SendRes, MiscService, AwsService],
})
export class UserModule { }
