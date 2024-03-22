import { ApiProperty } from '@nestjs/swagger'
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class EducationDto {
    @ApiProperty({
        example: 'MySchool',
    })
    @IsString()
    @IsNotEmpty()
    school: string

    @ApiProperty({
        example: '2024-03-20T16:35:56.815Z',
    })
    @IsDate()
    @IsNotEmpty()
    startDate: Date

    @ApiProperty({
        example: '2024-03-20T16:35:56.815Z',
    })
    @IsDate()
    @IsNotEmpty()
    endDate: Date

    @ApiProperty({
        example: 'Mathematics'
    })
    @IsString()
    @IsNotEmpty()
    study: string

    @ApiProperty({
        example: 'Degree'
    })
    @IsString()
    @IsNotEmpty()
    levelOfCertification: string

    @ApiProperty({
        example: 'Bachelor'
    })
    @IsString()
    @IsOptional()
    typeOfDegree: string
}