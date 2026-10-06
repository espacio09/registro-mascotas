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

import { OwnersService } from './owners.service';

describe('OwnersService', () => {
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

  it('archives owners and their pets before deleting them in one transaction', async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ owner_id: 7 }, { owner_id: 8 }] })
      .mockResolvedValueOnce({ rows: [{ pet_id: 10 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ owner_id: 7 }, { owner_id: 8 }] })
      .mockResolvedValueOnce({ rows: [] });

    const service = new OwnersService();
    const result = await service.removeMany([7, 8]);

    expect(result).toEqual({ deletedOwnerIds: [7, 8] });
    expect(mockClientQuery.mock.calls.map(([query]) => query.trim())).toEqual([
      'BEGIN',
      'SELECT owner_id FROM owners WHERE owner_id = ANY($1::int[]) FOR UPDATE',
      'SELECT pet_id FROM pets WHERE owner_id = ANY($1::int[]) FOR UPDATE',
      expect.stringContaining('INSERT INTO "archivoOwners"'),
      expect.stringContaining('INSERT INTO "archivoPets"'),
      'DELETE FROM pets WHERE owner_id = ANY($1::int[])',
      'DELETE FROM owners WHERE owner_id = ANY($1::int[]) RETURNING owner_id',
      'COMMIT',
    ]);
    expect(mockClientQuery).toHaveBeenNthCalledWith(4, expect.any(String), [[7, 8]]);
    expect(mockClientQuery).toHaveBeenNthCalledWith(5, expect.any(String), [[7, 8]]);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('rolls back when a selected owner is missing', async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ owner_id: 7 }] })
      .mockResolvedValueOnce({ rows: [] });

    const service = new OwnersService();

    await expect(service.removeMany([7, 8])).rejects.toThrow(
      'Uno o más propietarios ya no existen.',
    );
    expect(mockClientQuery).toHaveBeenLastCalledWith('ROLLBACK');
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });
});
