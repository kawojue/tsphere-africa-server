import { ApiProperty } from '@nestjs/swagger'
import {
    IsBase64, IsNotEmpty, IsOptional, IsString
} from 'class-validator'

export class InboxDTO {
    @ApiProperty({
        example: '65b..'
    })
    @IsString()
    @IsNotEmpty()
    inboxId: string
}

export class MessageDTO {
    @ApiProperty({
        example: '65b..'
    })
    @IsString()
    @IsNotEmpty()
    receiverId: string

    @ApiProperty({
        example: 'The brief form is not working'
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    content: string

    @ApiProperty({
        example: 'base64 string. Image/video/audio'
    })
    @IsOptional()
    @IsBase64()
    file: string
}