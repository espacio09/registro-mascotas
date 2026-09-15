const mockQuery = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    query: mockQuery,
  })),
}));

import { PetsService } from './pets.service';
import { BadRequestException } from '@nestjs/common';
import { CreatePetDto } from './dto/create-pet.dto';

describe('PetsService', () => {
  beforeEach(() => {
    mockQuery.mockReset();
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
      owner_name: 'Luca Auer',
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
      ['Luca', 'Auer'],
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

  it('updates an existing owner by name without requiring a birthdate', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ owner_id: 7 }] })
      .mockResolvedValueOnce({
        rows: [{ pet_id: 10, owner_id: 7, pet_name: 'Nala' }],
      });

    const service = new PetsService();
    const result = await service.updatePet(10, {
      owner_name: 'Luca Auer',
    });

    expect(result).toMatchObject({
      pet_id: 10,
      owner_id: 7,
      ownerId: 7,
    });
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM owners'),
      ['Luca', 'Auer'],
    );
  });
});
