export class Movement {
  constructor(
    public source: string,
    public amount: number,
    public date: Date | null,
    public description: string,
    public normalizedDescription: string,
    public status: string,
    public reconciliationId?: string,
    public id?: string,
  ) {}
}