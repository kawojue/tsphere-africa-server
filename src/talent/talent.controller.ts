import { Response } from 'express'
import { Role } from 'src/role.decorator'
import { AuthGuard } from '@nestjs/passport'
import {
  Body, Controller, Put, Req, Res, UseGuards,
  UploadedFile, UploadedFiles, UseInterceptors,
} from '@nestjs/common'
import { TalentService } from './talent.service'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { PersonalInfoDto } from './dto/personalInfo.dto'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags('Talent')
@Controller('talent')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TalentController {
  constructor(private readonly talentService: TalentService) { }

  @Role('talent')
  @Put('personalInfo')
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

  @ApiOperation({
    summary: 'The formdata key for the Portfolio Images should be images'
  })
  @ApiConsumes('multipart/formdata', 'image/jpeg', 'image/png')
  @UseInterceptors(FileInterceptor('images'))
  @Put('/portfolio/images')
  async uploadPortfolioImages(
    @Req() req: IRequest,
    @Res() res: Response,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return await this.talentService.uploadPortfolioImages(res, req.user, files)
  }

  @ApiOperation({
    summary: 'The formdata key for the Portfolio Video should be video'
  })
  @ApiConsumes('multipart/formdata', 'video/mp4')
  @UseInterceptors(FileInterceptor('images'))
  @Put('/portfolio/video')
  async uploadPortfolioVideo(
    @Req() req: IRequest,
    @Res() res: Response,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.talentService.uploadPortfolioVideo(res, req.user, file)
  }


  @ApiOperation({
    summary: 'The formdata key for the Portfolio Audio should be audio'
  })
  @ApiConsumes('multipart/formdata', 'audio/mp3', 'audio/wav', 'audio/aac')
  @UseInterceptors(FileInterceptor('images'))
  @Put('/portfolio/video')
  async uploadPortfolioAudio(
    @Req() req: IRequest,
    @Res() res: Response,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.talentService.uploadPortfolioAudio(res, req.user, file)
  }
}
