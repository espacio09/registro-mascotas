import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateVetDto } from './dto/create-vet.dto';
import { UpdateVetDto } from './dto/update-vet.dto';

export interface Vet {
  id: number;
  name?: string;
  specialty?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  email?: string;
  phoneNumber?: string;
}

@Injectable()
export class VetsServices {
  private vets: Vet[] = [
    { id: 1, name: 'Dr. Willems', specialty: 'General Practice' },
    { id: 2, name: 'Dr. Johnson', specialty: 'Allergy' },
    { id: 3, name: 'Dr. Norton', specialty: 'Surgery' },
  ];

  findAll() {
    return this.vets;
  }

  findOne(id: number) {
    return this.vets.find((vet) => vet.id === id);
  }

  create(createVetDto: CreateVetDto) {
    const id = Math.max(0, ...this.vets.map((vet) => vet.id)) + 1;
    const vet: Vet = { id, ...createVetDto };
    this.vets.push(vet);
    return vet;
  }

  update(id: number, updateVetDto: UpdateVetDto) {
    const vetIndex = this.vets.findIndex((vet) => vet.id === id);
    if (vetIndex === -1) {
      throw new NotFoundException(`Veterinario ${id} no encontrado.`);
    }

    this.vets[vetIndex] = { ...this.vets[vetIndex], ...updateVetDto };
    return this.vets[vetIndex];
  }

  remove(id: number) {
    const vetIndex = this.vets.findIndex((vet) => vet.id === id);
    if (vetIndex === -1) {
      throw new NotFoundException(`Veterinario ${id} no encontrado.`);
    }

    return this.vets.splice(vetIndex, 1)[0];
  }
}
