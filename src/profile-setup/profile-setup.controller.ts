import { Response } from 'express'
import { Role } from 'src/role.decorator'
import { AuthGuard } from '@nestjs/passport'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { ExperienceDto } from './dto/experiece.dto'
import { BankDetailsDto } from './dto/bank-details.dto'
import {
  Controller, Delete, Param, Post, UseInterceptors, Put,
  UploadedFiles, UseGuards, Req, Res, Body, UploadedFile,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ProfileSetupService } from './profile-setup.service'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { SkillsDto } from './dto/skills.dto'

@ApiTags("Profile Setup")
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('profile-setup')
export class ProfileSetupController {
  constructor(private readonly profileSetupService: ProfileSetupService) { }

  @ApiOperation({
    summary: 'The formdata key for the Portfolio Images should be images'
  })
  @Role('talent', 'creative')
  @ApiConsumes('multipart/formdata', 'image/jpeg', 'image/png')
  @UseInterceptors(FileInterceptor('images'))
  @Put('/portfolio/images')
  async uploadPortfolioImages(
    @Req() req: IRequest,
    @Res() res: Response,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return await this.profileSetupService.uploadPortfolioImages(res, req.user, files)
  }

  @ApiOperation({
    summary: 'The formdata key for the Portfolio Video should be video'
  })
  @Role('talent', 'creative')
  @ApiConsumes('multipart/formdata', 'video/mp4')
  @UseInterceptors(FileInterceptor('images'))
  @Put('/portfolio/video')
  async uploadPortfolioVideo(
    @Req() req: IRequest,
    @Res() res: Response,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.profileSetupService.uploadPortfolioVideo(res, req.user, file)
  }

  @Role('talent', 'creative')
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
    return await this.profileSetupService.uploadPortfolioAudio(res, req.user, file)
  }

  @Role('talent', 'creative')
  @Post('/experience')
  async addExperience(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() experience: ExperienceDto
  ) {
    return await this.profileSetupService.addExperience(res, req.user, experience)
  }

  @Role('talent', 'creative')
  @Delete('/experience/:experienceId')
  async removeExperience(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('experienceId') experienceId: string
  ) {
    return await this.profileSetupService.removeExperience(res, req.user, experienceId)
  }

  @Role('talent', 'creative')
  @Put('/bank-details')
  async manageBankDetails(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() bankDetails: BankDetailsDto
  ) {
    return await this.profileSetupService.manageBankDetails(res, req.user, bankDetails)
  }

  @Role('talent', 'creative')
  @Put('/skills')
  @UseInterceptors(FileInterceptor('attachments'))
  @ApiConsumes(
    'multipart/formdata', 'image/jpeg', 'video/mp4',
    'audio/mp3', 'audio/wav', 'audio/aac', 'png/image', 'image/png',
  )
  async addSkills(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() skills: SkillsDto,
    @UploadedFiles() attachments: Express.Multer.File[]
  ) {
    return await this.profileSetupService.addSkills(res, req.user, skills, attachments)
  }
}
