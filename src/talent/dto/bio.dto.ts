import { Gender } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

export class BioDto {
    @ApiProperty({
        example: '💻 Navigating the digital universe.'
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    @MaxLength(324)
    bio: string

    @ApiProperty({
        example: '172 cm'
    })
    @IsString()
    @IsOptional()
    height: string

    @ApiProperty({
        example: '50 Kg'
    })
    @IsString()
    @IsOptional()
    weight: string

    @ApiProperty({
        example: 'N/A'
    })
    @IsString()
    @IsOptional()
    bodyType: string

    @ApiProperty({
        example: 'Black'
    })
    @IsString()
    @IsOptional()
    hairColor: string

    @ApiProperty({
        example: 'Black'
    })
    @IsString()
    @IsOptional()
    eyeColor: string

    @ApiProperty({
        example: 'Male'
    })
    @IsEnum(Gender)
    @IsOptional()
    gender: Gender

    @ApiProperty({
        example: 'N/A'
    })
    @IsString()
    @IsOptional()
    burst: string

    @ApiProperty({
        example: 'N/A'
    })
    @IsString()
    @IsOptional()
    hips: string

    @ApiProperty({
        example: 'N/A'
    })
    @IsString()
    @IsOptional()
    waist: string

    @ApiProperty({
        example: 'N/A'
    })
    @IsString()
    @IsOptional()
    dressSize: string
}