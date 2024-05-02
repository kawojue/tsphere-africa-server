import { ApiTags } from '@nestjs/swagger'
import { Controller } from '@nestjs/common'
import { ClientService } from './client.service'

@ApiTags("Client")
@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) { }
}
