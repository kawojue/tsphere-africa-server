import {
  Body, Controller, Put, Delete,
  UseInterceptors, UploadedFiles,
  Param, Post, Req, Res, UseGuards,
  UploadedFile,
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
import { PersonalInfoDto } from './dto/personalInfo.dto'
import { RatesAvailabilityDto } from './dto/rates-availability.dto'
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'

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
}
