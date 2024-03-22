import { Controller } from '@nestjs/common';
import { CreativeService } from './creative.service';

@Controller('creative')
export class CreativeController {
  constructor(private readonly creativeService: CreativeService) {}
}
