import { IsEnum } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { CreativeSkillLevel } from '@prisma/client'

export class SkillDto {
    @ApiProperty({
        example: ['Backend Engineer', 'Frontend Engineer'],
        description: "Stringify the payload"
    })
    skills: string

    @ApiProperty({
        example: 'Professional',
    })
    @IsEnum(CreativeSkillLevel)
    level: CreativeSkillLevel
}