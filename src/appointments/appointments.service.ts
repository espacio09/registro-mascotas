import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

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

export interface Visit {
  visitId: number;
  appointmentId: number;
  billingId: number | null;
  reason: string;
  diagnosis: string | null;
  treatment: string | null;
  medication: string | null;
  visitNotes: string | null;
  indication: string | null;
  status: string;
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

  async update(
    appointmentId: number,
    dto: UpdateAppointmentDto,
  ): Promise<Appointment> {
    const updates: Array<[string, unknown]> = [];

    if (dto.appointmentDate !== undefined) {
      updates.push(['appointment_date', dto.appointmentDate]);
    }

    if (dto.reason !== undefined) {
      const reason = dto.reason.trim();
      if (!reason) {
        throw new BadRequestException('El motivo de la cita es obligatorio.');
      }
      updates.push(['reason', reason]);
    }

    if (dto.status !== undefined) {
      updates.push(['status', dto.status]);
    }

    if (dto.notes !== undefined) {
      updates.push(['notes', dto.notes?.trim() || null]);
    }

    if (updates.length === 0) {
      throw new BadRequestException('No hay cambios para guardar.');
    }

    const assignments = updates.map(
      ([column], index) => `${column} = $${index + 1}`,
    );
    const parameters = updates.map(([, value]) => value);
    parameters.push(appointmentId);
    const appointmentRows: Appointment[] = await this.dataSource.query(
      `
        UPDATE appointments
        SET ${assignments.join(', ')}
        WHERE appointment_id = $${parameters.length}
        RETURNING
          appointment_id AS "appointmentId",
          pet_id AS "petId",
          vet_id AS "vetId",
          appointment_date AS "appointmentDate",
          reason,
          status,
          notes
      `,
      parameters,
    );

    if (appointmentRows.length === 0) {
      throw new NotFoundException(`Cita ${appointmentId} no encontrada.`);
    }

    return appointmentRows[0];
  }

  async createVisit(
    appointmentId: number,
    dto: CreateVisitDto,
  ): Promise<Visit> {
    const appointmentReason = dto.appointment.reason.trim();
    const reason = dto.reason.trim();
    if (!appointmentReason || !reason) {
      throw new BadRequestException(
        'El motivo de la cita y de la visita es obligatorio.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const appointmentRows: Array<{
        petId: number;
        vetId: number;
        ownerId: number | string | null;
      }> = await manager.query(
        `
          SELECT
            appointments.pet_id AS "petId",
            appointments.vet_id AS "vetId",
            pets.owner_id AS "ownerId"
          FROM appointments
          INNER JOIN pets ON pets.pet_id = appointments.pet_id
          WHERE appointments.appointment_id = $1
          FOR UPDATE OF appointments
        `,
        [appointmentId],
      );
      if (appointmentRows.length === 0) {
        throw new NotFoundException(`Cita ${appointmentId} no encontrada.`);
      }

      await manager.query(
        `
          UPDATE appointments
          SET appointment_date = $1, reason = $2, status = $3, notes = $4
          WHERE appointment_id = $5
        `,
        [
          dto.appointment.appointmentDate,
          appointmentReason,
          dto.appointment.status,
          dto.appointment.notes?.trim() || null,
          appointmentId,
        ],
      );

      const visitRows: Visit[] = await manager.query(
        `
          INSERT INTO visits (
            pet_id,
            visit_date,
            vet_id,
            owner_id,
            appointment_id,
            reason,
            diagnosis,
            treatment,
            medication,
            notes,
            indication,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING
            visit_id AS "visitId",
            appointment_id AS "appointmentId",
            billing_id AS "billingId",
            reason,
            diagnosis,
            treatment,
            medication,
            notes AS "visitNotes",
            indication,
            status
        `,
        [
          appointmentRows[0].petId,
          dto.appointment.appointmentDate,
          appointmentRows[0].vetId,
          appointmentRows[0].ownerId,
          appointmentId,
          reason,
          dto.diagnosis?.trim() || null,
          dto.treatment?.trim() || null,
          dto.medication?.trim() || null,
          dto.visitNotes?.trim() || null,
          dto.indication?.trim() || null,
          dto.status,
        ],
      );

      return visitRows[0];
    });
  }

  async remove(appointmentId: number): Promise<void> {
    const deletedRows: Array<{ appointment_id: number }> =
      await this.dataSource.query(
        `
          DELETE FROM appointments
          WHERE appointment_id = $1
          RETURNING appointment_id
        `,
        [appointmentId],
      );

    if (deletedRows.length === 0) {
      throw new NotFoundException(`Cita ${appointmentId} no encontrada.`);
    }
  }

  async removeMany(appointmentIds: number[]): Promise<void> {
    const uniqueIds = [...new Set(appointmentIds)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('Selecciona al menos una cita.');
    }

    await this.dataSource.transaction(async (manager) => {
      const existingRows: Array<{ appointment_id: number }> =
        await manager.query(
          `
            SELECT appointment_id
            FROM appointments
            WHERE appointment_id = ANY($1::int[])
            FOR UPDATE
          `,
          [uniqueIds],
        );

      if (existingRows.length !== uniqueIds.length) {
        throw new NotFoundException(
          'Una o más citas seleccionadas ya no existen.',
        );
      }

      await manager.query(
        'DELETE FROM appointments WHERE appointment_id = ANY($1::int[])',
        [uniqueIds],
      );
    });
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
