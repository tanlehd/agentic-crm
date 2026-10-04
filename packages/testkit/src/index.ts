/** Synthetic fixtures only; these identifiers are not business data. */
export const fixtureIds = Object.freeze({
  clinicAlpha: '0199aa00-0000-7000-8000-000000000001',
  clinicBeta: '0199aa00-0000-7000-8000-000000000002',
});

export interface Clock { now(): Date }
export class FixedClock implements Clock {
  constructor(private readonly instant: string) {
    if (!Number.isFinite(Date.parse(instant))) throw new Error('Invalid fixture timestamp');
  }
  now(): Date { return new Date(this.instant); }
}
