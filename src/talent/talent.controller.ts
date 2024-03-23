import { Body, Controller, Put, Req, Res, UseGuards } from '@nestjs/common'
import { Response } from 'express'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { TalentService } from './talent.service'
import { AuthGuard } from '@nestjs/passport'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { Role } from 'src/role.decorator'
import { PersonalInfoDto } from './dto/personalInfo.dto'

@ApiTags('Talent')
@Controller('talent')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TalentController {
  constructor(private readonly talentService: TalentService) { }

  @Role('creative')
  @Put('personalInfo')
  async createPersonalInfo(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() personalInfoDto: PersonalInfoDto
  ) {
    return await this.talentService.personalInfo(res, req.user, personalInfoDto)
  }

}
