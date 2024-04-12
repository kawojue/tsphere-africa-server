import { Module } from '@nestjs/common'
import { AwsService } from 'lib/aws.service'
import { BlogService } from './blog.service'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { PassportModule } from '@nestjs/passport'
import { BlogController } from './blog.controller'
import { PrismaService } from 'lib/prisma.service'

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule],
  controllers: [BlogController],
  providers: [BlogService, SendRes, MiscService, PrismaService, AwsService],
})
export class BlogModule { }
