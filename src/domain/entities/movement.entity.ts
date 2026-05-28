export class Movement {
  constructor(
    public source: 'bank' | 'system',
    public amount: number,
    public date: Date,
    public description: string,
    public normalizedDescription: string,
    public status: string,
    public reconciliationId?: string,
    public id?: string,
  ) {}
}