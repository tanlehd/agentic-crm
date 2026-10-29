import {afterEach,describe,expect,it,vi} from 'vitest';
import type {DataSource} from 'typeorm';
import {UnitOfWork} from '../src/kernel/tenancy/unit-of-work.js';
import {AccessError} from '../src/modules/identity/authorization.js';
import {HumanDispatchEnrollment} from '../src/modules/identity/dispatch-enrollment.js';

describe('native public dispatch enrollment failure boundary',()=>{
 afterEach(()=>vi.restoreAllMocks());
 it('returns a non-retryable denial when native tenant membership is absent',async()=>{
  vi.spyOn(UnitOfWork.prototype,'run').mockRejectedValue(new AccessError('FORBIDDEN'));
  await expect(new HumanDispatchEnrollment({} as DataSource).enroll('synthetic','synthetic')).rejects.toMatchObject({status:403,code:'FORBIDDEN'});
 });
 it('does not disguise infrastructure errors as permission denials',async()=>{
  const outage=new Error('unavailable');vi.spyOn(UnitOfWork.prototype,'run').mockRejectedValue(outage);
  await expect(new HumanDispatchEnrollment({} as DataSource).enroll('synthetic','synthetic')).rejects.toBe(outage);
 });
});
