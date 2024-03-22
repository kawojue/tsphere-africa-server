import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsEnum } from 'class-validator'
import { CreativeSkillLevel } from '@prisma/client'

export class SkillDto {
    @ApiProperty({
        example: 'Software Engineer',
        description: 'The skill for the user',
    })
    @IsArray()
    skills: string[]

    @ApiProperty({
        example: 'Professional',
        description: "The level for the user's skill",
    })
    @IsEnum(CreativeSkillLevel)
    level: CreativeSkillLevel
}