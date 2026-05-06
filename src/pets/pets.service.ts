import { Injectable } from '@nestjs/common';

@Injectable()
export class PetsService {
  private pets = [
    { id: 1, name: 'Minnie', type: 'dog' },
    { id: 2, name: 'Spike', type: 'dog' },
    { id: 3, name: 'Luna', type: 'cat' },
  ];

  findAll() {
    return this.pets;
  }

  findOne(id: number) {
    return this.pets.find((pet) => pet.id === id);
  }
}
