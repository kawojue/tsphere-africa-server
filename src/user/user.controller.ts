import { Response } from 'express'
import {
  Param, Req, Res, Query, UseGuards,
  Body, Controller, Delete, Get, Post,
} from '@nestjs/common'
import { Role } from 'src/role.decorator'
import { UserService } from './user.service'
import { AuthGuard } from '@nestjs/passport'
import { Role as Roles } from '@prisma/client'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { FetchProfilesDto } from './dto/infinite-scroll.dto'
import { FetchReviewsDTO, RatingDTO } from './dto/rating.dto'

@ApiTags("User")
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get('/profiles')
  async fetchProfiles(
    @Res() res: Response,
    @Query() query: FetchProfilesDto
  ) {
    await this.userService.fetchProfiles(res, query)
  }

  @Get('/my-profile')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async fetchProfile(
    @Res() res: Response,
    @Req() req: IRequest,
  ) {
    await this.userService.fetchMyProfile(res, req.user)
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.client, Roles.talent, Roles.creative)
  @Post('/rating-review')
  async rateUser(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: RatingDTO,
    @Param('targetUserId') targetUserId: string
  ) {
    await this.userService.rateUser(res, targetUserId, req.user, body)
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/rating-review/:userId/fetch')
  async fetchReviews(
    @Res() res: Response,
    @Query() query: FetchReviewsDTO,
    @Param('userId') userId: string,
  ) {
    await this.userService.fetchReviews(res, userId, query)
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/rating-review/:userId/analytics')
  async ratingAnalytics(
    @Res() res: Response,
    @Param('userId') userId: string,
  ) {
    await this.userService.ratingAnalytics(res, userId)
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete('/rating-review/:ratingId/remove')
  async deleteRating(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('ratingId') ratingId: string,
  ) {
    await this.userService.deleteRating(res, ratingId, req.user)
  }
}
