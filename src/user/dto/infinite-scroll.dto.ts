import { Profile } from 'enums/base.enum'
import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString } from 'class-validator'

export class SearchDto {
    @ApiProperty({
        example: 'kawojue'
    })
    @IsString()
    @IsOptional()
    search: string
}

export class InfiniteScrollDto extends SearchDto {
    @ApiProperty({
        example: 1
    })
    @IsOptional()
    page: number

    @ApiProperty({
        example: 30
    })
    @IsOptional()
    limit: number
}

export class FetchProfilesDto extends InfiniteScrollDto {
    @ApiProperty({
        enum: Profile
    })
    @IsEnum(Profile)
    profile: Profile
}