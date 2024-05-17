import { Response } from 'express'
import { Role } from 'src/role.decorator'
import { AuthGuard } from '@nestjs/passport'
import { Role as Roles } from '@prisma/client'
import { ClientService } from './client.service'
import { FundWalletDTO } from './dto/wallet.dto'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { SortUserDto } from 'src/modmin/dto/user.dto'
import {
  UploadedFiles, Post, UseInterceptors, Param, Get,
  Body, Controller, UseGuards, Res, Req, Query, Patch,
  UploadedFile,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  CreateProjectDocumentDTO, CreateProjectFillDTO, ToggleProjectStatusDTO
} from './dto/project.dto'
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express'

@ApiTags("Client")
@ApiBearerAuth()
@Controller('client')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ClientController {
  constructor(private readonly clientService: ClientService) { }

  @Post('/brief-form/document')
  @Role(Roles.client)
  @UseInterceptors(AnyFilesInterceptor())
  async createProjectDocument(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: CreateProjectDocumentDTO,
    @UploadedFiles() files: {
      docs?: Array<Express.Multer.File>,
      videos?: Array<Express.Multer.File>,
      images?: Array<Express.Multer.File>,
    }
  ) {
    await this.clientService.createProjectDocument(res, req.user, files, body)
  }

  @Role(Roles.client)
  @Post('/brief-form/fill')
  async createProjectFill(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: CreateProjectFillDTO,
  ) {
    await this.clientService.createProjectFill(res, req.user, body)
  }

  @Get('/projects')
  @Role(Roles.client, Roles.admin)
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

  @Get('/projects/:projectId')
  @Role(Roles.client, Roles.admin)
  async fetchProject(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('projectId') projectId: string
  ) {
    await this.clientService.fetchProject(res, projectId, req.user)
  }

  @ApiOperation({
    summary: "Change project status"
  })
  @Patch('/projects/:projectId')
  async toggleStatus(
    @Res() res: Response,
    @Query() q: ToggleProjectStatusDTO,
    @Param('projectId') projectId: string
  ) {
    await this.clientService.toggleStatus(res, projectId, q)
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

  @Post('/contract/upload')
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
}
