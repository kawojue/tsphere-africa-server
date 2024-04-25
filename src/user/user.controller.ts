import { Response } from 'express'
import { Role } from 'src/role.decorator'
import { UserService } from './user.service'
import { AuthGuard } from '@nestjs/passport'
import { Role as Roles } from '@prisma/client'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { FetchProfilesDto } from './dto/infinite-scroll.dto'
import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common'

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
  @Role(Roles.creative, Roles.talent, Roles.client)
  async fetchProfile(
    @Res() res: Response,
    @Req() req: IRequest,
  ) {
    return await this.userService.fetchProfile(res, req.user)
  }
}
