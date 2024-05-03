import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class BankDetailsDto {
    @ApiProperty({
        example: '0N1U2B3A4N'
    })
    @IsString()
    @IsNotEmpty()
    accountNumber: string

    @ApiProperty({
        example: '004'
    })
    @IsOptional()
    @IsString()
    bankCode: string
}