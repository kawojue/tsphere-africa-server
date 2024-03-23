import { Controller } from '@nestjs/common'
import { TalentService } from './talent.service'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('Talent')
@Controller('talent')
export class TalentController {
  constructor(private readonly talentService: TalentService) { }
}
