import { ChargeTime } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsArray, IsEnum, IsNumber } from 'class-validator'

export class RatesAvailabilityDto {
  @ApiProperty({
    example: 'Hourly'
  })
  @IsNotEmpty()
  @IsEnum(ChargeTime)
  chargeTime: ChargeTime

  @ApiProperty({
    example: ['Mon', 'Wed', 'Fri', 'Sat']
  })
  @IsNotEmpty()
  @IsArray()
  workingDays: string[]

  @ApiProperty({
    example: '2'
  })
  @IsNotEmpty()
  @IsNumber()
  chargePerTime: number

  @ApiProperty({
    example: '40 hrs per week'
  })
  @IsNotEmpty()
  @IsString()
  workHoursPerTime: string;
}
