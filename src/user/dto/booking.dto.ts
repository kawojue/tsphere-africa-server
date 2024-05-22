import { ApiProperty } from '@nestjs/swagger'
import {
    IsBoolean, IsOptional, IsString, MaxLength
} from 'class-validator'

export class HandleBookingDTO {
    @ApiProperty({
        examples: [true, false]
    })
    @IsBoolean()
    action: boolean

    @ApiProperty({
        example: "Sorry, I can't take the offer price."
    })
    @IsString()
    @IsOptional()
    @MaxLength(200)
    reason: string
}