import { UserStatus } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsOptional } from 'class-validator'
import { Analytics, SortUser, FetchUser } from 'enums/base.enum'

export class UserSuspensionDto {
    @ApiProperty({
        enum: UserStatus
    })
    @IsEnum(UserStatus)
    action: UserStatus
}

export class AnalyticsDto {
    @ApiProperty({
        enum: Analytics
    })
    @IsEnum(Analytics)
    q: Analytics
}

export class InfiniteScroll {
    @ApiProperty({
        example: 1
    })
    @IsOptional()
    page?: number

    @ApiProperty({
        example: 9
    })
    @IsOptional()
    limit?: number
}

export class SearchDto extends InfiniteScroll {
    @ApiProperty({
        example: ' '
    })
    @IsOptional()
    s: string
}

export class SortUserDto extends SearchDto {
    @ApiProperty({
        enum: SortUser
    })
    @IsEnum(SortUser)
    @IsOptional()
    q: SortUser
}

export class FetchUserDto extends SortUserDto {
    @ApiProperty({
        enum: FetchUser
    })
    @IsOptional()
    @IsEnum(FetchUser)
    type: FetchUser
}