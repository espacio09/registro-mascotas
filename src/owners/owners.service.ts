import { Injectable } from '@nestjs/common';

@Injectable()
export class OwnersService {
  private owners = [
    { id: 1, name: 'Tatjana', email: 'tatja@example.com' },
    { id: 2, name: 'Sabine', email: 'sabin@example.com' },
    { id: 3, name: 'Luna', email: 'luna@example.com' },
  ];

  findAll() {
    return this.owners;
  }

  findOne(id: number) {
    return this.owners.find((owner) => owner.id === id);
  }
}
