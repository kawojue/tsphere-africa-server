import { Response } from 'express'
import {
  UploadedFiles, Post, UseInterceptors,
  Body, Controller, UseGuards, Res, Req,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ClientService } from './client.service'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AnyFilesInterceptor } from '@nestjs/platform-express'
import { CreateProjectDocumentDTO, CreateProjectFillDTO } from './dto/project.dto'

@ApiTags("Client")
@ApiBearerAuth()
@Controller('client')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ClientController {
  constructor(private readonly clientService: ClientService) { }

  @Post('/brief-form/document')
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

  @Post('/brief-form/fill')
  async createProjectFill(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: CreateProjectFillDTO,
  ) {
    await this.clientService.createProjectFill(res, req.user, body)
  }
}
