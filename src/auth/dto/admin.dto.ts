import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

export class RegisterAdminDto {
    @IsNotEmpty()
    @IsString()
    fullName: string

    @IsNotEmpty()
    @IsString()
    password: string

    @IsNotEmpty()
    @IsString()
    registrationKey: string

    @IsEmail()
    @IsNotEmpty()
    email: string
}

export class LoginAdminDto {
    @IsEmail()
    @IsNotEmpty()
    email: string

    @IsNotEmpty()
    @IsString()
    password: string
}