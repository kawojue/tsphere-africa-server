import { ApiProperty } from '@nestjs/swagger'
import { ArticleStatus } from 'enums/base.enum'
import { InfiniteScrollDto } from 'src/user/dto/infinite-scroll.dto'
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'


export class PublishArticleDto {
    @ApiProperty({
        example: 'Rhythm'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    title: string

    @ApiProperty({
        example: 'The quick brown fox jumps over the lazy dog'
    })
    @IsString()
    @MinLength(5)
    @IsNotEmpty()
    content: string

    @ApiProperty({
        example: "Productivity"
    })
    @IsNotEmpty()
    category: string

    @ApiProperty({
        description: 'The formdata key should be cover_photo'
    })
    cover_photo?: File
}

export class FetchArticlesDto extends InfiniteScrollDto {
    @ApiProperty({
        enum: ArticleStatus
    })
    @IsEnum(ArticleStatus)
    @IsOptional()
    q: ArticleStatus
}