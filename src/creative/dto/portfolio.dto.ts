import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class PortfolioDto {
    @ApiProperty({
        example: 'MemoMe'
    })
    @IsString()
    @MaxLength(89, {
        message: 'Title is too long'
    })
    @IsNotEmpty()
    title: string

    @ApiProperty({
        example: 'Ultimate Anonymous Platform for Secure Communication, Polls, and Content Control'
    })
    @IsNotEmpty({
        message: 'Add a brief description'
    })
    @IsString()
    description: string
}