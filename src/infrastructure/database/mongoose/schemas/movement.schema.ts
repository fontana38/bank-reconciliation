import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MovementDocument = HydratedDocument<MovementSchema>;

@Schema({
  timestamps: true,
  collection: 'movements',
})
export class MovementSchema {
  @Prop({ required: true })
  source!: 'bank' | 'system';

  @Prop()
  company?: string;

  @Prop({ required: true })
  date!: Date;

  @Prop()
  documentDate?: Date;

  @Prop()
  conciliationDate?: Date;

  @Prop()
  clientOrProvider?: string;

  @Prop()
  document?: string;

  @Prop()
  number?: string;

  @Prop()
  currency?: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  amount!: number;

  @Prop({ required: true, default: 'PENDING' })
  status!: string;
}

export const MovementMongoSchema =
  SchemaFactory.createForClass(MovementSchema);