import { describe, it, expect } from 'vitest';
import { timeErrorsFromApi, timePairIssues, totalFromClocks } from '../../components/flights/flightTimes';

describe('timePairIssues (WP-20 time model)', () => {
  it('K3: take-off and landing alone are a complete flight', () => {
    expect(timePairIssues({ departureTime: '10:00', arrivalTime: '10:12' }, 'airborne')).toEqual([]);
    expect(timePairIssues({ departureTime: '10:00', arrivalTime: '10:12' }, 'block')).toEqual([]);
  });

  it('A1: block times alone are a complete flight', () => {
    expect(timePairIssues({ offBlockTime: '08:00', onBlockTime: '09:00' }, 'block')).toEqual([]);
  });

  it('accepts a lone half beside a complete pair, as the API does', () => {
    expect(timePairIssues({ offBlockTime: '08:00', departureTime: '08:10', arrivalTime: '08:50' }, 'airborne')).toEqual([]);
  });

  it('names the missing partner of a lone half', () => {
    expect(timePairIssues({ departureTime: '10:00' }, 'airborne')).toEqual([
      ['arrivalTime', 'form.timePairMissing.arrivalTime'],
    ]);
    expect(timePairIssues({ onBlockTime: '09:00' }, 'block')).toEqual([
      ['offBlockTime', 'form.timePairMissing.offBlockTime'],
    ]);
  });

  it('asks for the lead pair when no time was entered', () => {
    expect(timePairIssues({}, 'airborne')).toEqual([
      ['departureTime', 'form.timeRequired.departureTime'],
      ['arrivalTime', 'form.timeRequired.arrivalTime'],
    ]);
    expect(timePairIssues({ offBlockTime: '', onBlockTime: '' }, 'block')).toEqual([
      ['offBlockTime', 'form.timeRequired.offBlockTime'],
      ['onBlockTime', 'form.timeRequired.onBlockTime'],
    ]);
  });
});

describe('totalFromClocks', () => {
  it('takes the block span first', () => {
    expect(totalFromClocks({ offBlockTime: '08:00', onBlockTime: '09:30', departureTime: '08:10', arrivalTime: '09:20' }))
      .toEqual({ minutes: 90, source: 'block' });
  });

  it('K3: falls back to take-off to landing', () => {
    expect(totalFromClocks({ departureTime: '10:05', arrivalTime: '10:17' })).toEqual({ minutes: 12, source: 'airborne' });
  });

  it('is null without a complete pair', () => {
    expect(totalFromClocks({ offBlockTime: '08:00', departureTime: '08:10' })).toBeNull();
  });
});

describe('timeErrorsFromApi', () => {
  it('maps the API lone-half message to the missing field', () => {
    const msg = 'incomplete time pair: departureTime requires arrivalTime; a flight needs offBlockTime and onBlockTime, or departureTime and arrivalTime';
    expect(timeErrorsFromApi(msg, 'airborne')).toEqual([['arrivalTime', 'form.timePairMissing.arrivalTime']]);
  });

  it('maps the no-times message to the lead pair', () => {
    const msg = 'offBlockTime and onBlockTime, or departureTime and arrivalTime, are required for a flight';
    expect(timeErrorsFromApi(msg, 'airborne').map(([f]) => f)).toEqual(['departureTime', 'arrivalTime']);
  });

  it('maps unparseable pairs to the fields of that pair', () => {
    expect(timeErrorsFromApi('Invalid take-off/landing times format', 'block').map(([f]) => f)).toEqual(['departureTime', 'arrivalTime']);
    expect(timeErrorsFromApi('Invalid block times format', 'airborne').map(([f]) => f)).toEqual(['offBlockTime', 'onBlockTime']);
  });

  it('leaves other messages alone', () => {
    expect(timeErrorsFromApi('Aircraft registration is required', 'block')).toEqual([]);
  });
});
