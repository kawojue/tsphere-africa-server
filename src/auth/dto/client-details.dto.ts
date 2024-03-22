import { IsNotEmpty, IsString } from 'class-validator';

export class ClientDetailsDto {
  @IsNotEmpty({ message: 'Company name is required' })
  @IsString()
  readonly company_name: string;

  @IsNotEmpty({ message: 'Street address is required' })
  @IsString()
  readonly street_address: string;

  @IsNotEmpty({ message: 'City is required' })
  @IsString()
  readonly city: string;

  @IsNotEmpty({ message: 'State is required' })
  @IsString()
  readonly state: string;

  @IsNotEmpty({ message: 'Country is required' })
  @IsString()
  readonly country: string;

  @IsNotEmpty({ message: 'Website is required' })
  @IsString()
  readonly website: string;

  @IsNotEmpty({ message: 'Phone is required' })
  @IsString()
  readonly phone: string;
}
