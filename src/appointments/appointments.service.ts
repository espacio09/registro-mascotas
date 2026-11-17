import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

export interface Appointment {
  appointmentId: number;
  petId: number;
  vetId: number;
  appointmentDate: Date | string;
  reason: string;
  status: string;
  notes?: string | null;
  vet?: string;
  petName?: string;
  ownerName?: string | null;
}

@Injectable()
export class AppointmentsService {
  constructor(private readonly dataSource: DataSource) {}

  async create(dto: CreateAppointmentDto): Promise<Appointment> {
    const reason = dto.reason.trim();
    if (!reason) {
      throw new BadRequestException('El motivo de la cita es obligatorio.');
    }

    const petRows: Array<{ pet_id: number }> = await this.dataSource.query(
      'SELECT pet_id FROM pets WHERE pet_id = $1',
      [dto.petId],
    );
    if (petRows.length === 0) {
      throw new NotFoundException(`Mascota ${dto.petId} no encontrada.`);
    }

    const vetRows: Array<{ vet_id: number }> = await this.dataSource.query(
      'SELECT vet_id FROM veterinarians WHERE vet_id = $1',
      [dto.vetId],
    );
    if (vetRows.length === 0) {
      throw new NotFoundException(
        `Veterinario ${dto.vetId} no encontrado.`,
      );
    }

    const appointmentRows: Appointment[] = await this.dataSource.query(
      `
        INSERT INTO appointments (
          pet_id,
          vet_id,
          appointment_date,
          reason,
          status,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          appointment_id AS "appointmentId",
          pet_id AS "petId",
          vet_id AS "vetId",
          appointment_date AS "appointmentDate",
          reason,
          status,
          notes
      `,
      [
        dto.petId,
        dto.vetId,
        dto.appointmentDate,
        reason,
        dto.status,
        dto.notes?.trim() || null,
      ],
    );

    return appointmentRows[0];
  }

  async findByPet(petId: number): Promise<Appointment[]> {
    const petRows: Array<{ pet_id: number }> = await this.dataSource.query(
      'SELECT pet_id FROM pets WHERE pet_id = $1',
      [petId],
    );
    if (petRows.length === 0) {
      throw new NotFoundException(`Mascota ${petId} no encontrada.`);
    }

    return this.dataSource.query(
      `
        SELECT
          appointments.appointment_id AS "appointmentId",
          appointments.pet_id AS "petId",
          appointments.vet_id AS "vetId",
          appointments.appointment_date AS "appointmentDate",
          appointments.reason,
          appointments.status,
          appointments.notes,
          CONCAT(veterinarians.first_name, ' ', veterinarians.last_name) AS vet
        FROM appointments
        INNER JOIN veterinarians
          ON veterinarians.vet_id = appointments.vet_id
        WHERE appointments.pet_id = $1
        ORDER BY appointments.appointment_date ASC, appointments.appointment_id ASC
      `,
      [petId],
    );
  }

  findAll(): Promise<Appointment[]> {
    return this.dataSource.query(
      `
        SELECT
          appointments.appointment_id AS "appointmentId",
          appointments.pet_id AS "petId",
          appointments.vet_id AS "vetId",
          appointments.appointment_date AS "appointmentDate",
          appointments.reason,
          appointments.status,
          appointments.notes,
          CONCAT(veterinarians.first_name, ' ', veterinarians.last_name) AS vet,
          pets.pet_name AS "petName",
          NULLIF(BTRIM(CONCAT(owners.first_name, ' ', owners.last_name)), '') AS "ownerName"
        FROM appointments
        INNER JOIN pets ON pets.pet_id = appointments.pet_id
        INNER JOIN veterinarians
          ON veterinarians.vet_id = appointments.vet_id
        LEFT JOIN owners ON owners.owner_id = pets.owner_id
        ORDER BY appointments.appointment_date ASC, appointments.appointment_id ASC
      `,
    );
  }
}
