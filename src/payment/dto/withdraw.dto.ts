import { ApiProperty } from '@nestjs/swagger'
import { IsString, MaxLength, Min, MinLength } from 'class-validator'

const MIN_AMOUNT = 50 as const

export class WithdrawalDto {
    @ApiProperty({
        example: 200.72
    })
    @Min(MIN_AMOUNT, { message: `Minimum amount is ₦${MIN_AMOUNT}` })
    amount: number

    @ApiProperty({
        example: '662c0c2948ff757b8c0d3636'
    })
    @IsString()
    @MaxLength(24)
    @MinLength(24)
    linkedBankId: string

    @ApiProperty({
        example: '232799'
    })
    @IsString()
    @MaxLength(6)
    @MinLength(6)
    pin: string
}