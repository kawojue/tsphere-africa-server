import { UserRole } from 'enums/base.enum'
import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { toLowerCase } from 'helpers/formatTexts'
import { IsEnum, IsOptional, IsString } from 'class-validator'

export class SearchDto {
    @ApiProperty({
        example: ' '
    })
    @IsString()
    @IsOptional()
    @Transform(({ value }) => toLowerCase(value))
    search?: string
}

export class InfiniteScrollDto extends SearchDto {
    @ApiProperty({
        example: 1
    })
    @IsOptional()
    page?: number

    @ApiProperty({
        example: 30
    })
    @IsOptional()
    limit?: number
}

export class FetchProfilesDto extends InfiniteScrollDto {
    @ApiProperty({
        enum: UserRole
    })
    @IsEnum(UserRole)
    role: UserRole
}