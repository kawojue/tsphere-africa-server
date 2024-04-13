import { JwtService } from '@nestjs/jwt'
import { AppService } from './app.service'
import { AwsService } from 'lib/aws.service'
import { JobModule } from './job/job.module'
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
import { ContactModule } from './contact/contact.module'
import { ArticleModule } from './article/article.module'
import { EncryptionService } from 'lib/encryption.service'
import { CreativeModule } from './creative/creative.module'
import { CustomAuthMiddlware } from './middlewares/auth.middleware'
import { ProfileSetupModule } from './profile-setup/profile-setup.module'
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common'
import { ArticleMiddlware } from './middlewares/article.middleware'

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
    ContactModule,
    ArticleModule,
  ],
  controllers: [AppController],
  providers: [
    AppService, MiscService, PlunkService, AwsService, SendRes,
    JwtService, PrismaService, BrevoService, EncryptionService,
  ],
  exports: [PrismaService]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CustomAuthMiddlware)
      .forRoutes(
        { path: 'job/job-list', method: RequestMethod.GET }
      )

    consumer
      .apply(ArticleMiddlware)
      .forRoutes(
        { path: 'article/fetch', method: RequestMethod.GET },
        { path: 'article/fetch/:articleId', method: RequestMethod.GET }
      )
  }
}
