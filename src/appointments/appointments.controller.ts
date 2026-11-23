import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { DeleteAppointmentsDto } from './dto/delete-appointments.dto';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import {
  Appointment,
  AppointmentsService,
  Visit,
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

  @Patch('appointments/:id')
  update(
    @Param('id', ParseIntPipe) appointmentId: number,
    @Body() dto: UpdateAppointmentDto,
  ): Promise<Appointment> {
    return this.appointmentsService.update(appointmentId, dto);
  }

  @Post('appointments/:id/visits')
  createVisit(
    @Param('id', ParseIntPipe) appointmentId: number,
    @Body() dto: CreateVisitDto,
  ): Promise<Visit> {
    return this.appointmentsService.createVisit(appointmentId, dto);
  }

  @Delete('appointments')
  removeMany(@Body() dto: DeleteAppointmentsDto): Promise<void> {
    return this.appointmentsService.removeMany(dto.appointmentIds);
  }

  @Delete('appointments/:id')
  remove(@Param('id', ParseIntPipe) appointmentId: number): Promise<void> {
    return this.appointmentsService.remove(appointmentId);
  }

  @Get('pets/:id/appointments')
  findByPet(@Param('id', ParseIntPipe) petId: number): Promise<Appointment[]> {
    return this.appointmentsService.findByPet(petId);
  }
}
