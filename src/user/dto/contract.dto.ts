import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsOptional } from 'class-validator'
import { SortUser, UserRole } from 'enums/base.enum'
import { InfiniteScrollDto } from './infinite-scroll.dto'

export class FectchContractsDTO extends InfiniteScrollDto {
    @ApiProperty({
        enum: UserRole
    })
    @IsEnum(UserRole)
    @IsOptional()
    tab: UserRole

    @ApiProperty({
        enum: SortUser
    })
    @IsOptional()
    sortBy: SortUser
}