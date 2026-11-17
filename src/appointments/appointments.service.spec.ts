import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppointmentsService } from './appointments.service';

describe('AppointmentsService', () => {
  let query: jest.Mock;
  let service: AppointmentsService;

  beforeEach(() => {
    query = jest.fn();
    service = new AppointmentsService({ query } as unknown as DataSource);
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
      }),
    ).resolves.toEqual(appointment);
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO appointments'),
      [15, 3, '2026-11-25T10:00:00', 'Annual vaccination', 'SCHEDULED'],
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
});
