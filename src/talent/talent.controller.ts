import { Response } from 'express'
import { Role } from 'src/role.decorator'
import { AuthGuard } from '@nestjs/passport'
import {
  Param, Put, UseGuards, Body, Req, Res,
  UploadedFile, Controller, UseInterceptors,
} from '@nestjs/common'
import { TalentService } from './talent.service'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { TalentBioStatsDto } from './dto/bio-stats.dto'
import { FileInterceptor } from '@nestjs/platform-express'
import { TalentPersonalInfoDto } from './dto/personal-info.dto'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags('Talent')
@Controller('talent')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TalentController {
  constructor(private readonly talentService: TalentService) { }

  @Role('talent')
  @Put('personal-info')
  @ApiOperation({
    summary: 'The formdata key for the Proof of ID should proof_id'
  })
  @ApiConsumes('multipart/formdata', 'image/jpeg', 'image/png')
  @UseInterceptors(FileInterceptor('proof_id'))
  async createPersonalInfo(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() personalInfoDto: TalentPersonalInfoDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.talentService.personalInfo(res, req.user, personalInfoDto, file)
  }

  @Role('talent')
  @Put('bio-stats')
  async bioStats(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() bio: TalentBioStatsDto,
  ) {
    await this.talentService.bioStats(res, bio, req.user)
  }

  @Role('admin')
  @Put('/edit/bio-stats/:userId')
  async editBioStats(
    @Res() res: Response,
    @Body() bio: TalentBioStatsDto,
    @Param('userId') userId: string,
  ) {
    await this.talentService.editBioStats(res, userId, bio)
  }
}
