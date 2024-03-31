import { Response } from 'express'
import { ApiTags } from '@nestjs/swagger'
import { ModminService } from './modmin.service'
import { Body, Controller, Post, Res } from '@nestjs/common'
import { LoginAdminDto, RegisterAdminDto } from './dto/auth.dto'

@ApiTags('Admin & Moderator')
@Controller('modmin')
export class ModminController {
  constructor(private readonly modminService: ModminService) { }

  @Post('/register')
  async registerAdmin(@Res() res: Response, @Body() adminDto: RegisterAdminDto) {
    return await this.modminService.registerAdmin(res, adminDto)
  }

  @Post('/login')
  async loginAdmin(@Res() res: Response, @Body() adminDto: LoginAdminDto) {
    return await this.modminService.loginAdmin(res, adminDto)
  }
}
