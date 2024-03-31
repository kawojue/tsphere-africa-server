import { Module } from '@nestjs/common'
import { AwsService } from 'lib/aws.service'
import { SendRes } from 'lib/sendRes.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { MiscService } from 'lib/misc.service'
import { ModminService } from './modmin.service'
import { PassportModule } from '@nestjs/passport'
import { PrismaService } from 'lib/prisma.service'
import { ModminController } from './modmin.controller'
import { EncryptionService } from 'lib/encryption.service'

@Module({
  imports: [JwtModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [ModminController],
  providers: [ModminService, MiscService, PrismaService, AwsService, EncryptionService, SendRes],
})
export class ModminModule { }
