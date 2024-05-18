import { IsEnum } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { ContractStatus, HireStatus, ProjectStatus } from '@prisma/client'

export class UpdateProjectStatusDTO {
    @ApiProperty({
        enum: ProjectStatus
    })
    @IsEnum(ProjectStatus)
    q: ProjectStatus
}

export class UpdateContractStatusDTO {
    @ApiProperty({
        enum: ContractStatus
    })
    @IsEnum(ContractStatus)
    q: ContractStatus
}

export class UpdateHireStatusDTO {
    @ApiProperty({
        enum: HireStatus
    })
    @IsEnum(HireStatus)
    q: HireStatus
}