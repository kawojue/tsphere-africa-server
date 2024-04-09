import { ApiTags } from '@nestjs/swagger'
import { JobService } from './job.service'
import { Controller } from '@nestjs/common'

@ApiTags("Job")
@Controller('job')
export class JobController {
  constructor(private readonly jobService: JobService) { }
}
