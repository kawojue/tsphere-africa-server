import { Response } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { PaymentService } from './payment.service'
import { WithdrawalDto } from './dto/withdraw.dto'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { TxHistoriesDto } from './dto/txHistory.dto'
import { PaymentChartDto } from './dto/analytics.dto'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import {
  Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards
} from '@nestjs/common'

@ApiTags("Payment")
@ApiBearerAuth()
@Controller('payment')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  @Get('/analytics')
  async analytics(
    @Req() req: IRequest,
    @Res() res: Response,
  ) {
    return await this.paymentService.analytics(res, req.user)
  }

  @Get('/chart')
  async charts(
    @Req() req: IRequest,
    @Res() res: Response,
    @Query() q: PaymentChartDto
  ) {
    return await this.paymentService.charts(res, q, req.user)
  }

  @Get('/histories')
  async fetchTxHistories(
    @Req() req: IRequest,
    @Res() res: Response,
    @Query() query: TxHistoriesDto,
  ) {
    return await this.paymentService.fetchTxHistories(res, req.user, query)
  }

  @Get('/histories/:tx_id')
  async fetchTxHistory(
    @Req() req: IRequest,
    @Res() res: Response,
    @Param('tx_id') tx_id: string,
  ) {
    return await this.paymentService.fetchTxHistory(res, tx_id, req.user)
  }

  @Post('/request-pin')
  async requestPin(
    @Req() req: IRequest,
    @Res() res: Response,
  ) {
    return await this.paymentService.requestPin(res, req.user)
  }

  @Post('/withdraw')
  async withdraw(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: WithdrawalDto
  ) {
    return await this.paymentService.withdraw(res, req.user, body)
  }
}
