import { ApiProperty } from '@nestjs/swagger'
import {
    IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength
} from 'class-validator'
import { InfiniteScrollDto } from './infinite-scroll.dto'

enum Point {
    ONE = 1.0,
    TWO = 2.0,
    THREE = 3.0,
    FOUR = 4.0,
    FIVE = 5.0
}

export class RatingDTO {
    @ApiProperty({
        example: 'Well, and calm person'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    review: string

    @ApiProperty({
        enum: Point,
        description: 'It should either be 0NE, TWO, THREE, FOUR, FIVE - this stops overloading within the valid range'
    })
    @IsNotEmpty()
    @IsEnum(Point)
    point: Point
}

export class FetchReviewsDTO extends InfiniteScrollDto {
    @ApiProperty({
        enum: Point,
        description: 'It should either be 0NE, TWO, THREE, FOUR, FIVE - this stops overloading within the valid range'
    })
    @IsOptional()
    @IsEnum(Point)
    point: Point
}