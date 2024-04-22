import { Response } from 'express'
import { Role } from 'src/role.decorator'
import { AuthGuard } from '@nestjs/passport'
import { Role as Roles } from '@prisma/client'
import { ModminService } from './modmin.service'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { LoginAdminDto, RegisterAdminDto } from './dto/auth.dto'
import { AnalyticsDto, FetchUserDto, UserSuspensionDto } from './dto/user.dto'
import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common'

@ApiTags('Admin')
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

  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/user/analytics')
  async analytics(
    @Res() res: Response,
    @Query() query: AnalyticsDto,
  ) {
    return await this.modminService.analytics(res, query)
  }

  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/article/analytics')
  async articleAnalytics(@Res() res: Response,) {
    return await this.modminService.articleAnalytics(res)
  }

  @Get('/user/totggle-suspension/:userId')
  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async toggleUserSuspension(
    @Res() res: Response,
    @Param('userId') userId: string,
    @Query() query: UserSuspensionDto,
  ) {
    return await this.modminService.toggleUserSuspension(res, userId, query)
  }

  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('/users/toggle-verification/:userId')
  async toggleUserVerification(
    @Res() res: Response,
    @Param('userId') userId: string,
  ) {
    return await this.modminService.toggleUserVerification(res, userId)
  }

  @Get('/users')
  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async fetchAllUsers(
    @Res() res: Response,
    @Query() query: FetchUserDto
  ) {
    return await this.modminService.fetchUsers(res, query)
  }

  @ApiBearerAuth()
  @Role(Roles.admin)
  @Get('/users/user/:userId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async fetchUserProfile(
    @Res() res: Response,
    @Param('userId') userId: string,
  ) {
    return await this.modminService.fetchUserProfile(res, userId)
  }

  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/users/chart')
  async chart(@Res() res: Response) {
    return await this.modminService.chart(res)
  }
}
