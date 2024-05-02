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
import { WalletModule } from './wallet/wallet.module'
import { ClientModule } from './client/client.module'
import { ContactModule } from './contact/contact.module'
import { ArticleModule } from './article/article.module'
import { PaymentModule } from './payment/payment.module'
import { EncryptionService } from 'lib/encryption.service'
import { CreativeModule } from './creative/creative.module'
import { CustomAuthMiddlware } from './middlewares/auth.middleware'
import { ArticleMiddlware } from './middlewares/article.middleware'
import { ProfileSetupModule } from './profile-setup/profile-setup.module'
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common'

@Module({
  imports: [
    AuthModule,
    JobModule,
    FileModule,
    UserModule,
    TalentModule,
    ModminModule,
    WalletModule,
    ArticleModule,
    ContactModule,
    PaymentModule,
    CreativeModule,
    ProfileSetupModule,
    ClientModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SendRes,
    JwtService,
    AwsService,
    MiscService,
    PlunkService,
    BrevoService,
    PrismaService,
    EncryptionService,
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CustomAuthMiddlware)
      .forRoutes(
        { path: 'job/job-list', method: RequestMethod.GET },
        { path: 'article/fetch', method: RequestMethod.GET },
      )

    consumer
      .apply(ArticleMiddlware)
      .forRoutes(
        { path: 'comment/:articleId', method: RequestMethod.POST },
        { path: 'article/fetch/:articleId', method: RequestMethod.GET },
      )
  }
}
