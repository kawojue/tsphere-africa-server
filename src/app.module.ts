import { Module } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AppService } from './app.service'
import { AwsService } from 'lib/aws.service'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { AuthModule } from './auth/auth.module'
import { FileModule } from './file/file.module'
import { UserModule } from './user/user.module'
import { AppController } from './app.controller'
import { PlunkService } from 'lib/plunk.service'
import { BrevoService } from 'lib/brevo.service'
import { PrismaService } from 'lib/prisma.service'
import { TalentModule } from './talent/talent.module'
import { ModminModule } from './modmin/modmin.module'
import { EncryptionService } from 'lib/encryption.service'
import { CreativeModule } from './creative/creative.module'
import { ProfileSetupModule } from './profile-setup/profile-setup.module'
import { JobModule } from './job/job.module';

@Module({
  imports: [
    AuthModule,
    FileModule,
    UserModule,
    TalentModule,
    ModminModule,
    CreativeModule,
    ProfileSetupModule,
    JobModule,
  ],
  controllers: [AppController],
  providers: [
    AppService, MiscService, PlunkService, AwsService, SendRes,
    JwtService, PrismaService, BrevoService, EncryptionService,
  ],
  exports: [PrismaService]
})
export class AppModule { }
