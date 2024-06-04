import {
    IsOptional, IsEnum, IsNumber,
    IsBoolean, IsArray, Max, Min,
} from 'class-validator'
import { ChargeTime } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'

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
        type: [String],
        example: ['Monday', 'Tuesday', 'Wednesday']
    })
    @IsArray()
    // @Min(1)
    // @Max(7)
    weekdays: string[]
}
