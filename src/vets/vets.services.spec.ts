import { NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { getMetadataArgsStorage, type Repository } from 'typeorm';
import { vi } from 'vitest';
import { VetEntity } from './entities/vet.entity';
import { CreateVetDto } from './dto/create-vet.dto';
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

  it('maps the API phone property to the phone_number database column', () => {
    const phoneColumn = getMetadataArgsStorage().columns.find(
      (column) =>
        column.target === VetEntity && column.propertyName === 'phone',
    );

    expect(phoneColumn?.options.name).toBe('phone_number');
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
      'vet.houseNumber',
      'houseNumber',
    );
    expect(queryBuilder.addSelect).toHaveBeenCalledWith(
      'vet.postalCode',
      'postalCode',
    );
    expect(queryBuilder.addSelect).toHaveBeenCalledWith('vet.city', 'city');
    expect(queryBuilder.addSelect).toHaveBeenCalledWith(
      'vet.country',
      'country',
    );
    expect(queryBuilder.addSelect).toHaveBeenCalledWith(
      'vet.phoneCountryCode',
      'phoneCountryCode',
    );
    expect(queryBuilder.addSelect).toHaveBeenCalledWith('vet.phone', 'phone');
    expect(queryBuilder.addSelect).toHaveBeenCalledWith('vet.email', 'email');
    expect(queryBuilder.addSelect).toHaveBeenCalledWith(
      'vet.specialization',
      'specialization',
    );
    expect(queryBuilder.addSelect).toHaveBeenCalledWith('vet.notes', 'notes');
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
        street: 'Main Street',
        houseNumber: '1',
        postalCode: '60311',
        city: 'Frankfurt',
        email: 'luca@example.com',
        phone: '12345',
      }),
    ).resolves.toBe(vet);
    expect(vetsRepository.create).toHaveBeenCalledWith({
      firstName: 'Luca',
      lastName: 'Auer',
      street: 'Main Street',
      houseNumber: '1',
      postalCode: '60311',
      city: 'Frankfurt',
      country: null,
      phoneCountryCode: null,
      specialization: null,
      notes: null,
      email: 'luca@example.com',
      phone: '12345',
    });
  });

  it('creates a vet without optional address fields', async () => {
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
      houseNumber: null,
      postalCode: null,
      city: null,
      country: null,
      phoneCountryCode: null,
      specialization: null,
      notes: null,
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
        street: 'Main Street',
        houseNumber: '1',
        postalCode: '60311',
        city: 'Frankfurt',
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
        street: 'Main Street',
        houseNumber: '1',
        postalCode: '60311',
        city: 'Frankfurt',
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
      street: 'Main Street',
      houseNumber: '1',
      postalCode: '60311',
      city: 'Frankfurt',
      email: 'luca@example.com',
      phone: '12345',
    };
    vetsRepository.findOneBy.mockResolvedValue(vet);
    vetsRepository.save.mockResolvedValue(vet);
    vetsRepository.remove.mockResolvedValue(vet);

    await service.update(4, {
      phone: '67890',
      street: 'New Street',
      houseNumber: '9',
      postalCode: '10115',
      city: 'Berlin',
      country: 'Germany',
      phoneCountryCode: '+49',
      specialization: 'Cardiology',
      notes: 'Available on weekends',
    });
    expect(vet.phone).toBe('67890');
    expect(vet.street).toBe('New Street');
    expect(vet.houseNumber).toBe('9');
    expect(vet.postalCode).toBe('10115');
    expect(vet.city).toBe('Berlin');
    expect(vet.country).toBe('Germany');
    expect(vet.phoneCountryCode).toBe('+49');
    expect(vet.specialization).toBe('Cardiology');
    expect(vet.notes).toBe('Available on weekends');
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

  it('accepts optional profile fields in a partial update DTO', async () => {
    const dto = Object.assign(new UpdateVetDto(), {
      street: 'Main Street',
      houseNumber: '1',
      postalCode: '60311',
      city: 'Frankfurt',
      country: 'Germany',
      phoneCountryCode: '',
      specialization: '',
      notes: '',
      phone: '12345',
    });

    await expect(
      validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).resolves.toHaveLength(0);
  });

  it('requires a country when creating a vet', async () => {
    const dto = Object.assign(new CreateVetDto(), {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: '12345',
    });

    await expect(
      validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'country' }),
      ]),
    );

    Object.assign(dto, {
      country: 'Germany',
      phoneCountryCode: '+49',
      specialization: 'Cardiology',
      notes: 'Available on weekends',
    });
    await expect(
      validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).resolves.toHaveLength(0);
  });
});
