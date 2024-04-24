import { SearchDto } from './user.dto'
import { ApiProperty } from '@nestjs/swagger'
import { TxStatus, TxType } from '@prisma/client'
import { IsEnum, IsOptional } from 'class-validator'


enum SortTxHistory {
    date = "date",
    amount = "amount",
}

export class SortHistoryDto extends SearchDto {
    @ApiProperty({
        enum: SortTxHistory
    })
    @IsEnum(SortTxHistory)
    @IsOptional()
    q: SortTxHistory
}

export class TxHistoriesDto extends SortHistoryDto {
    @ApiProperty({
        example: '2024-01-01T00:00:00.000Z',
        default: 0,
        description: 'The starting date. This is optional and could be 0',
    })
    startDate?: string

    @ApiProperty({
        example: '2024-02-01T00:00:00.000Z',
        default: new Date(),
        description: 'The ending date. This is optional and default is current date'
    })
    endDate?: string

    @ApiProperty({
        example: TxType,
        default: null,
    })
    @IsOptional()
    @IsEnum(TxType)
    type?: TxType

    @ApiProperty({
        example: TxStatus,
        default: null,
    })
    @IsOptional()
    @IsEnum(TxStatus)
    status?: TxStatus
}