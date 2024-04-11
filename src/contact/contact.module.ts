import { Module } from '@nestjs/common'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { PassportModule } from '@nestjs/passport'
import { PrismaService } from 'lib/prisma.service'
import { ContactService } from './contact.service'
import { ContactController } from './contact.controller'

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule],
  controllers: [ContactController],
  providers: [ContactService, PrismaService, SendRes, MiscService],
})
export class ContactModule { }
