import { describe,expect,it } from 'vitest';
import { coordinateDraft } from '@/domain/model';
import { toggleCoordinateSign } from '@/components/CoordinateField';

describe('signed coordinate commit and phone sign control',()=>{
  it('commits negative decimals and signed zero without treating them as empty',()=>{
    expect(coordinateDraft('-12.5',-180,180)).toBe(-12.5);
    expect(Object.is(coordinateDraft('-0',-90,90),-0)).toBe(true);
    expect(coordinateDraft('-0.',-90,90)).toBe(-0);
    expect(coordinateDraft(' 0.25 ',-90,90)).toBe(.25);
  });
  it('rejects incomplete, invalid and out-of-range values only when committed',()=>{
    for(const text of ['', '-', '.', '1e2', '<b>1</b>','NaN','Infinity','1,2','--2']) {
      expect(()=>coordinateDraft(text,-90,90)).toThrow(/complete/);
    }
    expect(()=>coordinateDraft('-91',-90,90)).toThrow(/between/);
    expect(()=>coordinateDraft('181',-180,180)).toThrow(/between/);
  });
  it('changes sign without converting or erasing intermediate drafts',()=>{
    expect(toggleCoordinateSign('')).toBe('-');
    expect(toggleCoordinateSign('-')).toBe('');
    expect(toggleCoordinateSign('0.')).toBe('-0.');
    expect(toggleCoordinateSign('-0.')).toBe('0.');
    expect(toggleCoordinateSign('12.5')).toBe('-12.5');
    expect(toggleCoordinateSign('-12.5')).toBe('12.5');
  });
});
