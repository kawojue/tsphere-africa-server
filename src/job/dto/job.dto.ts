import { Gender } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'
import {
    IsDateString, IsEnum, IsOptional, IsString, Matches, MaxLength
} from 'class-validator'

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
        example: '18-21'
    })
    @Matches(/^\d+-\d+$/, { message: 'Playing age must be in the format number-number (e.g., 18-21)' })
    @IsString()
    @IsOptional()
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
        example: "12-15"
    })
    @Matches(/^\d+-\d+$/, { message: 'Rate must be in the format digit-digit (e.g., 215-317)' })
    rate: string

    @ApiProperty({
        type: [File]
    })
    attachments?: File
}

export class ApplyJobDTO {
    @ApiProperty({
        example: "Omo, no long talk! Just give me this job, abeg."
    })
    @IsOptional()
    cover_letter: string

    @ApiProperty({
        type: [File]
    })
    attachments?: File
}