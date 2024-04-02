import { Response } from 'express'
import { Role } from 'src/role.decorator'
import { AuthService } from './auth.service'
import { AuthGuard } from '@nestjs/passport'
import {
  UsernameDto, LoginDto, SignupDto, TokenDto,
  SignupUnder18Dto, EmailDto, RequestTokenDto,
} from './dto/auth.dto'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import {
  UseInterceptors, Post, Query, Res, Body, Patch, Req,
  Controller, Get, UploadedFiles, UseGuards, UploadedFile,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ResetPasswordDto, ResetPasswordTokenDto, UpdatePasswordDto } from './dto/reset-password.dto'

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('/subscribe-newsletter')
  async subscribeToNewsletter(@Res() res: Response, @Body() subscribeNews: EmailDto) {
    return await this.authService.subscribeToNewsletter(res, subscribeNews)
  }

  @Get('/verify-email')
  async verifyEmail(@Res() res: Response, @Query() { token }: TokenDto) {
    return await this.authService.verifyEmail(res, token)
  }

  @Post('request-token')
  async requestToken(@Res() res: Response, @Body() body: RequestTokenDto) {
    return await this.authService.requestToken(res, body)
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

  @Post('/signup-under18')
  @ApiConsumes('multipart/form-data', 'image/jpeg', 'image/png')
  @UseInterceptors(FileInterceptor('kyc'))
  @ApiOperation({
    summary: 'The ID photo(s) key/fieldname should be kyc in the formdata'
  })
  async signupUnder18(
    @Res() res: Response,
    @Body() signupUnder18Dto: SignupUnder18Dto,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    return await this.authService.signupUnder18(res, files || [], signupUnder18Dto)
  }

  @Post('/signup-over18')
  async signupOver18(@Res() res: Response, @Body() signupDto: SignupDto) {
    return await this.authService.signupOver18(res, signupDto)
  }

  @Post('/login')
  async login(@Res() res: Response, @Body() loginDto: LoginDto) {
    return await this.authService.login(res, loginDto)
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
    return await this.authService.uploadAvatar(res, req.user, file)
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
    return await this.authService.updatePassword(res, req.user, body)
  }
}
