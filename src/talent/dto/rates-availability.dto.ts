import { ApiProperty } from '@nestjs/swagger'
import { ChargeTime, Weekday } from '@prisma/client'
import { IsOptional, IsEnum, IsNumber, MinLength, IsBoolean } from 'class-validator'

export class TalentRatesAvailabilityDto {
  @ApiProperty({
    example: true
  })
  @IsBoolean()
  @IsOptional()
  availability: boolean

  @ApiProperty({
    example: 'Daily'
  })
  @IsEnum(ChargeTime)
  chargeTime: ChargeTime

  @ApiProperty({
    example: 9
  })
  @IsNumber()
  @MinLength(8)
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
