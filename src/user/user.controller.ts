import { Response } from 'express'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common'
import { UserService } from './user.service'
import { FetchProfilesDto } from './dto/infinite-scroll.dto'
import { AuthGuard } from '@nestjs/passport'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { Role } from 'src/role.decorator'
import { Role as Roles } from '@prisma/client'

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
}
