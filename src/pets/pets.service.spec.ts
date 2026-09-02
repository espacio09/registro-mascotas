const mockQuery = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    query: mockQuery,
  })),
}));

import { PetsService } from './pets.service';

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
});
