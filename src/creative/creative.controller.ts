import { Role } from 'src/role.decorator'
import { Request, Response } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { EducationDto } from './dto/education.dto'
import { PortfolioDto } from './dto/portfolio.dto'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { CreativeService } from './creative.service'
import { ExperienceDto } from './dto/experience.dto'
import { PersonalInfoDto } from './dto/personalInfo.dto'
import {
  Body, Controller, Put, Delete, UseInterceptors, UploadedFiles,
  Param, Post, Req, Res, UseGuards, UploadedFile, Patch,
} from '@nestjs/common'
import { RatesAvailabilityDto } from './dto/rates-availability.dto'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { BioDto } from './dto/bio.dto'

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('creative')
@ApiTags('Creative')
export class CreativeController {
  constructor(private readonly creativeService: CreativeService) { }

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
    return await this.creativeService.personalInfo(res, req.user, personalInfoDto, file)
  }

  @Role('talent')
  @Patch('bio')
  async bio(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() { bio }: BioDto,
  ) {
    return await this.creativeService.bio(res, bio, req.user)
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
    return await this.creativeService.uploadPortfolioImages(res, req.user, files)
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
    return await this.creativeService.uploadPortfolioVideo(res, req.user, file)
  }

  @ApiOperation({
    summary: 'The formdata key for the Portfolio Audio should be audio'
  })
  @ApiConsumes('multipart/formdata', 'audio/mp3', 'audio/wav', 'audio/aac')
  @UseInterceptors(FileInterceptor('images'))
  @Put('/portfolio/audio')
  async uploadPortfolioAudio(
    @Req() req: IRequest,
    @Res() res: Response,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.creativeService.uploadPortfolioAudio(res, req.user, file)
  }
}
