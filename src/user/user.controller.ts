import { Response } from 'express'
import {
  FetchProfilesDto, InfiniteScrollDto
} from './dto/infinite-scroll.dto'
import {
  Param, Req, Res, Query, UseGuards,
  Body, Controller, Delete, Get, Post,
} from '@nestjs/common'
import { Role } from 'src/role.decorator'
import { UserService } from './user.service'
import { AuthGuard } from '@nestjs/passport'
import { Role as Roles } from '@prisma/client'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { SortUserDto } from 'src/modmin/dto/user.dto'
import { FectchContractsDTO } from './dto/contract.dto'
import { FetchReviewsDTO, RatingDTO } from './dto/rating.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

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

  @Get('/profile/:userId')
  async fetchProfile(@Res() res: Response, @Param('userId') userId: string) {
    await this.userService.fetchProfile(res, userId)
  }

  @Get('/profile/:userId/similar-profiles')
  async similarProfiles(@Res() res: Response, @Param('userId') userId: string) {
    await this.userService.similarProfiles(res, userId)
  }

  @Get('/my-profile')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async fetchMyProfile(
    @Res() res: Response,
    @Req() req: IRequest,
  ) {
    await this.userService.fetchMyProfile(res, req.user)
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.client, Roles.talent, Roles.creative)
  @Get('/referral')
  async referral(
    @Res() res: Response,
    @Req() req: IRequest,
    @Query() query: InfiniteScrollDto
  ) {
    await this.userService.referral(res, req.user, query)
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

  @ApiBearerAuth()
  @Get('/contracts')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async fetchContracts(
    @Res() res: Response,
    @Req() req: IRequest,
    @Query() query: FectchContractsDTO
  ) {
    await this.userService.fetchContracts(res, req.user, query)
  }

  @Get('/bookings')
  @ApiOperation({
    summary: "Only for talent and creative"
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.client, Roles.creative)
  async fetchBookings(
    @Res() res: Response,
    @Req() req: IRequest,
    @Query() query: SortUserDto
  ) {
    await this.userService.fetchBookings(res, req.user, query)
  }
}
