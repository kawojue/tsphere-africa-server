import { ApiProperty } from '@nestjs/swagger'
import { ChargeTime, Weekday } from '@prisma/client'
import { IsOptional, IsEnum, IsNumber, IsBoolean, Min } from 'class-validator'

export class TalentRatesAvailabilityDto {
  @ApiProperty({
    example: true
  })
  @IsBoolean()
  @IsOptional()
  availability: boolean

  @ApiProperty({
    enum: ChargeTime
  })
  @IsEnum(ChargeTime)
  chargeTime: ChargeTime

  @ApiProperty({
    example: 9
  })
  @IsNumber()
  @Min(8)
  charge: number

  @ApiProperty({
    example: 'Monday'
  })
  @IsEnum(Weekday)
  from: Weekday

  @ApiProperty({
    example: 'Friday'
  })
  @IsEnum(Weekday)
  to: Weekday
}
