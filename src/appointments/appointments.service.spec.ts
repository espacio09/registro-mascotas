import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppointmentsService } from './appointments.service';

describe('AppointmentsService', () => {
  let query: jest.Mock;
  let transaction: jest.Mock;
  let service: AppointmentsService;

  beforeEach(() => {
    query = jest.fn();
    transaction = jest.fn();
    transaction.mockImplementation((operation) => operation({ query }));
    service = new AppointmentsService({
      query,
      transaction,
    } as unknown as DataSource);
  });

  it('creates an appointment linked to an existing pet and vet', async () => {
    const appointment = {
      appointmentId: 1,
      petId: 15,
      vetId: 3,
      appointmentDate: '2026-11-25T10:00:00.000Z',
      reason: 'Annual vaccination',
      status: 'SCHEDULED',
    };
    query
      .mockResolvedValueOnce([{ pet_id: 15 }])
      .mockResolvedValueOnce([{ vet_id: 3 }])
      .mockResolvedValueOnce([appointment]);

    await expect(
      service.create({
        petId: 15,
        vetId: 3,
        appointmentDate: '2026-11-25T10:00:00',
        reason: ' Annual vaccination ',
        status: 'SCHEDULED',
        notes: 'Bring vaccination records',
      }),
    ).resolves.toEqual(appointment);
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO appointments'),
      [
        15,
        3,
        '2026-11-25T10:00:00',
        'Annual vaccination',
        'SCHEDULED',
        'Bring vaccination records',
      ],
    );
  });

  it('does not create an appointment for a missing pet', async () => {
    query.mockResolvedValueOnce([]);

    await expect(
      service.create({
        petId: 404,
        vetId: 3,
        appointmentDate: '2026-11-25T10:00:00',
        reason: 'Annual vaccination',
        status: 'SCHEDULED',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('rejects a blank reason before querying the database', async () => {
    await expect(
      service.create({
        petId: 15,
        vetId: 3,
        appointmentDate: '2026-11-25T10:00:00',
        reason: '   ',
        status: 'SCHEDULED',
      }),
    ).rejects.toThrow('El motivo de la cita es obligatorio.');
    expect(query).not.toHaveBeenCalled();
  });

  it('updates appointment details', async () => {
    const updatedAppointment = {
      appointmentId: 1,
      petId: 15,
      vetId: 3,
      appointmentDate: '2026-11-25T10:00:00.000Z',
      reason: 'Examinacion defecacion',
      status: 'COMPLETED',
      notes: 'Updated notes',
    };
    query.mockResolvedValueOnce([updatedAppointment]);

    await expect(
      service.update(1, {
        appointmentDate: '2026-11-25T10:00:00.000Z',
        reason: ' Examinacion defecacion ',
        status: 'COMPLETED',
        notes: ' Updated notes ',
      }),
    ).resolves.toEqual(updatedAppointment);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE appointments'),
      [
        '2026-11-25T10:00:00.000Z',
        'Examinacion defecacion',
        'COMPLETED',
        'Updated notes',
        1,
      ],
    );
  });

  it('creates a visit and updates its appointment in one transaction', async () => {
    const visit = {
      visitId: 7,
      appointmentId: 1,
      billingId: null,
      reason: 'Annual check',
      diagnosis: 'Healthy',
      treatment: 'No treatment needed',
      medication: null,
      visitNotes: 'Follow up next year',
      indication: null,
      visitStatus: 'COMPLETED',
    };
    query
      .mockResolvedValueOnce([{ petId: 15, vetId: 3, ownerId: 25 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([visit])
      .mockResolvedValueOnce([{ billingId: 12 }])
      .mockResolvedValueOnce([{ ...visit, billingId: 12 }]);

    await expect(
      service.createVisit(1, {
        appointment: {
          appointmentDate: '2026-11-25T10:00:00.000Z',
          reason: ' Vaccination ',
          status: 'COMPLETED',
          notes: ' Appointment note ',
        },
        reason: ' Annual check ',
        diagnosis: ' Healthy ',
        treatment: ' No treatment needed ',
        visitNotes: ' Follow up next year ',
        visitStatus: 'COMPLETED',
      }),
    ).resolves.toEqual({ ...visit, billingId: 12 });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FOR UPDATE OF appointments'),
      [1],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE appointments'),
      [
        '2026-11-25T10:00:00.000Z',
        'Vaccination',
        'COMPLETED',
        'Appointment note',
        1,
      ],
    );
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO visits'),
      [
        15,
        '2026-11-25T10:00:00.000Z',
        3,
        25,
        1,
        'Annual check',
        'Healthy',
        'No treatment needed',
        null,
        'Follow up next year',
        null,
        'COMPLETED',
        null,
      ],
    );
    expect(query.mock.calls[2][0]).toContain('visit_status');
    expect(query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('INSERT INTO billings'),
      [7],
    );
    expect(query).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining('UPDATE visits'),
      [12, 7],
    );
  });

  it('does not create a visit for a missing appointment', async () => {
    query.mockResolvedValueOnce([]);

    await expect(
      service.createVisit(404, {
        appointment: {
          appointmentDate: '2026-11-25T10:00:00.000Z',
          reason: 'Vaccination',
          status: 'SCHEDULED',
        },
        reason: 'Annual check',
        visitStatus: 'OPEN',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('rejects a blank visit reason before starting a transaction', async () => {
    await expect(
      service.createVisit(1, {
        appointment: {
          appointmentDate: '2026-11-25T10:00:00.000Z',
          reason: 'Vaccination',
          status: 'SCHEDULED',
        },
        reason: '   ',
        visitStatus: 'OPEN',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects a blank update reason', async () => {
    await expect(
      service.update(1, { reason: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects updates without changes', async () => {
    await expect(service.update(1, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('reports when the appointment to update does not exist', async () => {
    query.mockResolvedValueOnce([]);

    await expect(
      service.update(404, { status: 'COMPLETED' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes an existing appointment', async () => {
    query.mockResolvedValueOnce([{ appointment_id: 1 }]);

    await expect(service.remove(1)).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM appointments'),
      [1],
    );
  });

  it('deletes selected appointments in one transaction', async () => {
    query
      .mockResolvedValueOnce([{ appointment_id: 1 }, { appointment_id: 2 }])
      .mockResolvedValueOnce([]);

    await expect(service.removeMany([1, 2])).resolves.toBeUndefined();
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('SELECT appointment_id'),
      [[1, 2]],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('DELETE FROM appointments'),
      [[1, 2]],
    );
  });

  it('does not delete if a selected appointment no longer exists', async () => {
    query.mockResolvedValueOnce([{ appointment_id: 1 }]);

    await expect(service.removeMany([1, 2])).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('reports when the appointment to delete does not exist', async () => {
    query.mockResolvedValueOnce([]);

    await expect(service.remove(404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns the vet name with each pet appointment', async () => {
    const appointments = [{ appointmentId: 1, vet: 'Dr. Smith' }];
    query
      .mockResolvedValueOnce([{ pet_id: 15 }])
      .mockResolvedValueOnce(appointments);

    await expect(service.findByPet(15)).resolves.toEqual(appointments);
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('CONCAT(veterinarians.first_name'),
      [15],
    );
  });

  it('lists appointments with the pet, owner, and veterinarian names', async () => {
    const appointments = [
      {
        appointmentId: 1,
        petName: 'Minnie Mouse',
        ownerName: 'Tatjana Klatyik',
        vet: 'Dr. Smith',
      },
    ];
    query.mockResolvedValueOnce(appointments);

    await expect(service.findAll()).resolves.toEqual(appointments);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('LEFT JOIN owners'),
    );
  });

  it('lists visits with their statuses and patient details', async () => {
    const visits = [
      {
        visitId: 7,
        appointmentId: 1,
        visitDate: '2026-11-25T10:00:00.000Z',
        petId: 15,
        petName: 'Minnie Mouse',
        ownerName: 'Tatjana Klatyik',
        vet: 'Dr. Smith',
        reason: 'Annual check',
        visitStatus: 'FOLLOW_UP_REQUIRED',
      },
    ];
    query.mockResolvedValueOnce(visits);

    await expect(service.findAllVisits()).resolves.toEqual(visits);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('visits.visit_status AS "visitStatus"'),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('LEFT JOIN owners'),
    );
  });

  it('updates clinical visit data without changing linked records', async () => {
    const updated = { visitId: 7, reason: 'Illness', visitStatus: 'COMPLETED' };
    query.mockResolvedValueOnce([updated]);
    await expect(service.updateVisit(7, {
      reason: ' Illness ',
      diagnosis: ' Improved ',
      treatment: '',
      medication: ' ',
      visitNotes: ' Note ',
      indication: '',
      visitStatus: 'COMPLETED',
      followUpDate: '2026-12-10',
    })).resolves.toEqual(updated);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE visits'),
      ['Illness', 'Improved', null, null, 'Note', null, 'COMPLETED', '2026-12-10', 7],
    );
    expect(query.mock.calls[0][0]).not.toContain('appointment_id =');
  });

  it('rejects blank reasons and reports missing visits', async () => {
    const dto = {
      reason: ' ',
      diagnosis: '',
      treatment: '',
      medication: '',
      visitNotes: '',
      indication: '',
      visitStatus: 'OPEN' as const,
      followUpDate: null,
    };
    await expect(service.updateVisit(7, dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
    query.mockResolvedValueOnce([]);
    await expect(service.updateVisit(7, { ...dto, reason: 'Check' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes selected visits atomically after checking they exist', async () => {
    query.mockResolvedValueOnce([{ visit_id: 7 }, { visit_id: 8 }]);

    await service.removeVisits([7, 8, 7]);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FOR UPDATE'),
      [[7, 8]],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      'DELETE FROM visits WHERE visit_id = ANY($1::int[])',
      [[7, 8]],
    );
  });

  it('does not delete any visits when a selected visit no longer exists', async () => {
    query.mockResolvedValueOnce([{ visit_id: 7 }]);

    await expect(service.removeVisits([7, 8])).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('rejects an empty visit selection', async () => {
    await expect(service.removeVisits([])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it('lists all billings with their linked visit details and statuses', async () => {
    const billings = [
      {
        billingId: 12,
        visitId: 7,
        billingStatus: 'IN_PROGRESS',
        petName: 'Minnie Mouse',
        reason: 'Annual check',
      },
    ];
    query.mockResolvedValueOnce(billings);

    await expect(service.findAllBillings()).resolves.toEqual(billings);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('billings.billing_status AS "billingStatus"'),
    );
  });
});
