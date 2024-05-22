import { ApiProperty } from '@nestjs/swagger'
import {
    IsDateString, IsNotEmpty, IsOptional, IsString,
    MaxLength
} from 'class-validator'

export class CreateProjectDTO {
    @ApiProperty({
        example: 'Omo! Still dancing'
    })
    @IsNotEmpty()
    @IsString()
    proj_title: string

    @ApiProperty({
        example: 'A bit of prostitution, too'
    })
    @IsNotEmpty()
    @IsString()
    proj_type: string

    @ApiProperty({
        example: 'Dancer'
    })
    @IsNotEmpty()
    @IsString()
    role_name: string

    @ApiProperty({
        example: 'Dance'
    })
    @IsNotEmpty()
    @IsString()
    role_type: string

    @ApiProperty({
        example: 500_000
    })
    @IsOptional()
    offer: number

    @ApiProperty({
        example: 'Beans coin'
    })
    @IsOptional()
    @IsString()
    payment_option: string

    @ApiProperty({
        example: new Date()
    })
    @IsDateString()
    proj_date: string

    @ApiProperty({
        example: '10:30 AM'
    })
    @IsOptional()
    @IsString()
    proj_time: string

    @ApiProperty({
        example: '2 weeks'
    })
    proj_duration?: string

    @ApiProperty({
        example: 'Lagos, Lekki'
    })
    location: string

    @ApiProperty({
        example: 'Dancing and all..'
    })
    @IsString()
    @MaxLength(250)
    additional_note: string

    @ApiProperty({
        type: [File]
    })
    attachments: Array<Express.Multer.File>

    @ApiProperty({
        example: 'Organization name'
    })
    @IsOptional()
    @IsString()
    org_name?: string

    @ApiProperty({
        example: 'Omo! Seems unneccesary'
    })
    @IsOptional()
    @IsString()
    job_title?: string

    @ApiProperty({
        example: 'Nigeria'
    })
    @IsOptional()
    @IsString()
    country?: string

    @ApiProperty({
        example: '+2348131911964'
    })
    phone_number?: string

    @ApiProperty({
        example: 'NIN'
    })
    @IsOptional()
    @IsString()
    means_of_id?: string

    @ApiProperty({
        type: [File]
    })
    proof_of_id: Array<Express.Multer.File>
}

export class ExistingProjectDTO {
    @ApiProperty({
        example: 'Dance'
    })
    @IsNotEmpty()
    @IsString()
    role_type: string

    @ApiProperty({
        example: 500_000
    })
    @IsNumber()
    @IsOptional()
    offer: number
}