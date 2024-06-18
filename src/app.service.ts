import { Response } from 'express'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { CountryDTO } from './auth/dto/auth.dto'
import { PrismaService } from 'lib/prisma.service'

@Injectable()
export class AppService {
  constructor(
    private readonly response: SendRes,
    private readonly prisma: PrismaService,
  ) { }

  getHello(): string {
    return 'Talent Sphere Africa'
  }

  async fetchCountries(res: Response) {
    const countries = await this.prisma.country.findMany({
      orderBy: { name: 'asc' }
    })

    this.response.sendSuccess(res, StatusCodes.OK, { data: countries })
  }

  async fetchStatesByCountry(res: Response, { name }: CountryDTO) {
    const country = await this.prisma.country.findFirst({
      where: { name }
    })

    if (!country) {
      return this.response.sendError(res, StatusCodes.NotFound, "Country not found")
    }

    const states = await this.prisma.state.findMany({
      where: { countryId: country.id },
      orderBy: { name: 'asc' }
    })

    this.response.sendSuccess(res, StatusCodes.OK, { data: states })
  }
}
