import { Role } from '@prisma/client'
import { USER_REGEX } from 'utils/regExp'
import { TokenEnum } from 'enums/base.enum'
import {
    IsEmail, Matches, IsString, IsOptional,
    IsNotEmpty, MaxLength, MinLength, IsEnum,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { titleText, toLowerCase } from 'helpers/formatTexts'

export class EmailDto {
    @ApiProperty({
        example: "kawojue08@gmail.com",
    })
    @IsEmail({}, { message: "Invalid Email" })
    @Transform(({ value }) => toLowerCase(value))
    email: string
}

export class UsernameDto {
    @ApiProperty({
        example: 'kawojue',
    })
    @IsString()
    @Transform(({ value }) => toLowerCase(value))
    @IsNotEmpty({ message: 'Username is required' })
    @Matches(USER_REGEX, { message: "Username is not allowed" })
    username: string
}

export class TokenDto {
    @ApiProperty({
        example: '026c567f8000d5a4ccd83fe61d822c4fcb7a148e9af72aa03a',
    })
    @IsString()
    @IsNotEmpty()
    token: string
}

export class TokenEnumDto {
    @ApiProperty({
        enum: TokenEnum,
        example: 'email'
    })
    @IsEnum(TokenEnum)
    token_type: TokenEnum
}

export class RequestTokenDto extends EmailDto {
    @ApiProperty({
        enum: TokenEnum,
        example: 'email'
    })
    @IsEnum(TokenEnum)
    token_type: TokenEnum
}

export class LoginDto extends EmailDto {
    @ApiProperty({
        example: 'P@ssw0rd1',
    })
    @IsString()
    password: string
}

export class SignupDto extends EmailDto {
    @ApiProperty({
        example: 'Raheem',
    })
    @IsString()
    @Transform(({ value }) => titleText(value))
    @IsNotEmpty({ message: 'First name is required' })
    first_name: string

    @ApiProperty({
        example: 'Kawojue',
    })
    @IsString()
    @Transform(({ value }) => titleText(value))
    @IsNotEmpty({ message: 'Last name is required' })
    last_name: string

    @ApiProperty({
        example: 'kawojue',
    })
    @IsString()
    @Transform(({ value }) => toLowerCase(value))
    @IsNotEmpty({ message: 'Username is required' })
    @Matches(USER_REGEX, { message: "Username is not allowed" })
    username: string

    @ApiProperty({
        example: 'talent',
    })
    @IsNotEmpty({ message: 'Role is required' })
    @IsEnum(Role)
    role: Role

    @ApiProperty({
        example: 'Software Engineer',
    })
    @IsOptional()
    @IsString()
    skill: string

    @ApiProperty({
        example: 'Mypswd123',
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(6, {
        message: "Password must be at least 6 characters"
    })
    @MaxLength(36, {
        message: "Password is too long"
    })
    password: string
}

export class ReferralDto {
    @ApiProperty({
        example: 'a2F3b2p1ZQ'
    })
    @IsString()
    @IsOptional()
    refKey: string
}