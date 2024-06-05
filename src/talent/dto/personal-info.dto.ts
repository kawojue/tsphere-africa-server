import {
    IsEnum, IsNotEmpty, IsOptional,
    IsPhoneNumber, IsString, IsUrl,
} from 'class-validator'
import { Gender } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'
import { UsernameDto } from 'src/auth/dto/auth.dto'

export class TalentPersonalInfoDto extends UsernameDto {
    @ApiProperty({
        example: 'Raheem'
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    firstname: string

    @ApiProperty({
        example: 'Kawojue'
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    lastname: string

    @ApiProperty({
        example: '+2348131911964'
    })
    @IsNotEmpty()
    @IsOptional()
    @IsPhoneNumber()
    phone: string

    @ApiProperty({
        example: '+2349489289824'
    })
    @IsNotEmpty()
    @IsOptional()
    @IsPhoneNumber()
    altPhone: string

    @ApiProperty({
        example: 'Male',
        enum: Gender
    })
    @IsNotEmpty()
    @IsOptional()
    @IsEnum(Gender)
    gender: Gender

    @ApiProperty({
        example: 'Humanity'
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    religion: string

    @ApiProperty({
        example: '10/09/2003'
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    dob: string

    @ApiProperty({
        example: '21 years'
    })
    @IsString()
    @IsOptional()
    playingMaxAge: string

    @ApiProperty({
        example: '18 years'
    })
    @IsString()
    @IsOptional()
    playingMinAge: string

    @ApiProperty({
        example: 'Nigerian'
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    nationality: string

    @ApiProperty({
        example: 'Nigeria'
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    country: string

    @ApiProperty({
        example: 'Lagos State'
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    state: string

    @ApiProperty({
        example: '10, Lmao Street 😏'
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    address: string

    @ApiProperty({
        examples: ['National Identity Slip', 'National Identity Card', 'Driving License', 'Passport']
    })
    @IsString()
    @IsNotEmpty()
    idType: string

    @ApiProperty({
        example: '["Chinko","Japanese"]'
    })
    @IsString()
    @IsNotEmpty()
    language: string

    @ApiProperty({
        example: 'Engineer'
    })
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    workingTitle: string

    @ApiProperty({
        example: 'https://www.facebook.com/alwaysappear'
    })
    @IsUrl()
    @IsOptional()
    fbHandle: string

    @ApiProperty({
        example: 'https://www.instagram.com/username/'
    })
    @IsUrl()
    @IsOptional()
    igHandle: string

    @ApiProperty({
        example: 'https://x.com/kawojue_'
    })
    @IsUrl()
    @IsOptional()
    xHandle: string
}