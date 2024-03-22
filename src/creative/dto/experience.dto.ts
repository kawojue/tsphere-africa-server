import { ApiProperty } from '@nestjs/swagger'
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class ExperienceDto {
    @ApiProperty({
        example: 'Backend Engineer',
        description: 'The title or the name of the job for the user'
    })
    @IsString()
    @IsNotEmpty()
    title: string

    @ApiProperty({
        example: 'Talent Sphere Africa',
        description: 'The employer name'
    })
    @IsOptional()
    employer: string

    @ApiProperty({
        example: '2024-03-20T16:35:56.815Z',
        description: 'The date the user started the job'
    })
    @IsDate()
    startDate: Date

    @ApiProperty({
        example: 'Wed, 20 Mar 2024 16:42:49 GMT',
        description: 'he date the user ended the job'
    })
    @IsDate()
    @IsOptional()
    endDate: Date

    @ApiProperty({
        example: 'Ikoyi, Lagos',
        description: "The location for the user"
    })
    location: string

    @ApiProperty({
        example: 'Mehn! I rebuilt their backend',
        description: 'The job details for the user'
    })
    @IsOptional()
    details: string
}