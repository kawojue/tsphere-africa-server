import { Gender } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsEnum, IsOptional, IsPhoneNumber } from 'class-validator'

export class PersonalInfoDto {
    @ApiProperty({
        example: '+2348131911964',
        description: 'The phone number for the user'
    })
    @IsOptional()
    @IsPhoneNumber()
    phone: string

    @ApiProperty({
        example: 'Male',
        description: 'Could be left blank, Female, or Male'
    })
    @IsOptional()
    @IsEnum(Gender)
    gender: Gender

    @ApiProperty({
        example: ['English', 'Yoruba'],
        description: 'This should sent as an array of languages'
    })
    @IsOptional()
    @IsArray({
        message: 'It should be array of languages'
    })
    languages: string[]

    @ApiProperty({
        example: 'Nigerian',
        description: 'The nationality for the user'
    })
    @IsOptional()
    nationality: string

    @ApiProperty({
        example: 'Humanity',
        description: 'The religion for the user'
    })
    @IsOptional()
    religion: string
}