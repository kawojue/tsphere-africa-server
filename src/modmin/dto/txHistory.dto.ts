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
    })
    @IsOptional()
    startDate: string

    @ApiProperty({
        example: new Date(),
    })
    @IsOptional()
    endDate: string

    @ApiProperty({
        enum: TxType,
    })
    @IsOptional()
    @IsEnum(TxType)
    type: TxType

    @ApiProperty({
        enum: TxStatus,
    })
    @IsOptional()
    @IsEnum(TxStatus)
    status: TxStatus
}