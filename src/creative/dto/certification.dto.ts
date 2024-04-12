import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class CertificationDto {
    @ApiProperty({
        example: 'My School'
    })
    @IsString()
    school: string

    @ApiProperty({
        example: '23rd of September, 1993'
    })
    @IsString()
    startDate: string

    @ApiProperty({
        example: '5th of July, 2007'
    })
    @IsString()
    endDate: string

    @ApiProperty({
        example: 'Computer Craft'
    })
    @IsString()
    study: string

    @ApiProperty({
        example: 'ND'
    })
    @IsString()
    @IsOptional()
    level?: string

    @ApiProperty({
        example: 'Trade test 1-3'
    })
    @IsString()
    @IsOptional()
    level_type: string
}