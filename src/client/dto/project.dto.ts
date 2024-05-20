import { ApiProperty } from '@nestjs/swagger'
import { ChargeTime, Gender, YesOrNo } from '@prisma/client'
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CompulsoryFieldsDTO {
    @ApiProperty({
        example: 'Modeling'
    })
    @IsString()
    @IsNotEmpty()
    category: string

    @ApiProperty({
        example: 'Runaway Model'
    })
    @IsString()
    @IsNotEmpty()
    title: string

    @ApiProperty({
        example: 'Theater Play'
    })
    @IsString()
    @IsNotEmpty()
    type: string
}

export class CreateProjectDocumentDTO extends CompulsoryFieldsDTO {
    @ApiProperty({
        type: Array<Express.Multer.File>
    })
    @IsOptional()
    videos?: Array<Express.Multer.File>

    @ApiProperty({
        type: Array<Express.Multer.File>
    })
    @IsOptional()
    images?: Array<Express.Multer.File>

    @ApiProperty({
        type: Array<Express.Multer.File>
    })
    @IsOptional()
    docs?: Array<Express.Multer.File>
}

const now = new Date()
const sevenDays = new Date(now)
sevenDays.setDate(now.getDate() + 7)

export class CreateProjectFillDTO extends CompulsoryFieldsDTO {
    @ApiProperty({
        example: 'Well..'
    })
    @IsString()
    @IsOptional()
    description: string

    @ApiProperty({
        example: 'Well..'
    })
    @IsString()
    @IsOptional()
    role_name: string

    @ApiProperty({
        example: 'Well..'
    })
    @IsString()
    @IsOptional()
    role_type: string

    @ApiProperty({
        enum: Gender
    })
    @IsEnum(Gender)
    @IsOptional()
    gender: Gender

    @ApiProperty({
        example: '18-21'
    })
    @IsString()
    @IsOptional()
    age: string

    @ApiProperty({
        example: 'Nigerians'
    })
    @IsString()
    @IsOptional()
    nationality: string

    @ApiProperty({
        enum: YesOrNo
    })
    @IsEnum(YesOrNo)
    @IsOptional()
    willing_to_pay: YesOrNo

    @ApiProperty({
        example: 'Well..'
    })
    @IsString()
    @IsOptional()
    duration: string

    @ApiProperty({
        enum: ChargeTime
    })
    @IsEnum(ChargeTime)
    @IsOptional()
    rate_type: ChargeTime

    @ApiProperty({
        example: 'Well..'
    })
    @IsString()
    @IsOptional()
    compensation: string

    @ApiProperty({
        example: now
    })
    @IsDateString()
    @IsOptional()
    shoot_date: string

    @ApiProperty({
        example: now
    })
    @IsOptional()
    shoot_time: string

    @ApiProperty({
        example: 'Well..'
    })
    @IsString()
    @IsOptional()
    shoot_address: string


    @ApiProperty({
        example: 'Well..'
    })
    @IsString()
    @IsOptional()
    shoot_info: string

    @ApiProperty({
        example: now
    })
    @IsDateString()
    @IsOptional()
    audition_date: string

    @ApiProperty({
        example: now
    })
    @IsOptional()
    audition_time: string

    @ApiProperty({
        example: 'Well..'
    })
    @IsString()
    @IsOptional()
    audition_options: string

    @ApiProperty({
        example: 'Well..'
    })
    @IsString()
    @IsOptional()
    audition_type: string

    @ApiProperty({
        example: 'Omo'
    })
    @IsString()
    @IsOptional()
    venue: string

    @ApiProperty({
        example: 'Lagos'
    })
    @IsString()
    @IsOptional()
    city: string

    @ApiProperty({
        example: 'Lagos State'
    })
    @IsString()
    @IsOptional()
    state: string

    @ApiProperty({
        example: 'Well..'
    })
    @IsString()
    @IsOptional()
    audition_address: string

    @ApiProperty({
        enum: YesOrNo
    })
    @IsEnum(YesOrNo)
    @IsOptional()
    pre_screen: YesOrNo

    @ApiProperty({
        example: 'Well..'
    })
    @IsString()
    @IsOptional()
    audition_instruction: string

    @ApiProperty({
        example: sevenDays
    })
    @IsDateString()
    @IsOptional()
    brief_date_expiry: string

    @ApiProperty({
        example: sevenDays
    })
    @IsOptional()
    brief_time_expiry: string
}