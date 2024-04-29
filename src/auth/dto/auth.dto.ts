import { Role } from '@prisma/client'
import { USER_REGEX } from 'utils/regExp'
import { TokenEnum } from 'enums/base.enum'
import {
    IsEmail, Matches, IsString, IsOptional,
    IsNotEmpty, MaxLength, MinLength, IsEnum,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class EmailDto {
    @ApiProperty({
        example: "kawojue08@gmail.com",
    })
    @IsEmail({}, { message: "Invalid Email" })
    email: string
}

export class UsernameDto {
    @ApiProperty({
        example: 'kawojue',
    })
    @IsString()
    @Matches(USER_REGEX, { message: "Username is not allowed" })
    @IsNotEmpty({ message: 'Username is required' })
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
    @IsNotEmpty({ message: 'First name is required' })
    @IsString()
    first_name: string

    @ApiProperty({
        example: 'Kawojue',
    })
    @IsNotEmpty({ message: 'Last name is required' })
    @IsString()
    last_name: string

    @ApiProperty({
        example: 'kawojue',
    })
    @IsString()
    @Matches(USER_REGEX, { message: "Username is not allowed" })
    @IsNotEmpty({ message: 'Username is required' })
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