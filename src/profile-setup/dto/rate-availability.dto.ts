import { ChargeTime } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsEnum, IsNumber, IsBoolean } from 'class-validator'

export class RateAndAvailabilityDto {
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
    charge: number

    @ApiProperty({
        example: "['Monday', 'Tuesday', 'Wednesday']"
    })
    weekday: string
}
