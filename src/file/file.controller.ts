import { Response } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { FileService } from './file.service'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common'

@ApiBearerAuth()
@ApiTags('File')
@Controller('file')
@UseGuards(AuthGuard(), RolesGuard)
export class FileController {
  constructor(private readonly fileService: FileService) { }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/download/:path')
  async downloadFile(@Res() res: Response, @Param('path') path: string) {
    return await this.fileService.downloadFile(res, path)
  }
}
