import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pet } from './entities/pet.entity';
import { Owner } from '@owners/entities/owner.entity';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';

@Injectable()
export class PetsService {
  constructor(
    @InjectRepository(Pet)
    private petRepository: Repository<Pet>,

    @InjectRepository(Owner)
    private ownerRepository: Repository<Owner>,
  ) {}

  // READ ALL
  async findAll() {
    return this.petRepository.find({
      relations: ['owner'], // 🔥 opcional pero recomendable
    });
  }

  // READ ONE
  async findOne(id: number) {
    const pet = await this.petRepository.findOne({
      where: { id },
      relations: ['owner'], // 🔥 opcional
    });

    if (!pet) {
      throw new NotFoundException('Pet not found!');
    }

    return pet;
  }

  // CREATE ✅ (ya arreglado)

  async create(dto: CreatePetDto): Promise<Pet> {
    console.log('DTO:', dto);

    const ownerId = Number(dto.ownerId);

    console.log('Parsed ownerId:', ownerId);

    if (isNaN(ownerId)) {
      throw new BadRequestException('ownerId inválido');
    }

    const owner = await this.ownerRepository.findOneBy({});

    console.log('OWNER FOUND:', owner);

    if (!owner) {
      throw new NotFoundException('Owner no existe');
    }
    const pet = this.petRepository.create({
      name: dto.name,
      age: dto.age,
      type: dto.type,
      breed: dto.breed,
      owner,
    });

    return await this.petRepository.save(pet);
  }

  // UPDATE
  async update(id: number, dto: UpdatePetDto): Promise<Pet> {
    const pet = await this.findOne(id);
    Object.assign(pet, dto);
    return this.petRepository.save(pet);
  }

  // DELETE simple (mejorado)
  async remove(id: number): Promise<void> {
    const pet = await this.findOne(id);
    await this.petRepository.remove(pet);
  }
}
