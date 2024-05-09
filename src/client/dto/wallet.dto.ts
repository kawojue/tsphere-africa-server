import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsString } from 'class-validator'

export class FundWalletDTO {
    @ApiProperty({
        example: 'ref-fdknvkdnv-dvkdnv'
    })
    @IsString()
    ref: string
}