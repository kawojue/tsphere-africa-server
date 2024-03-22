import { Module } from '@nestjs/common'
import { TalentService } from './talent.service'
import { TalentController } from './talent.controller'
import { JwtModule } from 'src/jwt/jwt.module'
import { PassportModule } from '@nestjs/passport'

@Module({
  imports: [
    JwtModule,
    PassportModule.register({ defaultStrategy: 'jwt' })
  ],
  controllers: [TalentController],
  providers: [TalentService],
})
export class TalentModule { }
