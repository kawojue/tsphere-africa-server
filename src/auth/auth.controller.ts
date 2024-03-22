import {
  Post, Query, Res, Body, Patch,
  Req, Controller, Get, UseGuards,
} from '@nestjs/common'
import { Role } from 'src/role.decorator'
import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { AuthGuard } from '@nestjs/passport'
import {
  UsernameDto, LoginDto, SignupDto, TokenDto,
  EmailDto, GoogleOnboardingDto, RequestTokenDto,
} from './dto/auth.dto'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { LoginAdminDto, RegisterAdminDto } from './dto/admin.dto'
import { ResetPasswordDto, ResetPasswordTokenDto } from './dto/reset-password.dto'

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() { }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    // @ts-ignore
    const { access_token, user } = req.user
    if (access_token && !user.hasCompletedOnboarding) {
      res.redirect(`${process.env.CLIENT_URL}/google/onboarding?token=${access_token}`)
    } else if (access_token && user.hasCompletedOnboarding) {
      res.redirect(`${process.env.CLIENT_URL}/${user.role}`)
    } else {
      res.redirect(`${process.env.CLIENT_URL}/login`)
    }
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role('user')
  @Post('google/onboarding')
  async completeGoogleOnboarding(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() googleOnboardingDto: GoogleOnboardingDto
  ) {
    //@ts-ignore
    return await this.authService.completeGoogleOnboarding(res, req.user, googleOnboardingDto)
  }

  @Post('/subscribe-newsletter')
  async subscribeToNewsletter(@Res() res: Response, @Body() subscribeNews: EmailDto) {
    return await this.authService.subscribeToNewsletter(res, subscribeNews)
  }

  @Get('/verify-email')
  async verifyEmail(@Res() res: Response, @Query() { token }: TokenDto) {
    return await this.authService.verifyEmail(res, token)
  }

  @Get('request-token')
  async requestToken(@Res() res: Response, @Query() query: RequestTokenDto) {
    return await this.authService.requestToken(res, query)
  }

  @Patch('/reset-password')
  async resetPassword(
    @Res() res: Response,
    @Body() body: ResetPasswordDto,
    @Query() query: ResetPasswordTokenDto,
  ) {
    return await this.authService.resetPassword(res, body, query)
  }

  @Get('/email-exists')
  async emailExists(@Res() res: Response, @Query() { email }: EmailDto) {
    return await this.authService.emailExists(res, email)
  }

  @Get('/username-exists')
  async usernameExists(@Res() res: Response, @Query() { username }: UsernameDto) {
    return await this.authService.usernameExists(res, username)
  }

  @Post('/register')
  async signup(@Res() res: Response, @Body() signupDto: SignupDto) {
    await this.authService.signup(res, signupDto)
  }

  @Post('/login')
  async login(@Res() res: Response, @Body() loginDto: LoginDto) {
    return await this.authService.login(res, loginDto)
  }

  @Post('/admin-register')
  async registerAdmin(@Res() res: Response, @Body() adminDto: RegisterAdminDto) {
    return await this.authService.registerAdmin(res, adminDto)
  }

  @Post('/admin-login')
  async loginAdmin(@Res() res: Response, @Body() adminDto: LoginAdminDto) {
    return await this.authService.loginAdmin(res, adminDto)
  }
}
