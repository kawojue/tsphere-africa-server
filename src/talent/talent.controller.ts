import { Response } from 'express'
import {
  UploadedFile, UseInterceptors, Req,
  Controller, Put, UseGuards, Body, Res,
} from '@nestjs/common'
import { Role } from 'src/role.decorator'
import { AuthGuard } from '@nestjs/passport'
import { TalentService } from './talent.service'
import { BioStatsDto } from './dto/bio-stats.dto'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { PersonalInfoDto } from './dto/personalInfo.dto'
import { FileInterceptor } from '@nestjs/platform-express'
import { TalentRatesAvailabilityDto } from './dto/rates-availability.dto'
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
    @Body() personalInfoDto: PersonalInfoDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.talentService.personalInfo(res, req.user, personalInfoDto, file)
  }

  @Role('talent')
  @Put('bio-stats')
  async bioStats(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() bio: BioStatsDto,
  ) {
    return await this.talentService.bioStats(res, bio, req.user)
  }

  @Role('talent')
  @Put('rates-availability')
  async ratesAndAvailability(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: TalentRatesAvailabilityDto,
  ) {
    return await this.talentService.ratesAndAvailability(res, req.user, body)
  }
}
