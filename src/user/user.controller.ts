import { Response } from 'express'
import { Role } from 'src/role.decorator'
import { UserService } from './user.service'
import { AuthGuard } from '@nestjs/passport'
import { Role as Roles } from '@prisma/client'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { FetchProfilesDto } from './dto/infinite-scroll.dto'
import { Controller, Get, Param, Query, Req, Res, UseGuards } from '@nestjs/common'

@ApiTags("User")
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get('/profiles')
  async fetchProfiles(
    @Res() res: Response,
    @Query() query: FetchProfilesDto
  ) {
    return await this.userService.fetchProfiles(res, query)
  }

  @Get('/profile')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.creative, Roles.talent)
  async fetchProfile(
    @Res() res: Response,
    @Req() req: IRequest,
  ) {
    return await this.userService.fetchProfile(res, req.user)
  }

  @Get('/job-list')
  async jobList(@Res() res: Response) {
    return await this.userService.jobList(res)
  }

  @Get('/job-list/:jobId')
  async getJob(@Res() res: Response, @Param('jobId') jobId: string) {
    return await this.userService.getJob(res, jobId)
  }
}
