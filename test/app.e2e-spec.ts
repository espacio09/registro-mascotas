import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { OwnersController } from '../src/owners/owners.controller';
import { OwnersService } from '../src/owners/owners.service';
import { PetsController } from '../src/pets/pets.controller';
import { PetsService } from '../src/pets/pets.service';

describe('HTTP API integration (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const petsServiceMock = {
      findAll: jest.fn().mockResolvedValue([
        {
          pet_id: 10,
          pet_name: 'Nala',
          pet_type_id: 1,
          breed_id: 2,
          birthdate: '2021-02-03',
          owner_id: 7,
          color: 'white',
          sex: 'female',
          microchip_no: 123456,
          weight: 12,
          ownerId: 7,
        },
      ]),
      createPet: jest.fn().mockResolvedValue({
        pet_id: 12,
        pet_name: 'Luna',
        pet_type_id: 1,
        breed_id: 2,
        birthdate: '2022-05-10',
        owner_id: 7,
        color: 'black',
        sex: 'female',
        microchip_no: 654321,
        weight: 8,
        ownerId: 7,
      }),
      updatePet: jest.fn().mockResolvedValue({
        pet_id: 10,
        pet_name: 'Nala Updated',
        pet_type_id: 1,
        breed_id: 2,
        birthdate: '2022-06-15',
        owner_id: 9,
        color: 'gold',
        sex: 'male',
        microchip_no: 999888,
        weight: 15,
        ownerId: 9,
      }),
    };

    const ownersServiceMock = {
      findAll: jest.fn().mockResolvedValue([
        {
          owner_id: 7,
          first_name: 'Ana',
          last_name: 'García',
          email: 'ana@test.com',
          phone: '123456789',
          pets: [],
        },
      ]),
      findOne: jest.fn().mockResolvedValue({
        owner_id: 7,
        first_name: 'Ana',
        last_name: 'García',
        email: 'ana@test.com',
        phone: '123456789',
        pets: [],
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PetsController, OwnersController],
      providers: [
        { provide: PetsService, useValue: petsServiceMock },
        { provide: OwnersService, useValue: ownersServiceMock },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/pets (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/pets');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pet_id: 10,
          pet_name: 'Nala',
          owner_id: 7,
          ownerId: 7,
        }),
      ]),
    );
  });

  it('/owners (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/owners');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          owner_id: 7,
          first_name: 'Ana',
          last_name: 'García',
        }),
      ]),
    );
  });

  it('/owners/:id (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/owners/7');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        owner_id: 7,
        first_name: 'Ana',
        last_name: 'García',
      }),
    );
  });

  it('/pets (POST)', async () => {
    const response = await request(app.getHttpServer())
      .post('/pets')
      .send({
        pet_name: 'Luna',
        pet_typeId: 1,
        breed_id: 2,
        birthdate: '2022-05-10',
        ownerId: 7,
        color: 'black',
        sex: 'female',
        microchip_no: 654321,
        weight: 8,
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        pet_name: 'Luna',
        owner_id: 7,
        ownerId: 7,
      }),
    );
  });

  it('/pets/:id (PATCH)', async () => {
    const response = await request(app.getHttpServer())
      .patch('/pets/10')
      .send({
        pet_name: 'Nala Updated',
        color: 'gold',
        sex: 'male',
        weight: 15,
        birthdate: '2022-06-15',
        ownerId: 9,
        microchip_no: 999888,
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        pet_name: 'Nala Updated',
        color: 'gold',
        sex: 'male',
        owner_id: 9,
        ownerId: 9,
      }),
    );
  });
});
