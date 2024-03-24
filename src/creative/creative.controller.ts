import {
  Body, Controller, Put, Delete,
  UseInterceptors, UploadedFiles,
  Param, Post, Req, Res, UseGuards,
} from '@nestjs/common'
import { Role } from 'src/role.decorator'
import { SkillDto } from './dto/skill.dto'
import { Request, Response } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { EducationDto } from './dto/education.dto'
import { PortfolioDto } from './dto/portfolio.dto'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { CreativeService } from './creative.service'
import { ExperienceDto } from './dto/experience.dto'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { PersonalInfoDto } from './dto/personalInfo.dto'
import { FilesInterceptor } from '@nestjs/platform-express'
import { RatesAvailabilityDto } from './dto/rates-availability.dto';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('creative')
@ApiTags('Creative')
export class CreativeController {
  constructor(private readonly creativeService: CreativeService) { }

  @Role('creative')
  @Put('personalInfo')
  async createPersonalInfo(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() personalInfoDto: PersonalInfoDto
  ) {
    return await this.creativeService.personalInfo(res, req.user, personalInfoDto)
  }

  @Role('creative')
  @Put('skills')
  async updateSkills(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() skills: SkillDto
  ) {
    return await this.creativeService.updateSkills(res, req.user, skills)
  }

  @Role('creative')
  @Post('experience')
  async addExperience(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() expericnce: ExperienceDto
  ) {
    return await this.creativeService.addExperience(res, req.user, expericnce)
  }

  @Role('creative')
  @Delete('experience/:experienceId')
  async removeExperience(@Res() res: Response, @Param('experienceId') experienceId: string
  ) {
    return await this.creativeService.removeExperience(res, experienceId)
  }

  @Role('creative')
  @Put('education')
  async addEducation(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() education: EducationDto
  ) {
    return await this.creativeService.addEducation(res, req.user, education)
  }

  @Role('creative')
  @Delete('education/:educationId')
  async removeEducation(@Res() res: Response, @Param('educationId') educationId: string
  ) {
    return await this.creativeService.removeEducation(res, educationId)
  }

  @Role('creative')
  @Put('rate')
  async ratesAndAvailability(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() rate: RatesAvailabilityDto
  ) {
    return await this.creativeService.ratesAndAvailability(res, req.user, rate)
  }

  @Role('creative')
  @Put('portfolio')
  @UseInterceptors(FilesInterceptor('files'))
  async portfolio(
    @Req() req: Request,
    @Res() res: Response,
    @UploadedFiles() file: Express.Multer.File[],
    @Body() body: PortfolioDto,
  ) {
    return await this.creativeService.portfolio(req, res, file, body)
  }
}
