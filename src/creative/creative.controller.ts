import { Response } from 'express'
import { BioDto } from './dto/bio.dto'
import { Role } from 'src/role.decorator'
import { AuthGuard } from '@nestjs/passport'
import {
  Body, Controller, Put, UseInterceptors, Param,
  Req, Res, UseGuards, UploadedFile, Patch, Delete,
} from '@nestjs/common'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { CreativeService } from './creative.service'
import { FileInterceptor } from '@nestjs/platform-express'
import { CertificationsDTO } from './dto/certification.dto'
import { CreativePersonalInfoDto } from './dto/personal-info.dto'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiBearerAuth()
@ApiTags('Creative')
@Controller('creative')
@UseGuards(AuthGuard('jwt'), RolesGuard)
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
    @Body() personalInfoDto: CreativePersonalInfoDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.creativeService.personalInfo(res, req.user, personalInfoDto, file)
  }

  @ApiOperation({
    summary: 'The formdata key for the Proof of ID should proof_id'
  })
  @ApiConsumes('multipart/form-data', 'image/jpeg', 'image/png')
  @Role('admin')
  @Put('/personal-info/edit/:userId')
  @UseInterceptors(FileInterceptor('proof_id'))
  async editPersonalInfo(
    @Res() res: Response,
    @Param('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() personalInfoDto: CreativePersonalInfoDto,
  ) {
    await this.creativeService.editPersonalInfo(res, userId, personalInfoDto, file)
  }

  @Role('creative')
  @Patch('bio')
  async bio(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() { bio }: BioDto,
  ) {
    await this.creativeService.bio(res, bio, req.user)
  }

  @Role('admin')
  @Patch('/bio/edit/:userId')
  async updateBio(
    @Res() res: Response,
    @Body() { bio }: BioDto,
    @Param('userId') userId: string,
  ) {
    await this.creativeService.updateBio(res, userId, bio)
  }

  @Role('creative')
  @Put('/certification')
  async addCertification(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: CertificationsDTO,
  ) {
    await this.creativeService.addCertification(res, req.user, body)
  }

  @Role('creative')
  @Delete('/certification/:certificationId')
  async removeCertification(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('certificationId') certificationId: string,
  ) {
    await this.creativeService.removeCertification(res, req.user, certificationId)
  }
}
