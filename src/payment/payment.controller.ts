import { Response } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { PaymentService } from './payment.service'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { TxHistoriesDto } from './dto/txHistory.dto'
import { PaymentChartDto } from './dto/analytics.dto'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AmountDTO, WithdrawalDTO } from './dto/withdraw.dto'
import {
  Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards
} from '@nestjs/common'

@ApiBearerAuth()
@ApiTags("Payment")
@Controller('payment')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  @Get('/analytics')
  async analytics(@Req() req: IRequest, @Res() res: Response) {
    await this.paymentService.analytics(res, req.user)
  }

  @Get('/chart')
  async charts(
    @Req() req: IRequest,
    @Res() res: Response,
    @Query() q: PaymentChartDto
  ) {
    await this.paymentService.charts(res, q, req.user)
  }

  @Get('/histories')
  async fetchTxHistories(
    @Req() req: IRequest,
    @Res() res: Response,
    @Query() query: TxHistoriesDto,
  ) {
    await this.paymentService.fetchTxHistories(res, req.user, query)
  }

  @Get('/histories/:tx_id')
  async fetchTxHistory(
    @Req() req: IRequest,
    @Res() res: Response,
    @Param('tx_id') tx_id: string,
  ) {
    await this.paymentService.fetchTxHistory(res, tx_id, req.user)
  }

  @Post('/request-pin')
  async requestPin(@Req() req: IRequest, @Res() res: Response) {
    await this.paymentService.requestPin(res, req.user)
  }

  @Post('/withdraw')
  async withdraw(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: WithdrawalDTO
  ) {
    await this.paymentService.withdraw(res, req.user, body)
  }

  @Post('/single-payment/:userId')
  async makePayment(
    @Res() res: Response,
    @Body() body: AmountDTO,
    @Param('userId') userId: string,
  ) {
    await this.paymentService.makePayment(res, userId, body)
  }

  // @Post('/bulk-payment/:userId')
  // async makeBulkPayment(

  // ) { }
}
