import { Response } from 'express'
import { Role } from 'src/role.decorator'
import {
  Body, Controller, Put, Req, Res,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { TalentService } from './talent.service'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { PersonalInfoDto } from './dto/personalInfo.dto'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger'

@ApiTags('Talent')
@Controller('talent')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TalentController {
  constructor(private readonly talentService: TalentService) { }

  @Role('talent')
  @Put('personalInfo')
  @ApiConsumes('multipart/formdata', 'image/jpeg', 'image/png')
  @UseInterceptors(FileInterceptor('proof_id'))
  async createPersonalInfo(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() personalInfoDto: PersonalInfoDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.talentService.personalInfo(res, req.user, personalInfoDto, file)
  }

}
