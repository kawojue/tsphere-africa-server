import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'

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
    @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' } })
    @IsOptional()
    videos?: Express.Multer.File[]

    @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' } })
    @IsOptional()
    images?: Express.Multer.File[]

    @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' } })
    @IsOptional()
    docs?: Express.Multer.File[]
}