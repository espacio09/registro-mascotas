import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

describe('Visits endpoints', () => {
  let app: INestApplication;
  const removeVisits = jest.fn().mockResolvedValue(undefined);
  const updateVisit = jest.fn().mockResolvedValue({ visitId: 7 });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AppointmentsController],
      providers: [
        {
          provide: AppointmentsService,
          useValue: { removeVisits, updateVisit },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('passes valid visit IDs to the service', async () => {
    await request(app.getHttpServer())
      .delete('/visits')
      .send({ visitIds: [7, 8] })
      .expect(200);
    expect(removeVisits).toHaveBeenCalledWith([7, 8]);
  });

  it.each([{ visitIds: [] }, { visitIds: [0] }, { visitIds: ['7'] }])(
    'rejects invalid IDs: %j',
    async (body) => {
      removeVisits.mockClear();
      await request(app.getHttpServer())
        .delete('/visits')
        .send(body)
        .expect(400);
      expect(removeVisits).not.toHaveBeenCalled();
    },
  );

  it('validates and updates clinical details through the API', async () => {
    const payload = {
      reason: 'Consultation',
      diagnosis: '',
      treatment: '',
      medication: '',
      visitNotes: '',
      indication: '',
      visitStatus: 'OPEN',
      followUpDate: null,
    };
    await request(app.getHttpServer())
      .patch('/visits/7')
      .send(payload)
      .expect(200);
    expect(updateVisit).toHaveBeenCalledWith(7, payload);
    updateVisit.mockClear();
    await request(app.getHttpServer())
      .patch('/visits/7')
      .send({ ...payload, visitStatus: 'INVALID' })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/visits/7')
      .send({ ...payload, appointmentId: 12 })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/visits/7')
      .send({ ...payload, followUpDate: '2026-02-30' })
      .expect(400);
    expect(updateVisit).not.toHaveBeenCalled();
  });
});
