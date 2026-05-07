import { Injectable } from '@nestjs/common';

@Injectable()
export class VetsService {
  private vets = [
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
}
