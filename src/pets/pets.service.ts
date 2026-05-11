import { Injectable } from '@nestjs/common';
import { CreatePetDto } from './dto/create-pet.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { constructor } from 'path/win32';


constructor(
@InjectRepository(Pet)
private petRepository: Repository<Pet>,
) {}

type Pet = {
  id: number;
  [key: string]: unknown;
};

type CreatePetDto = Omit<Pet, 'id'>;

type UpdatePetDto = Partial<Omit<Pet, 'id'>>;

@Injectable()
export class PetsService {
  private pets: Pet[] = [];

  findAll(): Pet[] {
    return this.pets;
  }

  findOne(id: number): Pet | undefined {
    return this.pets.find((p) => p.id === id);
  }

  create(pet: CreatePetDto): Pet {
    const newPet: Pet = {
      id: this.pets.length + 1,
      ...pet,
    };
    this.pets.push(newPet);
    return newPet;
  }

  update(id: number, updatePet: UpdatePetDto): Pet | undefined {
    const pet = this.findOne(id);
    if (pet) {
      Object.assign(pet, updatePet);
    }
    return pet;
  }

  remove(id: number): Pet | null {
    const index = this.pets.findIndex((p) => p.id === id);
    if (index !== -1) {
      const [removed] = this.pets.splice(index, 1);
      return removed;
    }
    return null;
  }
}




