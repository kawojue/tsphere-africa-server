import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { SendRes } from 'lib/sendRes.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { MiscService } from 'lib/misc.service'
import { PlunkService } from 'lib/plunk.service'
import { PassportModule } from '@nestjs/passport'
import { AuthController } from './auth.controller'
import { JwtStrategy } from 'src/jwt/jwt.strategy'
import { PrismaService } from 'lib/prisma.service'
import { WasabiService } from 'lib/wasabi.service'
import { EncryptionService } from 'lib/encryption.service'

@Module({
  imports: [
    JwtModule,
    PassportModule.register({ defaultStrategy: 'jwt' })
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SendRes,
    MiscService,
    JwtStrategy,
    PlunkService,
    PrismaService,
    WasabiService,
    EncryptionService,
  ],
})
export class AuthModule { }
