import { Controller } from '@nestjs/common'
import { ContactService } from './contact.service'
import { ApiTags } from '@nestjs/swagger'

@ApiTags("Contact")
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) { }
}
