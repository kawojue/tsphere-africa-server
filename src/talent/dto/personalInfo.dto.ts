import { ApiProperty } from '@nestjs/swagger';
import { PersonalInfoDto as CreativePersonalInfoDto } from 'src/creative/dto/personalInfo.dto'
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator'

export class PersonalInfo extends CreativePersonalInfoDto {
    @ApiProperty({
        example: 4
    })
    @IsNumber()
    @IsNotEmpty()
    yearsOfExperience: number

    @ApiProperty({
        examples: ['National Identity Slip', 'BVN', 'National Identity Card', 'Driving License', 'Passport']
    })
    @IsString()
    @IsNotEmpty()
    idType: string

    @ApiProperty({
        example: '12309847560'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(15, {
        message: 'ID number is too long'
    })
    idNumber: string

    @ApiProperty({
        example: 'https://www.instagram.com/username/'
    })
    @IsUrl()
    @IsOptional()
    instagramHandle: string

    @ApiProperty({
        example: 'https://x.com/kawojue_'
    })
    @IsUrl()
    @IsOptional()
    xHandle: string
}