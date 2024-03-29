import { Module } from '@nestjs/common'
import { AwsService } from 'lib/aws.service'
import { SendRes } from 'lib/sendRes.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { MiscService } from 'lib/misc.service'
import { PassportModule } from '@nestjs/passport'
import { PrismaService } from 'lib/prisma.service'
import { ProfileSetupService } from './profile-setup.service'
import { ProfileSetupController } from './profile-setup.controller'

@Module({
  imports: [
    JwtModule,
    PassportModule.register({ defaultStrategy: 'jwt' })
  ],
  controllers: [ProfileSetupController],
  providers: [ProfileSetupService, PrismaService, SendRes, AwsService, MiscService],
})
export class ProfileSetupModule { }
