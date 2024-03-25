import {
    IsNotEmpty, MaxLength, MinLength,
    IsEmail, Matches, IsEnum, IsString,
} from 'class-validator'
import { Role } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'
import { TokenEnum } from 'enums/base.enum'

export class EmailDto {
    @ApiProperty({
        example: "kawojue08@gmail.com",
    })
    @IsEmail({}, {
        message: "Invalid Email"
    })
    email: string
}

export class UsernameDto {
    @ApiProperty({
        example: 'kawojue',
    })
    @IsString()
    @IsNotEmpty()
    username: string
}

export class TokenDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        example: '026c567f8000d5a4ccd83fe61d822c4fcb7a148e9af72aa03a==',
    })
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

export class RequestTokenDto extends TokenEnumDto {
    @ApiProperty({
        example: 'john.doe@example.com',
    })
    @IsString()
    @IsEmail({}, { message: 'Invalid email format' })
    email: string
}

export class GoogleOnboardingDto extends UsernameDto {
    @ApiProperty({
        example: 'talent',
    })
    @IsNotEmpty({ message: 'Role is required' })
    @IsEnum(Role)
    role: Role

    @ApiProperty({
        example: 'Raheem',
    })
    @IsNotEmpty({ message: 'Role is required' })
    @IsString()
    firstname: string

    @ApiProperty({
        example: 'Kawojue',
    })
    @IsNotEmpty({ message: 'Role is required' })
    @IsString()
    readonly lastname: string
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
        example: 'kawojue_',
    })
    @IsNotEmpty({ message: 'Username is required' })
    @IsString()
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
    @IsNotEmpty()
    @IsString()
    skill: string

    @ApiProperty({
        example: 'P@ssw0rd1',
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(6, {
        message: "Password must be at least 6 characters"
    })
    @MaxLength(72, {
        message: "Password is too long"
    })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*/, {
        message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 numeric digit',
    })
    password: string
}

export class SignupUnder18Dto extends SignupDto {
    @ApiProperty({
        example: 'Nigeria'
    })
    @IsNotEmpty()
    @IsString()
    issuingCountry: string
}