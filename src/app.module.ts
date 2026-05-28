

import { Module } from '@nestjs/common';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';

@Module({
  imports: [ReconciliationModule],
})
export class AppModule {}