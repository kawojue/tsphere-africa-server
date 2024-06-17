import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { titleText } from 'helpers/formatTexts'
import { ClientSetupType } from '@prisma/client'
import {
    IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl
} from 'class-validator'

export class ClientProfileSetupQueryDTO {
    @ApiProperty({
        enum: ClientSetupType
    })
    @IsEnum(ClientSetupType)
    type: ClientSetupType
}

export class ClientProfileSetupDTO {
    @ApiProperty({
        example: 'Raheem'
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    @Transform(({ value }) => titleText(value))
    firstname: string

    @ApiProperty({
        example: 'Kawojue'
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    @Transform(({ value }) => titleText(value))
    lastname: string

    @ApiProperty({
        example: 'My Address'
    })
    @IsString()
    @IsNotEmpty()
    address: string

    @ApiProperty({
        example: 'Nigeria'
    })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => titleText(value))
    country: string

    @ApiProperty({
        example: 'Lagos'
    })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => titleText(value))
    state: string

    @ApiProperty({
        example: 'Omo!'
    })
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    @Transform(({ value }) => titleText(value))
    city: string

    @ApiProperty({
        example: 'Talent Sphere'
    })
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    @Transform(({ value }) => titleText(value))
    company_name: string

    @ApiProperty({
        example: 'Eng. (Engineer)'
    })
    @IsString()
    @IsOptional()
    prof_title?: string

    @ApiProperty({
        example: '10/09/2003'
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    dob?: string

    @ApiProperty({
        example: 'https://github.com/kawojue'
    })
    @IsUrl()
    @IsNotEmpty()
    @IsOptional()
    website?: string

    @ApiProperty({
        example: 'https://'
    })
    @IsUrl()
    @IsNotEmpty()
    @IsOptional()
    instagram?: string

    @ApiProperty({
        example: 'https://'
    })
    @IsUrl()
    @IsNotEmpty()
    @IsOptional()
    facebook?: string

    @ApiProperty({
        example: 'https://'
    })
    @IsUrl()
    @IsNotEmpty()
    @IsOptional()
    linkedIn?: string

    @ApiProperty({
        examples: ['CAC', 'OTHER']
    })
    @IsString()
    @IsOptional()
    document_type?: string

    @ApiProperty({
        type: File
    })
    document?: File

    @ApiProperty({
        examples: ['National Identity Slip', 'National Identity Card', 'Driving License', 'Passport']
    })
    @IsString()
    id_type?: string

    @ApiProperty({
        type: [File]
    })
    proof_of_id?: File[]

    @ApiProperty({
        example: 'well..'
    })
    reg_type?: string

    @ApiProperty({
        example: 'REG-12345'
    })
    @IsString()
    @IsOptional()
    reg_no?: string
}