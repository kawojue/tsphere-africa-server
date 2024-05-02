import {
    IsEmail, IsString, MaxLength, MinLength
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ContactDto {
    @ApiProperty({
        example: 'kawojue08@gmail.com'
    })
    @IsEmail({
        host_whitelist: ['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com', 'fastmail.com']
    })
    email: string

    @ApiProperty({
        example: 'Raheem Kawojue'
    })
    @IsString()
    @MaxLength(42)
    fullname: string

    @ApiProperty({
        example: 'Enjoy life as-is.'
    })
    @MaxLength(500)
    @MinLength(20)
    messageBody: string
}

export class ReplyContactDto {
    @ApiProperty({
        example: 'Raheem Kawojue'
    })
    @IsString()
    @MaxLength(42)
    subject: string

    @ApiProperty({
        example: 'Enjoy life as-is.'
    })
    @MaxLength(500)
    @MinLength(20)
    messageBody: string
}