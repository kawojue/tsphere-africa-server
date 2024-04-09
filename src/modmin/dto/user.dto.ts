import { RoleEnum } from 'enums/base.enum'
import { UserStatus } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsOptional } from 'class-validator'

export class UserSuspensionDto {
    @ApiProperty({
        enum: UserStatus
    })
    @IsEnum(UserStatus)
    action: UserStatus
}

export class AnalyticsDto {
    @ApiProperty({
        enum: RoleEnum
    })
    @IsEnum(RoleEnum)
    @IsOptional()
    role: RoleEnum
}