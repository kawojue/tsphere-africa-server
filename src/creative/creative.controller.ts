import { Response } from 'express'
import { BioDto } from './dto/bio.dto'
import { Role } from 'src/role.decorator'
import {
  Body, Controller, Put, UseInterceptors,
  Req, Res, UseGuards, UploadedFile, Patch,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { CreativeService } from './creative.service'
import { PersonalInfoDto } from './dto/personal-info.dto'
import { FileInterceptor } from '@nestjs/platform-express'
import { CreativeRatesAvailabilityDto } from './dto/rates-availability.dto'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('creative')
@ApiTags('Creative')
export class CreativeController {
  constructor(private readonly creativeService: CreativeService) { }

  @Role('creative')
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
    return await this.creativeService.personalInfo(res, req.user, personalInfoDto, file)
  }

  @Role('creative')
  @Patch('bio')
  async bio(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() { bio }: BioDto,
  ) {
    return await this.creativeService.bio(res, bio, req.user)
  }

  @Role('creative')
  @Put('rates-availability')
  async ratesAndAvailability(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: CreativeRatesAvailabilityDto,
  ) {
    return await this.creativeService.ratesAndAvailability(res, req.user, body)
  }
}
