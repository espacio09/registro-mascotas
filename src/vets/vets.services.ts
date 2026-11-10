import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateVetDto } from './dto/create-vet.dto';
import { UpdateVetDto } from './dto/update-vet.dto';
import { VetEntity } from './entities/vet.entity';

const DUPLICATE_VET_EMAIL_MESSAGE =
  'Ya existe un veterinario registrado con este correo electrónico.';
const DUPLICATE_VET_PHONE_MESSAGE =
  'Ya existe un veterinario registrado con este teléfono.';

function isDuplicateVetFieldError(error: unknown, constraint: string): boolean {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('driverError' in error)
  ) {
    return false;
  }

  const driverError = error.driverError;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === '23505' &&
    'constraint' in driverError &&
    driverError.constraint === constraint
  );
}

@Injectable()
export class VetsServices {
  constructor(
    @InjectRepository(VetEntity)
    private readonly vetsRepository: Repository<VetEntity>,
  ) {}

  findAll(): Promise<VetEntity[]> {
    return this.vetsRepository
      .createQueryBuilder('vet')
      .select('vet.id', 'id')
      .addSelect('vet.firstName', 'firstName')
      .addSelect('vet.lastName', 'lastName')
      .addSelect('vet.street', 'street')
      .addSelect('vet.houseNumber', 'houseNumber')
      .addSelect('vet.postalCode', 'postalCode')
      .addSelect('vet.city', 'city')
      .addSelect('vet.phone', 'phone')
      .addSelect('vet.email', 'email')
      .orderBy('vet.id', 'ASC')
      .getRawMany<VetEntity>();
  }

  async findOne(id: number): Promise<VetEntity> {
    const vet = await this.vetsRepository.findOneBy({ id });
    if (!vet) {
      throw new NotFoundException(`Veterinario ${id} no encontrado.`);
    }

    return vet;
  }

  // ✅ Método privado
  private rethrowVetArchiveError(error: unknown): never {
    console.error(error);

    throw new InternalServerErrorException(
      'No se pudo obtener el veterinario.',
      'Error al obtener el veterinario',
    );
  }

  async create(createVetDto: CreateVetDto): Promise<VetEntity> {
    const email = createVetDto.email.trim();
    const phone = createVetDto.phone.trim();
    await this.ensureContactDetailsAreUnique(email, phone);

    const vet = this.vetsRepository.create({
      firstName: createVetDto.firstName,
      lastName: createVetDto.lastName,
      street: createVetDto.street?.trim() || null,
      houseNumber: createVetDto.houseNumber?.trim() || null,
      postalCode: createVetDto.postalCode?.trim() || null,
      city: createVetDto.city?.trim() || null,
      email,
      phone,
    });

    try {
      return await this.vetsRepository.save(vet);
    } catch (error) {
      if (isDuplicateVetFieldError(error, 'veterinarians_email_unique')) {
        throw new ConflictException(DUPLICATE_VET_EMAIL_MESSAGE);
      }
      if (isDuplicateVetFieldError(error, 'veterinarians_phone_unique')) {
        throw new ConflictException(DUPLICATE_VET_PHONE_MESSAGE);
      }
      throw error;
    }
  }

  async update(id: number, updateVetDto: UpdateVetDto): Promise<VetEntity> {
    const vet = await this.findOne(id);
    const email = updateVetDto.email?.trim();
    const phone = updateVetDto.phone?.trim();
    await this.ensureContactDetailsAreUnique(email, phone, id);

    if (updateVetDto.firstName !== undefined) {
      vet.firstName = updateVetDto.firstName;
    }
    if (updateVetDto.lastName !== undefined) {
      vet.lastName = updateVetDto.lastName;
    }
    if (updateVetDto.street !== undefined) {
      vet.street = updateVetDto.street.trim() || null;
    }
    if (updateVetDto.houseNumber !== undefined) {
      vet.houseNumber = updateVetDto.houseNumber.trim() || null;
    }
    if (updateVetDto.postalCode !== undefined) {
      vet.postalCode = updateVetDto.postalCode.trim() || null;
    }
    if (updateVetDto.city !== undefined) {
      vet.city = updateVetDto.city.trim() || null;
    }
    if (updateVetDto.email !== undefined) {
      vet.email = updateVetDto.email.trim();
    }
    if (updateVetDto.phone !== undefined) {
      vet.phone = updateVetDto.phone.trim();
    }

    try {
      return await this.vetsRepository.save(vet);
    } catch (error) {
      if (isDuplicateVetFieldError(error, 'veterinarians_email_unique')) {
        throw new ConflictException(DUPLICATE_VET_EMAIL_MESSAGE);
      }
      if (isDuplicateVetFieldError(error, 'veterinarians_phone_unique')) {
        throw new ConflictException(DUPLICATE_VET_PHONE_MESSAGE);
      }
      throw error;
    }
  }

  private async ensureContactDetailsAreUnique(
    email?: string,
    phone?: string,
    vetId?: number,
  ): Promise<void> {
    if (email) {
      const emailQuery = this.vetsRepository
        .createQueryBuilder('vet')
        .where('LOWER(BTRIM(vet.email)) = LOWER(:email)', { email })
        .andWhere('vet.email IS NOT NULL');
      if (vetId !== undefined) {
        emailQuery.andWhere('vet.id <> :vetId', { vetId });
      }

      if (await emailQuery.getOne()) {
        throw new ConflictException(DUPLICATE_VET_EMAIL_MESSAGE);
      }
    }

    if (phone) {
      const phoneQuery = this.vetsRepository
        .createQueryBuilder('vet')
        .where('BTRIM(vet.phone) = :phone', { phone });
      if (vetId !== undefined) {
        phoneQuery.andWhere('vet.id <> :vetId', { vetId });
      }

      if (await phoneQuery.getOne()) {
        throw new ConflictException(DUPLICATE_VET_PHONE_MESSAGE);
      }
    }
  }

  async remove(id: number): Promise<VetEntity> {
    const vet = await this.findOne(id);
    await this.vetsRepository.remove(vet);
    return vet;
  }
}
