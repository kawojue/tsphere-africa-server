import { Response } from 'express'
import { Role } from 'src/role.decorator'
import { AuthGuard } from '@nestjs/passport'
import { Role as Roles } from '@prisma/client'
import { ModminService } from './modmin.service'
import {
  UpdateContractStatusDTO, UpdateProjectStatusDTO
} from './dto/status.dto'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import {
  AnalyticsDto, FetchUserDto, SortUserDto, UserSuspensionDto
} from './dto/user.dto'
import { LoginAdminDto, RegisterAdminDto } from './dto/auth.dto'
import {
  Body, Controller, Get, HttpException, Param, Patch, Post, Query, Res, UseGuards
} from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'

@ApiTags('Admin')
@Controller('modmin')
export class ModminController {
  constructor(private readonly modminService: ModminService) { }

  @Post('/register')
  async registerAdmin(@Res() res: Response, @Body() adminDto: RegisterAdminDto) {
    await this.modminService.registerAdmin(res, adminDto)
  }

  @Post('/login')
  async loginAdmin(@Res() res: Response, @Body() adminDto: LoginAdminDto) {
    await this.modminService.loginAdmin(res, adminDto)
  }

  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/user/analytics/dashboard')
  async userAnalytics(
    @Res() res: Response,
    @Query() query: AnalyticsDto,
  ) {
    await this.modminService.userAnalytics(res, query)
  }

  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/article/analytics/dashboard')
  async articleAnalytics(@Res() res: Response,) {
    await this.modminService.articleAnalytics(res)
  }

  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/referral/analytics/dashboard')
  async referralAnalytics(@Res() res: Response,) {
    await this.modminService.referralAnalytics(res)
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
    await this.modminService.toggleUserSuspension(res, userId, query)
  }

  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('/users/verify/:userId')
  async verifyUser(
    @Res() res: Response,
    @Param('userId') userId: string,
  ) {
    await this.modminService.verifyUser(res, userId)
  }

  @Get('/users')
  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async fetchUsers(
    @Res() res: Response,
    @Query() query: FetchUserDto
  ) {
    await this.modminService.fetchUsers(res, query)
  }

  @ApiBearerAuth()
  @Role(Roles.admin)
  @Get('/users/download-report')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async downloadUsers(
    @Res() res: Response,
    @Query() query: FetchUserDto
  ) {
    try {
      const pdfData = await this.modminService.createUserListPdf(query)

      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=users_report.pdf',
        'Content-Length': pdfData.length
      })

      res.end(pdfData)
    } catch (err) {
      throw new HttpException("Error downloading report", StatusCodes.InternalServerError)
    }
  }

  @ApiBearerAuth()
  @Role(Roles.admin)
  @Get('/users/user/:userId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async fetchUserProfile(
    @Res() res: Response,
    @Param('userId') userId: string,
  ) {
    await this.modminService.fetchUserProfile(res, userId)
  }

  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/user/chart/dashboard')
  async userChart(@Res() res: Response) {
    await this.modminService.userChart(res)
  }

  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/referral/chart/dashboard')
  async referralChart(@Res() res: Response) {
    await this.modminService.referralChart(res)
  }

  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/referrals')
  async fetchReferrals(
    @Res() res: Response,
    @Query() query: SortUserDto,
  ) {
    await this.modminService.fetchReferrals(res, query)
  }

  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/referrals/referral/:referralId')
  async fetchReferral(
    @Res() res: Response,
    @Param('referralId') referralId: string,
  ) {
    await this.modminService.fetchReferral(res, referralId)
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

  @Get('/briefs')
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async fetchBriefs(@Res() res: Response, @Query() q: SortUserDto) {
    await this.modminService.fetchBriefs(res, q)
  }

  @Get('/briefs/:briefId')
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async fetchBrief(@Res() res: Response, @Param('briefId') briefId: string) {
    await this.modminService.fetchBrief(res, briefId)
  }
}
