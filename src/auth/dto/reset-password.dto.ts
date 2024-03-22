import { TokenDto } from './auth.dto'
import { TokenEnum } from 'enums/base.enum'
import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class PasswordDto {
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

export class ResetPasswordDto extends PasswordDto {
  @ApiProperty({
    example: 'P@ssw0rd1',
    description: 'Password confirmation for the user.',
  })
  @IsString()
  @IsNotEmpty()
  password2: string
}

export class ResetPasswordTokenDto extends TokenDto {
  @ApiProperty({
    enum: TokenEnum,
    example: 'password'
  })
  @IsEnum(TokenEnum)
  token_type: TokenEnum
}

export class UpdatePasswordDto extends PasswordDto {
  @ApiProperty({
    example: 'sknknvold_password'
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(72)
  oldPassword: string
}