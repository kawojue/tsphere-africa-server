import { Response } from 'express'
import { AppService } from './app.service'
import { CountryDTO } from './auth/dto/auth.dto'
import { Body, Controller, Get, Post, Res } from '@nestjs/common'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello()
  }

  @Get('/countries')
  async fetchCountries(@Res() res: Response) {
    await this.appService.fetchCountries(res)
  }

  @Post('/states')
  async fetchStatesByCountry(@Res() res: Response, @Body() body: CountryDTO) {
    await this.appService.fetchStatesByCountry(res, body)
  }
}
