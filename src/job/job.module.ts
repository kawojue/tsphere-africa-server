import { Module } from '@nestjs/common'
import { JobService } from './job.service'
import { AwsService } from 'lib/aws.service'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { JwtModule } from 'src/jwt/jwt.module'
import { JobController } from './job.controller'
import { PassportModule } from '@nestjs/passport'
import { PrismaService } from 'lib/prisma.service'

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule],
  controllers: [JobController],
  providers: [JobService, MiscService, PrismaService, SendRes, AwsService],
})
export class JobModule { }
