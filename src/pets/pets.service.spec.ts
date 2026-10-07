const mockQuery = jest.fn();
const mockClientQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    query: mockQuery,
    connect: mockConnect,
  })),
}));

import { PetsService } from './pets.service';
import { BadRequestException } from '@nestjs/common';
import { CreatePetDto } from './dto/create-pet.dto';

describe('PetsService', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockClientQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockReset();
    mockConnect.mockResolvedValue({
      query: mockClientQuery,
      release: mockRelease,
    });
  });

  it('maps owner_id from the DB to ownerId in the API contract', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          pet_id: 10,
          pet_name: 'Nala',
          pet_type_id: 1,
          breed_id: 2,
          birthdate: '2021-02-03',
          owner_id: 7,
          color: 'white',
          sex: 'female',
          microchip_no: 123456,
          weight: 12,
        },
      ],
    });

    const service = new PetsService();
    const result = await service.findAll();

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM archivo_pets archived'),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      pet_id: 10,
      owner_id: 7,
      ownerId: 7,
      pet_name: 'Nala',
    });
  });

  it('creates an owner from owner_name before creating the pet', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ owner_id: 12 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ breed_id: 9 }] })
      .mockResolvedValueOnce({
        rows: [{ pet_id: 20, owner_id: 12, breed_id: 9, pet_name: 'Nala' }],
      });

    const service = new PetsService();
    const result = await service.createPet({
      pet_name: 'Nala',
      owner_name: 'Luca Maria Auer',
      breed_name: 'Labrador',
      color: 'white',
      sex: 'female',
      birthdate: new Date('2021-02-03'),
      pet_typeId: 1,
    });

    expect(result).toMatchObject({
      pet_id: 20,
      owner_id: 12,
      ownerId: 12,
      breed_id: 9,
    });
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO owners'),
      ['Luca Maria', 'Auer'],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO breeds'),
      [1, 'Labrador'],
    );
  });

  it('rejects an empty owner name', async () => {
    const service = new PetsService();

    await expect(
      service.createPet({ owner_name: '   ' } as CreatePetDto),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects an owner name without a last name', async () => {
    const service = new PetsService();

    await expect(
      service.createPet({ owner_name: 'Thomas' } as CreatePetDto),
    ).rejects.toThrow('Owner last name cannot be empty');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects updating an owner name without a last name', async () => {
    const service = new PetsService();

    await expect(
      service.updatePet(10, { owner_name: 'Thomas' }),
    ).rejects.toThrow('Owner last name cannot be empty');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('updates an existing owner by name without requiring a birthdate', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ owner_id: 7 }] })
      .mockResolvedValueOnce({
        rows: [{ pet_id: 10, owner_id: 7, pet_name: 'Nala' }],
      });

    const service = new PetsService();
    const result = await service.updatePet(10, {
      owner_name: 'Luca Maria Auer',
    });

    expect(result).toMatchObject({
      pet_id: 10,
      owner_id: 7,
      ownerId: 7,
    });
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM owners'),
      ['Luca Maria', 'Auer'],
    );
  });

  it('archives a pet before removing it from the active pets table', async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ pet_id: 10 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ pet_id: 10 }] })
      .mockResolvedValueOnce({ rows: [] });

    const service = new PetsService();
    const result = await service.removePet(10);

    expect(result).toEqual({ message: 'Mascota archivada y eliminada.' });
    expect(mockClientQuery.mock.calls.map(([query]) => query.trim())).toEqual([
      'BEGIN',
      'SELECT pet_id FROM pets WHERE pet_id = $1 FOR UPDATE',
      expect.stringContaining('INSERT INTO archivo_pets'),
      'DELETE FROM pets WHERE pet_id = $1 RETURNING pet_id',
      'COMMIT',
    ]);
    expect(mockClientQuery).toHaveBeenNthCalledWith(3, expect.any(String), [10]);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('reports missing archive permissions and rolls back pet deletion', async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ pet_id: 10 }] })
      .mockRejectedValueOnce({
        code: '42501',
        message: 'permission denied for table archivo_pets',
      })
      .mockResolvedValueOnce({ rows: [] });

    const service = new PetsService();

    await expect(service.removePet(10)).rejects.toThrow(
      'El usuario de la aplicación no tiene permisos para archivar mascotas.',
    );
    expect(mockClientQuery).toHaveBeenLastCalledWith('ROLLBACK');
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });
});
