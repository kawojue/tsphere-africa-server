import { ChargeTime } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'
import {
    ArrayMaxSize, ArrayMinSize, IsOptional,
    IsString, IsArray, IsEnum, Min, IsNumber,
} from 'class-validator'

export class SkillDto {
    @ApiProperty({
        example: 'Programmer'
    })
    @IsString()
    category: string

    @ApiProperty({
        example: ['Frontend', 'Backend', 'DevOp'],
        type: [String]
    })
    subSkills: string[]

    @ApiProperty({
        example: '5 years'
    })
    @IsString()
    yearsOfExperience: string

    @ApiProperty({
        enum: ChargeTime,
        example: 'Weekly'
    })
    @IsEnum(ChargeTime)
    @IsOptional()
    chargeTime: ChargeTime

    @ApiProperty({
        example: 2500
    })
    @IsNumber()
    @Min(8)
    @IsOptional()
    charge: number
}

export class SkillsDto {
    @ApiProperty({ type: [SkillDto] })
    skills: SkillDto[]
}