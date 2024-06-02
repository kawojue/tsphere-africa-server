import { ApiProperty } from '@nestjs/swagger'
import { IsString, MaxLength, MinLength } from 'class-validator'

export class AmountDTO {
    @ApiProperty({
        example: 200.72
    })
    amount: number
}

export class WithdrawalDTO extends AmountDTO {
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