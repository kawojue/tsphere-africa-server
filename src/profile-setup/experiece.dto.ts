import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class ExperienceDto {
    @ApiProperty({
        example: '4 years'
    })
    @IsString()
    @IsNotEmpty()
    yearsOfExperience: string

    @ApiProperty({
        example: 'Normal god level naw'
    })
    @IsString()
    @IsNotEmpty()
    proficiencyLevel: string

    @ApiProperty({
        example: 'kashamadupe!'
    })
    @IsString()
    @IsOptional()
    brandsWorkedWith: string

    @ApiProperty({
        example: 'Microservices, Fintech, Event-driven'
    })
    @IsString()
    @IsOptional()
    projectType: string

    @ApiProperty({
        example: 'Engineer kinikan kinikan'
    })
    @IsString()
    @IsOptional()
    roleOrPosition: string

    @ApiProperty({
        example: 'Till I was paid tho'
    })
    @IsString()
    @IsOptional()
    projectDuration: string
}