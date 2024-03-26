import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class BioDto {
    @ApiProperty({
        example: '💻 Navigating the digital universe.'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(324)
    bio: string
}