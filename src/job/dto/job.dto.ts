import { Gender } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'

export class PostJobDto {
    @ApiProperty({
        example: 'Modeling'
    })
    @IsString()
    @MaxLength(50)
    job_type: string

    @ApiProperty({
        example: 'Featuring addidas'
    })
    @IsString()
    @MaxLength(50)
    job_title: string

    @ApiProperty({
        example: 'Runaway'
    })
    @IsString()
    @MaxLength(50)
    job_role: string

    @ApiProperty({
        example: '18 - 21 years'
    })
    @IsString()
    @IsOptional()
    @MaxLength(10)
    playingAge: string

    @ApiProperty({
        example: "We're like a family 🤣"
    })
    @IsString()
    @MaxLength(1000)
    description: string

    @ApiProperty({
        example: new Date()
    })
    @IsOptional()
    duration: string

    @ApiProperty({
        example: new Date()
    })
    applicaion_deadline: string

    @ApiProperty({
        example: 'Can dance and play'
    })
    @IsString()
    @MaxLength(1000)
    requirement: string

    @ApiProperty({
        example: 'Lagos'
    })
    @IsString()
    @MaxLength(50)
    location: string

    @ApiProperty({
        example: 'Beginner'
    })
    @IsString()
    @MaxLength(15)
    experience: string

    @ApiProperty({
        enum: Gender
    })
    @IsOptional()
    @IsEnum(Gender)
    gender: Gender

    @ApiProperty({
        example: 23.67
    })
    rate: number
}