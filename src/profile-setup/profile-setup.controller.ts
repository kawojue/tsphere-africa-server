import { Response } from 'express'
import { Role } from 'src/role.decorator'
import { AuthGuard } from '@nestjs/passport'
import { SkillsDto } from './dto/skills.dto'
import { Role as UserRole } from '@prisma/client'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import {
  ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags
} from '@nestjs/swagger'
import { ExperiencesDTO } from './dto/experiece.dto'
import {
  Controller, Delete, Param, Post, UseInterceptors, Put,
  UploadedFiles, UseGuards, Req, Res, Body, UploadedFile,
} from '@nestjs/common'
import { ProfileSetupService } from './profile-setup.service'
import { RateAndAvailabilityDto } from './dto/rate-availability.dto'
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express'

@ApiTags("Profile Setup")
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('profile-setup')
export class ProfileSetupController {
  constructor(private readonly profileSetupService: ProfileSetupService) { }

  @ApiOperation({
    summary: 'The formdata key for the Portfolio Images should be images'
  })
  @Role(UserRole.talent, UserRole.creative)
  @ApiConsumes('multipart/form-data', 'image/jpeg', 'image/png')
  @UseInterceptors(AnyFilesInterceptor({
    limits: { files: 3 }
  }))
  @Put('/portfolio/images')
  async uploadPortfolioImages(
    @Req() req: IRequest,
    @Res() res: Response,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    await this.profileSetupService.uploadPortfolioImages(res, req.user, files || [])
  }

  @ApiOperation({
    summary: 'The formdata key for the Portfolio Video should be video'
  })
  @Role(UserRole.talent, UserRole.creative)
  @ApiConsumes('multipart/form-data', 'video/mp4')
  @UseInterceptors(FileInterceptor('video'))
  @Put('/portfolio/video')
  async uploadPortfolioVideo(
    @Req() req: IRequest,
    @Res() res: Response,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.profileSetupService.uploadPortfolioVideo(res, req.user, file)
  }

  @Role(UserRole.talent, UserRole.creative)
  @ApiOperation({
    summary: 'The formdata key for the Portfolio Audio should be audio'
  })
  @ApiConsumes('multipart/form-data', 'audio/mp3', 'audio/wav', 'audio/aac')
  @UseInterceptors(FileInterceptor('audio'))
  @Put('/portfolio/audio')
  async uploadPortfolioAudio(
    @Req() req: IRequest,
    @Res() res: Response,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.profileSetupService.uploadPortfolioAudio(res, req.user, file)
  }

  @Role(UserRole.talent, UserRole.creative)
  @Post('/experience')
  async addExperience(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() experiences: ExperiencesDTO
  ) {
    await this.profileSetupService.addExperience(res, req.user, experiences)
  }

  @Role(UserRole.talent, UserRole.creative, UserRole.admin)
  @Delete('/experience/:experienceId')
  async removeExperience(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('experienceId') experienceId: string
  ) {
    await this.profileSetupService.removeExperience(res, req.user, experienceId)
  }

  @ApiOperation({
    summary: 'The formdata key for the attachments should be attachments'
  })
  @Role(UserRole.talent, UserRole.creative)
  @Put('/skills')
  @UseInterceptors(AnyFilesInterceptor())
  @ApiConsumes(
    'multipart/form-data', 'image/jpeg', 'video/mp4',
    'audio/mp3', 'audio/wav', 'audio/aac', 'image/png',
  )
  async addSkills(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() skills: SkillsDto,
    @UploadedFiles() attachments: Array<Express.Multer.File>
  ) {
    await this.profileSetupService.addSkills(res, req.user, skills, attachments || [])
  }

  @Role(UserRole.admin)
  @Delete('/remove/:userId')
  async deleteSkills(
    @Res() res: Response,
    @Param('userId') userId: string
  ) {
    await this.profileSetupService.deleteSkills(res, userId)
  }

  @Role(UserRole.talent, UserRole.creative)
  @Put('/rate-and-availability')
  async rateAndAvailability(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: RateAndAvailabilityDto
  ) {
    await this.profileSetupService.rateAndAvailability(res, req.user, body)
  }

  @Role(UserRole.admin)
  @Put('/rate-and-availability/:userId')
  async editRateAndAvailability(
    @Res() res: Response,
    @Param('userId') userId: string,
    @Body() body: RateAndAvailabilityDto
  ) {
    await this.editRateAndAvailability(res, userId, body)
  }
}
