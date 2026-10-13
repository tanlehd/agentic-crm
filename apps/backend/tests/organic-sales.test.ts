import { describe,it,expect } from 'vitest';
import { dealAmount,dealCurrency } from '../src/modules/sales/deals.js';
import { moneyUnits,moneyString,reportPeriod } from '../src/modules/sales/organic-report.js';
describe('organic Sales money and reporting boundaries',()=>{
 it('preserves maximum DECIMAL precision and rejects float/exponent/overflow',()=>{
  expect(dealAmount('99999999999999.999999')).toBe('99999999999999.999999');
  expect(moneyString(moneyUnits('99999999999999.999999')+moneyUnits('0.000001'))).toBe('100000000000000.000000');
  for(const value of [0.1,'1e6','-1','100000000000000','0.0000001','NaN'])expect(()=>dealAmount(value)).toThrow();
  expect(dealCurrency('VND')).toBe('VND');expect(()=>dealCurrency('vnd')).toThrow();
 });
 it('requires real UTC dates, increasing bounded half-open range and no extra fields',()=>{
  const from='2026-10-01T00:00:00Z',to='2026-11-01T00:00:00Z';expect(reportPeriod({from,to}).from.toISOString()).toBe('2026-10-01T00:00:00.000Z');
  for(const input of [{from:to,to:from},{from,to:from},{from:'2026-02-30T00:00:00Z',to},{from:'2024-01-01T00:00:00Z',to},{from,to,tenant_id:'spoof'}])expect(()=>reportPeriod(input)).toThrow();
 });
});
