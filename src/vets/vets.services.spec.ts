import { NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import type { Repository } from 'typeorm';
import { vi } from 'vitest';
import { VetEntity } from './entities/vet.entity';
import { UpdateVetDto } from './dto/update-vet.dto';
import { VetsServices } from './vets.services';

describe('VetsServices', () => {
  const vetsRepository = {
    find: vi.fn(),
    findOneBy: vi.fn(),
    createQueryBuilder: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
  };
  const queryBuilder = {
    where: vi.fn(),
    andWhere: vi.fn(),
    getOne: vi.fn(),
    select: vi.fn(),
    addSelect: vi.fn(),
    orderBy: vi.fn(),
    getRawMany: vi.fn(),
  };
  let service: VetsServices;

  beforeEach(() => {
    vi.clearAllMocks();
    queryBuilder.where.mockReturnValue(queryBuilder);
    queryBuilder.andWhere.mockReturnValue(queryBuilder);
    queryBuilder.select.mockReturnValue(queryBuilder);
    queryBuilder.addSelect.mockReturnValue(queryBuilder);
    queryBuilder.orderBy.mockReturnValue(queryBuilder);
    queryBuilder.getOne.mockResolvedValue(null);
    vetsRepository.createQueryBuilder.mockReturnValue(queryBuilder);
    service = new VetsServices(
      vetsRepository as unknown as Repository<VetEntity>,
    );
  });

  it('returns all veterinarians from the database in ID order', async () => {
    const vets = [
      { id: 1, firstName: 'Ana' },
      { id: 4, firstName: 'Luca' },
    ];
    queryBuilder.getRawMany.mockResolvedValue(vets);

    await expect(service.findAll()).resolves.toBe(vets);
    expect(vetsRepository.createQueryBuilder).toHaveBeenCalledWith('vet');
    expect(queryBuilder.select).toHaveBeenCalledWith('vet.id', 'id');
    expect(queryBuilder.addSelect).toHaveBeenCalledWith('vet.street', 'street');
    expect(queryBuilder.addSelect).toHaveBeenCalledWith(
      'vet.address',
      'address',
    );
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('vet.id', 'ASC');
    expect(queryBuilder.getRawMany).toHaveBeenCalled();
  });

  it('stores the API phone field in the database phone property when creating a vet', async () => {
    const vet = { id: 4, firstName: 'Luca', phone: '12345' };
    vetsRepository.create.mockReturnValue(vet);
    vetsRepository.save.mockResolvedValue(vet);

    await expect(
      service.create({
        firstName: 'Luca',
        lastName: 'Auer',
        street: 'Main Street 1',
        address: 'Frankfurt',
        email: 'luca@example.com',
        phone: '12345',
      }),
    ).resolves.toBe(vet);
    expect(vetsRepository.create).toHaveBeenCalledWith({
      firstName: 'Luca',
      lastName: 'Auer',
      street: 'Main Street 1',
      address: 'Frankfurt',
      email: 'luca@example.com',
      phone: '12345',
    });
  });

  it('creates a vet without optional street or address', async () => {
    const vet = { id: 5, firstName: 'Ada', email: 'ada@example.com' };
    vetsRepository.create.mockReturnValue(vet);
    vetsRepository.save.mockResolvedValue(vet);

    await expect(
      service.create({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        phone: '12345',
      }),
    ).resolves.toBe(vet);
    expect(vetsRepository.create).toHaveBeenCalledWith({
      firstName: 'Ada',
      lastName: 'Lovelace',
      street: null,
      address: null,
      email: 'ada@example.com',
      phone: '12345',
    });
  });

  it('rejects duplicate email and phone values when creating a vet', async () => {
    queryBuilder.getOne.mockResolvedValueOnce({ id: 2 });

    await expect(
      service.create({
        firstName: 'Luca',
        lastName: 'Auer',
        street: 'Main Street 1',
        address: 'Frankfurt',
        email: 'LUCA@example.com',
        phone: '12345',
      }),
    ).rejects.toThrow('Ya existe un veterinario registrado con este correo electrónico.');
    expect(vetsRepository.save).not.toHaveBeenCalled();

    queryBuilder.getOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 3 });
    await expect(
      service.create({
        firstName: 'Luca',
        lastName: 'Auer',
        street: 'Main Street 1',
        address: 'Frankfurt',
        email: 'luca@example.com',
        phone: '12345',
      }),
    ).rejects.toThrow('Ya existe un veterinario registrado con este teléfono.');
    expect(vetsRepository.save).not.toHaveBeenCalled();
  });

  it('updates and deletes existing database records', async () => {
    const vet = {
      id: 4,
      firstName: 'Luca',
      lastName: 'Auer',
      street: 'Main Street 1',
      address: 'Frankfurt',
      email: 'luca@example.com',
      phone: '12345',
    };
    vetsRepository.findOneBy.mockResolvedValue(vet);
    vetsRepository.save.mockResolvedValue(vet);
    vetsRepository.remove.mockResolvedValue(vet);

    await service.update(4, {
      phone: '67890',
      street: 'New Street 9',
      address: 'Berlin',
    });
    expect(vet.phone).toBe('67890');
    expect(vet.street).toBe('New Street 9');
    expect(vet.address).toBe('Berlin');
    expect(vetsRepository.save).toHaveBeenCalledWith(vet);

    await expect(service.remove(4)).resolves.toBe(vet);
    expect(vetsRepository.remove).toHaveBeenCalledWith(vet);
  });

  it('reports a missing veterinarian', async () => {
    vetsRepository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne(99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('accepts street and address in a partial update DTO', async () => {
    const dto = Object.assign(new UpdateVetDto(), {
      street: 'Main Street 1',
      address: 'Frankfurt',
      phone: '12345',
    });

    await expect(
      validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).resolves.toHaveLength(0);
  });
});
