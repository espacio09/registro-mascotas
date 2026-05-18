import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pet } from './entities/pet.entity';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';

@Injectable()
export class PetsService {
  constructor(
    @InjectRepository(Pet)
    private petRepository: Repository<Pet>,
  ) {}

  //  READ ALL
  async findAll() {
    return await this.petRepository.find();
  }

  //  READ ONE
  async findOne(id: number) {
    const pet = await this.petRepository.findOneBy({ id });

    if (!pet) {
      throw new NotFoundException('Pet not found');
    }
    return pet;
  }

  //  UPDATE
  async update(id: number, dto: UpdatePetDto) {
    const pet = await this.findOne(id);
    Object.assign(pet, dto);
    return this.petRepository.save(pet);
  }

  //  CREATE

  async create(createPetDto: CreatePetDto) {
    const pet = this.petRepository.create(createPetDto);
    return this.petRepository.save(pet);
}


  //  DELETE
  async remove(id: number) {
    const pet = await this.findOne(id);
    return await this.petRepository.remove(pet);
  }
}
