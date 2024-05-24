import { Response } from 'express'
import { Role } from 'src/role.decorator'
import { AuthGuard } from '@nestjs/passport'
import { Role as Roles } from '@prisma/client'
import { ClientService } from './client.service'
import { FundWalletDTO } from './dto/wallet.dto'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { SortUserDto } from 'src/modmin/dto/user.dto'
import {
  UploadedFiles, UseInterceptors, Param, Get, UploadedFile,
  Body, Controller, UseGuards, Res, Req, Query, Post, Patch,
} from '@nestjs/common'
import { UpdateHireStatusDTO } from 'src/modmin/dto/status.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CreateProjectDTO, ExistingProjectDTO } from './dto/project.dto'
import { CreateBriefDocumentDTO, CreateBriefFillDTO } from './dto/brief.dto'
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express'
import { ClientProfileSetupDTO, ClientProfileSetupQueryDTO } from './dto/profile.dto'

@ApiBearerAuth()
@ApiTags("Client")
@Controller('client')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ClientController {
  constructor(private readonly clientService: ClientService) { }

  @ApiOperation({
    summary: "The formdata keys should be doc - (object), proofOfId - (array)"
  })
  @Role(Roles.client)
  @Post('/profile-setup')
  @UseInterceptors(AnyFilesInterceptor())
  async profileSetup(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: ClientProfileSetupDTO,
    @Query() q: ClientProfileSetupQueryDTO,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    await this.clientService.profileSetup(res, req.user, files || [], q, body)
  }

  @ApiOperation({
    summary: "The formdata keys should be docs, images, videos"
  })
  @Post('/brief-form/document')
  @Role(Roles.client)
  @UseInterceptors(AnyFilesInterceptor())
  async createBriefDocument(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: CreateBriefDocumentDTO,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    await this.clientService.createBriefDocument(res, req.user, files || [], body)
  }

  @Role(Roles.client)
  @Post('/brief-form/fill')
  async createBriefFill(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: CreateBriefFillDTO,
  ) {
    await this.clientService.createBriefFill(res, req.user, body)
  }

  @ApiOperation({
    summary: "The formdata key should be attachments, proof_of_id"
  })
  @Role(Roles.client)
  @Post('/hire/new/:profileId')
  @UseInterceptors(AnyFilesInterceptor())
  async directHire(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: CreateProjectDTO,
    @Param('profileId') profileId: string,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    await this.clientService.directHire(res, profileId, req.user, files || [], body)
  }

  @Post('hire/existing/:profileId/:projectId')
  @Role(Roles.client)
  async directHireWithExistingProject(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: ExistingProjectDTO,
    @Param('profileId') profileId: string,
    @Param('projectId') projectId: string,
  ) {
    await this.clientService.directHireWithExistingProject(res, projectId, profileId, req.user, body)
  }

  @Get('/projects')
  async fetchProjects(
    @Res() res: Response,
    @Req() req: IRequest,
    @Query() query: SortUserDto
  ) {
    await this.clientService.fetchProjects(res, req.user, query)
  }

  @Get('/projects/dropdown')
  @Role(Roles.client)
  async fetchProjectsDropdown(@Res() res: Response, @Req() req: IRequest) {
    await this.clientService.fetchProjectsDropdown(res, req.user)
  }

  @Get('/projects/analytics')
  @Role(Roles.client, Roles.admin)
  async analytics(@Res() res: Response, @Req() req: IRequest) {
    await this.clientService.analytics(res, req.user)
  }

  @Get('/projects/:projectId/get')
  async fetchProject(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('projectId') projectId: string
  ) {
    await this.clientService.fetchProject(res, projectId, req.user)
  }

  @Get('/projects/:projectId/applicants')
  @Role(Roles.client, Roles.admin)
  async fetchProjectApplicants(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('projectId') projectId: string
  ) {
    await this.clientService.fetchProjectApplicants(res, projectId, req.user)
  }

  @Post('/deposit')
  @Role(Roles.client)
  async fundWallet(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: FundWalletDTO
  ) {
    return await this.clientService.fundWallet(res, req.user, body)
  }

  @Post('/contract/upload/:projectId')
  @ApiOperation({
    summary: "The formdata key should be contract"
  })
  @Role(Roles.client)
  @UseInterceptors(FileInterceptor('contract'))
  async uploadContract(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    await this.clientService.uploadContract(res, projectId, req.user, file)
  }

  @Patch('/hires/:id/status')
  @Role(Roles.admin, Roles.client)
  async updateHireStatus(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('id') id: string,
    @Query() q: UpdateHireStatusDTO,
  ) {
    await this.clientService.updateHireStatus(res, id, req.user, q)
  }

  @Get('/job-casting/requests')
  async directJobCastingRequests(
    @Res() res: Response,
    @Req() req: IRequest,
    @Query() q: SortUserDto,
  ) {
    await this.clientService.directJobCastingRequests(res, req.user, q)
  }
}
