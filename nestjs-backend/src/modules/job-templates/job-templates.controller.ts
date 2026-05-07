import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JobTemplatesService } from './job-templates.service';
import {
  CreateJobTemplateDto,
  UpdateJobTemplateDto,
} from './dto/job-template.dto';

@Controller('job-templates')
@UseGuards(AuthGuard('jwt'))
export class JobTemplatesController {
  constructor(private readonly service: JobTemplatesService) {}

  @Get()
  findMy(@Req() req: any) {
    return this.service.findMy(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(id, req.user.id);
  }

  @Post()
  create(@Body() dto: CreateJobTemplateDto, @Req() req: any) {
    return this.service.create(dto, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateJobTemplateDto,
    @Req() req: any,
  ) {
    return this.service.update(id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.id);
  }

  @Post(':id/instantiate')
  instantiate(@Param('id') id: string, @Req() req: any) {
    return this.service.instantiate(id, req.user.id);
  }
}
