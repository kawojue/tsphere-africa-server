import { Role } from 'src/role.decorator'
import { Request, Response } from 'express'
import StatusCodes from 'enums/StatusCodes'
import { AuthGuard } from '@nestjs/passport'
import { Role as Roles } from '@prisma/client'
import {
  Body, Controller, Delete, Query, Patch, Param,
  Req, HttpException, Post, Res, UseGuards, Get,
} from '@nestjs/common'
import { WalletService } from './wallet.service'
import { ValidateBankDto } from './dto/bank.dto'
import { getIPAddress } from 'helpers/getIPAddress'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { BankDetailsDto } from './dto/bank-details.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags("Wallet")
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) { }

  @Get('/verify/bank-details')
  async bankAccountVerification(@Res() res: Response, @Query() query: ValidateBankDto) {
    return await this.walletService.bankAccountVerification(res, query)
  }

  @Get('/fetch/banks')
  async fetchBanks(@Res() res: Response) {
    return await this.walletService.fetchBanks(res)
  }

  @Get('/fetch/banks/:bankCode')
  async fetchBank(@Res() res: Response, @Param('bankCode') bankCode: string) {
    return await this.walletService.fetchBankByBankCode(res, bankCode)
  }

  @Get('/linked-banks')
  async linkedBanks(
    @Req() req: IRequest,
    @Res() res: Response,
  ) {
    return await this.walletService.linkedBanks(res, req.user)
  }

  @Post('/add/bank-details')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.creative, Roles.talent, Roles.client)
  async addBankDetail(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: BankDetailsDto
  ) {
    return await this.walletService.addBankDetail(res, req.user, body)
  }

  @Delete('/remove/bank-details/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.creative, Roles.talent, Roles.client)
  async removeBankDetail(
    @Req() req: IRequest,
    @Res() res: Response,
    @Param('id') id: string
  ) {
    return await this.walletService.removeBankDetail(res, req.user, id)
  }

  @Patch('/toggle-primary/bank-details/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.creative, Roles.talent, Roles.client)
  async togglePrimaryAccount(
    @Req() req: IRequest,
    @Res() res: Response,
    @Param('id') id: string
  ) {
    return await this.walletService.togglePrimaryAccount(res, req.user, id)
  }

  @ApiOperation({
    summary: "Ignore. It's for Transfer Webhook"
  })
  @Post('/paystack/transfer-webhook')
  async manageFiatEvents(@Req() req: Request) {
    if (!req.body || !req.body?.event || !req.body?.data) {
      throw new HttpException('Invalid request body received', StatusCodes.BadRequest)
    }

    const allowedIPAddresses = ['52.31.139.75', '52.49.173.169', '52.214.14.220']
    const ipAddress = getIPAddress(req)

    if (!allowedIPAddresses.includes(ipAddress)) {
      throw new HttpException("Unauthorized IP Address", StatusCodes.Unauthorized)
    }

    try {
      return await this.walletService.manageTransferEvents(req.body)
    } catch (err) {
      console.error(err)
      throw new HttpException("Something went wrong", StatusCodes.InternalServerError)
    }
  }
}
