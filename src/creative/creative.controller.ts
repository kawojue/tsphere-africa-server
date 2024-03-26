import { Response } from 'express'
import { Role } from 'src/role.decorator'
import {
  Body, Controller, Put, UseInterceptors,
  Req, Res, UseGuards, UploadedFile, Patch,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { EducationDto } from './dto/education.dto'
import { PortfolioDto } from './dto/portfolio.dto'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { CreativeService } from './creative.service'
import { ExperienceDto } from './dto/experience.dto'
import { PersonalInfoDto } from './dto/personalInfo.dto'
import { FileInterceptor } from '@nestjs/platform-express'
import { RatesAvailabilityDto } from './dto/rates-availability.dto'
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger'
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
}
