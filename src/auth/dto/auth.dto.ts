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
        description: "Email for the user"
    })
    @IsEmail({}, {
        message: "Invalid Email"
    })
    email: string
}

export class UsernameDto {
    @ApiProperty({
        example: 'kawojue',
        description: 'The unique username for the user'
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
        description: 'The token gotten from the URL will be sent as a query'
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
        description: 'The email address for the user.',
    })
    @IsString()
    @IsEmail({}, { message: 'Invalid email format' })
    email: string
}

export class GoogleOnboardingDto extends UsernameDto {
    @ApiProperty({
        example: 'talent',
        description: "The role for the user. It's either talent, creative, or client"
    })
    @IsNotEmpty({ message: 'Role is required' })
    @IsEnum(Role)
    readonly role: Role

    @ApiProperty({
        example: 'Raheem',
        description: "The first name for the user"
    })
    @IsNotEmpty({ message: 'Role is required' })
    @IsString()
    readonly firstname: string

    @ApiProperty({
        example: 'Kawojue',
        description: "The last name for the user"
    })
    @IsNotEmpty({ message: 'Role is required' })
    @IsString()
    readonly lastname: string
}

export class LoginDto extends EmailDto {
    @ApiProperty({
        example: 'P@ssw0rd1',
        description: 'The password for the user.',
    })
    @IsString()
    password: string
}

export class SignupDto extends EmailDto {
    @ApiProperty({
        example: 'Raheem',
        description: "The first name for the user"
    })
    @IsNotEmpty({ message: 'First name is required' })
    @IsString()
    readonly first_name: string

    @ApiProperty({
        example: 'Kawojue',
        description: "The last name for the user"
    })
    @IsNotEmpty({ message: 'Last name is required' })
    @IsString()
    readonly last_name: string

    @ApiProperty({
        example: 'kawojue_',
        description: "The unique username for the user"
    })
    @IsNotEmpty({ message: 'Username is required' })
    @IsString()
    readonly username: string

    @ApiProperty({
        example: 'talent',
        description: 'The role for the user. Could be talent, client, or creative'
    })
    @IsNotEmpty({ message: 'Role is required' })
    @IsEnum(Role)
    readonly role: Role

    @ApiProperty({
        example: 'P@ssw0rd1',
        description: 'The password for the user.',
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