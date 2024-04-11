import {
  Body, Controller, Delete, Get, Param,
  Patch, Post, Req, Res, UseGuards, Put,
  Query,
} from '@nestjs/common'
import { Role } from 'src/role.decorator'
import { JobService } from './job.service'
import { PostJobDto } from './dto/job.dto'
import { Request, Response } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { Role as Roles } from '@prisma/client'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { InfiniteScrollDto } from 'src/user/dto/infinite-scroll.dto'

@ApiTags("Job")
@Controller('job')
export class JobController {
  constructor(private readonly jobService: JobService) { }

  @Post('/post')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin, Roles.client)
  async postJob(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: PostJobDto,
  ) {
    return await this.jobService.postJob(res, req.user, body)
  }

  @Delete('/remove/:jobId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin, Roles.client)
  async removeJob(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('jobId') jobId: string,
  ) {
    return await this.jobService.removeJob(res, jobId, req.user)
  }

  @Patch('/approve-job/:jobId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin)
  async approveJob(
    @Res() res: Response,
    @Param('jobId') jobId: string,
  ) {
    return await this.jobService.approveJob(res, jobId)
  }

  @Put('/apply-job/:jobId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.creative, Roles.creative, Roles.user)
  async applyJob(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('jobId') jobId: string,
  ) {
    return await this.jobService.applyJob(res, jobId, req.user)
  }

  @Get('/fetch')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin, Roles.client)
  async fetchJobs(
    @Res() res: Response,
    @Req() req: IRequest,
  ) {
    return await this.jobService.fetchJobs(res, req.user)
  }

  @Get('/job-list')
  async jobList(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: InfiniteScrollDto,
  ) {
    return await this.jobService.jobList(req, res, query)
  }

  @Get('/job-list/:jobId')
  async getJob(@Res() res: Response, @Param('jobId') jobId: string) {
    return await this.jobService.getJob(res, jobId)
  }
}
