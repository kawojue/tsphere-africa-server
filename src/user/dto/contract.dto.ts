import { ApiProperty } from '@nestjs/swagger'
import { SortUser, UserRole } from 'enums/base.enum'
import { InfiniteScrollDto } from './infinite-scroll.dto'
import { IsEnum, IsOptional, IsString } from 'class-validator'

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

export class DeclineContractDTO {
    @ApiProperty({
        example: "I am not available to work on Saturday and Sunday"
    })
    @IsString()
    reason: string
}