import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import {
  Appointment,
  AppointmentsService,
} from './appointments.service';

@Controller()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get('appointments')
  findAll(): Promise<Appointment[]> {
    return this.appointmentsService.findAll();
  }

  @Post('appointments')
  create(
    @Body() dto: CreateAppointmentDto,
  ): Promise<Appointment> {
    return this.appointmentsService.create(dto);
  }

  @Get('pets/:id/appointments')
  findByPet(@Param('id', ParseIntPipe) petId: number): Promise<Appointment[]> {
    return this.appointmentsService.findByPet(petId);
  }
}
