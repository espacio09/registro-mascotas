const mockQuery = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    query: mockQuery,
  })),
}));

import { OwnersService } from './owners.service';

describe('OwnersService', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('returns owner names in the DB contract expected by the frontend', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          owner_id: 7,
          first_name: 'Ana',
          last_name: 'García',
          email: 'ana@test.com',
          phone: '123456789',
          pets: [],
        },
      ],
    });

    const service = new OwnersService();
    const result = await service.findAll();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      owner_id: 7,
      first_name: 'Ana',
      last_name: 'García',
      email: 'ana@test.com',
    });
  });
});
