import { Response } from 'express'
import { Role } from 'src/role.decorator'
import {
  Param, Put, UseGuards, UseInterceptors,
  UploadedFile, Controller, Body, Req, Res,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { TalentService } from './talent.service'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { TalentBioStatsDto } from './dto/bio-stats.dto'
import { FileInterceptor } from '@nestjs/platform-express'
import { TalentPersonalInfoDto } from './dto/personal-info.dto'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiBearerAuth()
@ApiTags('Talent')
@Controller('talent')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TalentController {
  constructor(private readonly talentService: TalentService) { }

  @Role('talent')
  @Put('personal-info')
  @ApiOperation({
    summary: 'The formdata key for the Proof of ID should proof_id'
  })
  @ApiConsumes('multipart/form-data', 'image/jpeg', 'image/png')
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

  @ApiOperation({
    summary: 'The formdata key for the Proof of ID should proof_id'
  })
  @ApiConsumes('multipart/form-data', 'image/jpeg', 'image/png')
  @Role('admin')
  @Put('/talent/edit/:userId')
  @UseInterceptors(FileInterceptor('proof_id'))
  async editPersonalInfo(
    @Res() res: Response,
    @Param('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() personalInfoDto: TalentPersonalInfoDto,
  ) {
    await this.talentService.editPersonalInfo(res, userId, personalInfoDto, file)
  }

  @Role('admin')
  @Put('/bio-stats/edit/:userId')
  async editBioStats(
    @Res() res: Response,
    @Body() bio: TalentBioStatsDto,
    @Param('userId') userId: string,
  ) {
    await this.talentService.editBioStats(res, userId, bio)
  }
}
