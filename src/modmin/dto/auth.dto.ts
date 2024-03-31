import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class EmailDto {
    @ApiProperty({
        example: 'kawojue08@gmail.com'
    })
    @IsEmail()
    @IsNotEmpty()
    email: string
}

export class RegisterAdminDto extends EmailDto {
    @ApiProperty({
        example: 'Kawojue Raheem'
    })
    @IsNotEmpty()
    @IsString()
    fullName: string

    @ApiProperty({
        example: 'Mypswd123'
    })
    @MaxLength(72, {
        message: 'Password too long'
    })
    @IsNotEmpty()
    @IsString()
    password: string

    @ApiProperty({
        example: 'base64 long string'
    })
    @IsNotEmpty()
    @IsString()
    registrationKey: string
}

export class LoginAdminDto extends EmailDto {
    @ApiProperty({
        example: 'Mypswd123'
    })
    @IsNotEmpty()
    @IsString()
    password: string
}