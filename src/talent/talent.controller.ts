import { Controller } from '@nestjs/common'
import { TalentService } from './talent.service'

@Controller('talent')
export class TalentController {
  constructor(private readonly talentService: TalentService) { }
}
