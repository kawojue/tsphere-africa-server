import { Response } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { FileService } from './file.service'
import { DownloadFileDTO } from './dto/file'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common'

@ApiBearerAuth()
@ApiTags('File')
@Controller('file')
@UseGuards(AuthGuard(), RolesGuard)
export class FileController {
  constructor(private readonly fileService: FileService) { }

  @Get('/download')
  async downloadFile(@Res() res: Response, @Query() q: DownloadFileDTO) {
    await this.fileService.downloadFile(res, q.path)
  }
}
