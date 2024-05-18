import { Response } from 'express'
import { Role } from 'src/role.decorator'
import { AuthGuard } from '@nestjs/passport'
import { Role as Roles } from '@prisma/client'
import { ModminService } from './modmin.service'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { UpdateContractStatusDTO, UpdateHireStatusDTO, UpdateProjectStatusDTO } from './dto/status.dto'
import {
  AnalyticsDto, FetchUserDto, SortUserDto, UserSuspensionDto
} from './dto/user.dto'
import { LoginAdminDto, RegisterAdminDto } from './dto/auth.dto'
import {
  Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards
} from '@nestjs/common'

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
  @Get('/user/analytics/dashboard')
  async userAnalytics(
    @Res() res: Response,
    @Query() query: AnalyticsDto,
  ) {
    return await this.modminService.userAnalytics(res, query)
  }

  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/article/analytics/dashboard')
  async articleAnalytics(@Res() res: Response,) {
    return await this.modminService.articleAnalytics(res)
  }

  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/referral/analytics/dashboard')
  async referralAnalytics(@Res() res: Response,) {
    return await this.modminService.referralAnalytics(res)
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
  @Get('/user/chart/dashboard')
  async userChart(@Res() res: Response) {
    return await this.modminService.userChart(res)
  }

  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/referral/chart/dashboard')
  async referralChart(@Res() res: Response) {
    return await this.modminService.referralChart(res)
  }

  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/referrals')
  async fetchReferrals(
    @Res() res: Response,
    @Query() query: SortUserDto,
  ) {
    return await this.modminService.fetchReferrals(res, query)
  }

  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/referrals/referral/:referralId')
  async fetchReferral(
    @Res() res: Response,
    @Param('referralId') referralId: string,
  ) {
    return await this.modminService.fetchReferral(res, referralId)
  }

  @Patch('/projects/:projectId/status')
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async updateProjectStatus(
    @Res() res: Response,
    @Query() q: UpdateProjectStatusDTO,
    @Param('projectId') projectId: string
  ) {
    await this.modminService.updateProjectStatus(res, projectId, q)
  }

  @Patch('/contracts/:hireId/status')
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async updateHireStatus(
    @Res() res: Response,
    @Query() q: UpdateHireStatusDTO,
    @Param('hireId') hireId: string,
  ) {
    await this.modminService.updateHireStatus(res, hireId, q)
  }

  @Patch('/hires/:contractId/status')
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async updateContractStatus(
    @Res() res: Response,
    @Query() q: UpdateContractStatusDTO,
    @Param('contractId') contractId: string,
  ) {
    await this.modminService.updateContractStatus(res, contractId, q)
  }
}
