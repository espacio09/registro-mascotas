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

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM archivo_owners archived'),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      owner_id: 7,
      first_name: 'Ana',
      last_name: 'García',
      email: 'ana@test.com',
    });
  });

  it('rejects creating an owner with an email already in use', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ owner_id: 7 }] });

    const service = new OwnersService();

    await expect(
      service.create({
        first_name: 'Ana',
        last_name: 'García',
        address: 'Calle 1',
        email: ' ANA@example.com ',
        phone: '123456789',
      }),
    ).rejects.toThrow('Ya existe un propietario registrado con este correo electrónico.');
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('lower(btrim(email)) = lower($1)'),
      ['ANA@example.com'],
    );
  });

  it('reports a duplicate email if another request wins the insert race', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce({
        code: '23505',
        constraint: 'owners_email_unique',
      });

    const service = new OwnersService();

    await expect(
      service.create({
        first_name: 'Ana',
        last_name: 'García',
        address: 'Calle 1',
        email: 'ana@example.com',
        phone: '123456789',
      }),
    ).rejects.toThrow('Ya existe un propietario registrado con este correo electrónico.');
  });

  it('returns a conflict when the database unique owner constraint rejects an exact duplicate', async () => {
    mockQuery.mockRejectedValueOnce({
      code: '23505',
      constraint: 'unique_owner',
    });

    const service = new OwnersService();

    await expect(
      service.create({
        first_name: 'Sabine',
        last_name: 'Ruhland',
        address: 'Calle 1',
        phone: '00491637890',
        confirm_duplicate_name: true,
      }),
    ).rejects.toThrow(
      'Este propietario ya está registrado con el mismo nombre, apellido y teléfono.',
    );
  });

  it('asks for confirmation when the first and last name already exist', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ owner_id: 7 }] });

    const service = new OwnersService();

    await expect(
      service.create({
        first_name: 'Ana',
        last_name: 'García',
        address: 'Calle 1',
        phone: '123456789',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'DUPLICATE_OWNER_NAME',
        message:
          'Ya existe un propietario con el mismo nombre y apellido. Por favor, verifica que sea correcto.',
      },
    });
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('lower(btrim(first_name)) = lower($1)'),
      ['Ana', 'García'],
    );
  });

  it('creates an owner after duplicate-name confirmation', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ owner_id: 8 }] })
      .mockResolvedValueOnce({ rows: [{ owner_id: 8, pets: [] }] });

    const service = new OwnersService();
    const result = await service.create({
      first_name: 'Ana',
      last_name: 'García',
      address: 'Calle 1',
      phone: '123456789',
      confirm_duplicate_name: true,
    });

    expect(result).toMatchObject({ owner_id: 8 });
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('lower(btrim(first_name))'),
      expect.anything(),
    );
  });

  it('archives owners and their pets before deleting them in one transaction', async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ owner_id: 7 }, { owner_id: 8 }] })
      .mockResolvedValueOnce({ rows: [{ pet_id: 10 }] })
      .mockResolvedValueOnce({ rows: [{ owner_id: 7 }, { owner_id: 8 }] })
      .mockResolvedValueOnce({ rows: [{ pet_id: 10 }] })
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
      expect.stringContaining('INSERT INTO archivo_owners'),
      expect.stringContaining('INSERT INTO archivo_pets'),
      'DELETE FROM pets WHERE owner_id = ANY($1::int[])',
      'DELETE FROM owners WHERE owner_id = ANY($1::int[]) RETURNING owner_id',
      'COMMIT',
    ]);
    expect(mockClientQuery).toHaveBeenNthCalledWith(4, expect.any(String), [[7, 8]]);
    expect(mockClientQuery).toHaveBeenNthCalledWith(5, expect.any(String), [[7, 8]]);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('reports which owners were not removed and rolls back the archive', async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ owner_id: 7 }, { owner_id: 8 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ owner_id: 7 }, { owner_id: 8 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ owner_id: 7 }] })
      .mockResolvedValueOnce({ rows: [] });

    const service = new OwnersService();

    await expect(service.removeMany([7, 8])).rejects.toThrow(
      'No se eliminaron los propietarios con ID: 8. La operación se canceló y no se archivó ningún registro.',
    );
    expect(mockClientQuery).toHaveBeenLastCalledWith('ROLLBACK');
  });

  it('rolls back when a selected owner is missing', async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ owner_id: 7 }] })
      .mockResolvedValueOnce({ rows: [] });

    const service = new OwnersService();

    await expect(service.removeMany([7, 8])).rejects.toThrow(
      'No se encontraron los propietarios seleccionados con ID: 8.',
    );
    expect(mockClientQuery).toHaveBeenLastCalledWith('ROLLBACK');
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('reports the required archive migration when archive tables are missing', async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ owner_id: 7 }, { owner_id: 8 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce({
        code: '42P01',
        message: 'relation "archivo_owners" does not exist',
      })
      .mockResolvedValueOnce({ rows: [] });

    const service = new OwnersService();

    await expect(service.removeMany([7, 8])).rejects.toThrow(
      'No se pueden eliminar propietarios porque faltan las tablas archivo_owners o archivo_pets.',
    );
    expect(mockClientQuery).toHaveBeenLastCalledWith('ROLLBACK');
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('reports missing archive table privileges', async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ owner_id: 7 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce({
        code: '42501',
        message: 'permission denied for table archivo_owners',
      })
      .mockResolvedValueOnce({ rows: [] });

    const service = new OwnersService();

    await expect(service.removeMany([7])).rejects.toThrow(
      'El usuario de la aplicación no tiene permisos para archivar propietarios y mascotas.',
    );
    expect(mockClientQuery).toHaveBeenLastCalledWith('ROLLBACK');
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });
});
