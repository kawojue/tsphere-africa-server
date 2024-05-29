import { Response } from 'express'
import { Role } from 'src/role.decorator'
import { AuthService } from './auth.service'
import {
  LoginDto, SignupDto, TokenDto, EmailDto,
  RequestTokenDto, ReferralDto, UsernameDto,
} from './dto/auth.dto'
import { AuthGuard } from '@nestjs/passport'
import {
  Req, Controller, Get, UseGuards, UploadedFile,
  UseInterceptors, Post, Query, Res, Body, Patch,
} from '@nestjs/common'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import {
  ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags
} from '@nestjs/swagger'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ResetPasswordDto, ResetPasswordTokenDto, UpdatePasswordDto
} from './dto/reset-password.dto'

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('/subscribe-newsletter')
  async subscribeToNewsletter(@Res() res: Response, @Body() subscribeNews: EmailDto) {
    await this.authService.subscribeToNewsletter(res, subscribeNews)
  }

  @Get('/verify-email')
  async verifyEmail(@Res() res: Response, @Query() { token }: TokenDto) {
    await this.authService.verifyEmail(res, token)
  }

  @Post('request-token')
  async requestToken(@Res() res: Response, @Body() body: RequestTokenDto) {
    await this.authService.requestToken(res, body)
  }

  @Patch('/reset-password')
  async resetPassword(
    @Res() res: Response,
    @Body() body: ResetPasswordDto,
    @Query() query: ResetPasswordTokenDto,
  ) {
    await this.authService.resetPassword(res, body, query)
  }

  @Get('/email-exists')
  async emailExists(@Res() res: Response, @Query() { email }: EmailDto) {
    await this.authService.emailExists(res, email)
  }

  @Get('/username-exists')
  async usernameExists(@Res() res: Response, @Query() { username }: UsernameDto) {
    await this.authService.usernameExists(res, username)
  }

  @Post('/signup')
  async signup(
    @Res() res: Response,
    @Query() query: ReferralDto,
    @Body() signupDto: SignupDto,
  ) {
    await this.authService.signup(res, query, signupDto)
  }

  @Post('/login')
  async login(@Res() res: Response, @Body() loginDto: LoginDto) {
    await this.authService.login(res, loginDto)
  }

  @Patch('/avatar')
  @ApiBearerAuth()
  @ApiConsumes('multipart/formdata', 'image/jpeg', 'image/png')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({
    summary: 'The profile photo key should be avatar in the formdata'
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role('user', 'client', 'creative', 'talent')
  async uploadAvatar(
    @Res() res: Response,
    @Req() req: IRequest,
    @UploadedFile() file: Express.Multer.File
  ) {
    await this.authService.uploadAvatar(res, req.user, file)
  }

  @ApiBearerAuth()
  @Post('/update-password')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role('user', 'client', 'creative', 'talent')
  async updatePassword(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: UpdatePasswordDto
  ) {
    await this.authService.updatePassword(res, req.user, body)
  }
}
