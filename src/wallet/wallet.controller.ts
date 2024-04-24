import { Request, Response } from 'express'
import StatusCodes from 'enums/StatusCodes'
import { WalletService } from './wallet.service'
import { ValidateBankDto } from './dto/bank.dto'
import { getIPAddress } from 'helpers/getIPAddress'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  Controller, Get, HttpException, Param, Post, Query, Req, Res
} from '@nestjs/common'

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
