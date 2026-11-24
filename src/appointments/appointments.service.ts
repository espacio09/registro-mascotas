import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';

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
  appointmentId: number | null;
  billingId: number | null;
  reason: string;
  diagnosis: string | null;
  treatment: string | null;
  medication: string | null;
  visitNotes: string | null;
  indication: string | null;
  visitStatus: string;
  followUpDate: string | null;
}

export interface VisitListItem extends Visit {
  visitDate: Date | string;
  petId: number;
  petName: string | null;
  ownerName: string | null;
  vet: string | null;
}

export interface BillingListItem {
  billingId: number;
  visitId: number;
  billingStatus: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
  visitDate: Date | string;
  petName: string | null;
  ownerName: string | null;
  reason: string;
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
            visit_status,
            follow_up_date
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
            visit_status AS "visitStatus",
            follow_up_date AS "followUpDate"
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
          dto.visitStatus,
          dto.followUpDate ?? null,
        ],
      );

      const billingRows: Array<{ billingId: number }> = await manager.query(
        `
          INSERT INTO billings (visit_id, billing_status)
          VALUES ($1, 'OPEN')
          RETURNING billing_id AS "billingId"
        `,
        [visitRows[0].visitId],
      );
      const billingId = billingRows[0].billingId;
      const updatedVisitRows: Visit[] = await manager.query(
        `
          UPDATE visits
          SET billing_id = $1
          WHERE visit_id = $2
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
            visit_status AS "visitStatus",
            follow_up_date AS "followUpDate"
        `,
        [billingId, visitRows[0].visitId],
      );

      return updatedVisitRows[0];
    });
  }

  async updateVisit(visitId: number, dto: UpdateVisitDto): Promise<Visit> {
    const reason = dto.reason.trim();
    if (!reason) {
      throw new BadRequestException('El motivo de la visita es obligatorio.');
    }

    const rows: Visit[] = await this.dataSource.query(
      `
        UPDATE visits
        SET reason = $1, diagnosis = $2, treatment = $3, medication = $4,
            notes = $5, indication = $6, visit_status = $7, follow_up_date = $8
        WHERE visit_id = $9
        RETURNING
          visit_id AS "visitId",
          appointment_id AS "appointmentId",
          billing_id AS "billingId",
          reason, diagnosis, treatment, medication,
          notes AS "visitNotes",
          indication,
          visit_status AS "visitStatus",
          follow_up_date AS "followUpDate"
      `,
      [
        reason,
        dto.diagnosis.trim() || null,
        dto.treatment.trim() || null,
        dto.medication.trim() || null,
        dto.visitNotes.trim() || null,
        dto.indication.trim() || null,
        dto.visitStatus,
        dto.followUpDate,
        visitId,
      ],
    );
    if (rows.length === 0) {
      throw new NotFoundException(`Visita ${visitId} no encontrada.`);
    }
    return rows[0];
  }

  findAllVisits(): Promise<VisitListItem[]> {
    return this.dataSource.query(
      `
        SELECT
          visits.visit_id AS "visitId",
          visits.appointment_id AS "appointmentId",
          visits.billing_id AS "billingId",
          visits.visit_date AS "visitDate",
          visits.pet_id AS "petId",
          pets.pet_name AS "petName",
          NULLIF(BTRIM(CONCAT(owners.first_name, ' ', owners.last_name)), '') AS "ownerName",
          NULLIF(BTRIM(CONCAT(veterinarians.first_name, ' ', veterinarians.last_name)), '') AS vet,
          visits.reason,
          visits.diagnosis,
          visits.treatment,
          visits.medication,
          visits.notes AS "visitNotes",
          visits.indication,
          visits.visit_status AS "visitStatus",
          visits.follow_up_date AS "followUpDate"
        FROM visits
        INNER JOIN pets ON pets.pet_id = visits.pet_id
        LEFT JOIN owners ON owners.owner_id = pets.owner_id
        LEFT JOIN veterinarians ON veterinarians.vet_id = visits.vet_id
        ORDER BY visits.visit_date DESC, visits.visit_id DESC
      `,
    );
  }

  findAllBillings(): Promise<BillingListItem[]> {
    return this.dataSource.query(
      `
        SELECT
          billings.billing_id AS "billingId",
          billings.visit_id AS "visitId",
          billings.billing_status AS "billingStatus",
          visits.visit_date AS "visitDate",
          pets.pet_name AS "petName",
          NULLIF(BTRIM(CONCAT(owners.first_name, ' ', owners.last_name)), '') AS "ownerName",
          visits.reason
        FROM billings
        INNER JOIN visits ON visits.visit_id = billings.visit_id
        INNER JOIN pets ON pets.pet_id = visits.pet_id
        LEFT JOIN owners ON owners.owner_id = pets.owner_id
        ORDER BY billings.billing_id DESC
      `,
    );
  }

  async removeVisits(visitIds: number[]): Promise<void> {
    const uniqueIds = [...new Set(visitIds)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('Selecciona al menos una visita.');
    }

    await this.dataSource.transaction(async (manager) => {
      const existingRows: Array<{ visit_id: number }> = await manager.query(
        'SELECT visit_id FROM visits WHERE visit_id = ANY($1::int[]) FOR UPDATE',
        [uniqueIds],
      );
      if (existingRows.length !== uniqueIds.length) {
        throw new NotFoundException(
          'Una o más visitas seleccionadas ya no existen.',
        );
      }

      await manager.query(
        'DELETE FROM visits WHERE visit_id = ANY($1::int[])',
        [uniqueIds],
      );
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
