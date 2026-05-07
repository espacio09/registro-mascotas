
import { Module } from '@nestjs/common';
import { PetsModule } from './pets/pets.module';
import { OwnersModule } from './owners/owners.module';
import { VetsModule } from './vets/vets.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    PetsModule,
    OwnersModule, 
    VetsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

