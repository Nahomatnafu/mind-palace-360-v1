'use client';

import { useId, useState } from 'react';
import { coordinateDraft } from '@/domain/model';

export interface CoordinateFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
}

export function toggleCoordinateSign(draft: string): string {
  return draft.startsWith('-') ? draft.slice(1) : '-' + draft;
}

export function formatCoordinate(value: number): string {
  const rounded = Number(value.toFixed(1));
  return (Object.is(rounded, -0) ? 0 : rounded).toFixed(1);
}

/** The key resets a draft only when its committed external value changes. */
export default function CoordinateField(props: CoordinateFieldProps) {
  return <CoordinateDraftField key={props.value} {...props} />;
}

function CoordinateDraftField({label,value,min,max,onCommit}: CoordinateFieldProps) {
  const [draft,setDraft] = useState(formatCoordinate(value));
  const [error,setError] = useState('');
  const id = useId();
  const apply = () => {
    try {
      const parsed = coordinateDraft(draft,min,max);
      onCommit(parsed);
      setDraft(formatCoordinate(parsed));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Enter a valid coordinate.');
    }
  };
  return (
    <div className="coordinate-field">
      <label htmlFor={id}>{label}</label>
      <div className="coordinate-controls" style={{display:'flex',gap:8,alignItems:'center'}}>
        <input id={id} type="text" inputMode="decimal" autoComplete="off" spellCheck={false}
          value={draft} aria-invalid={Boolean(error)} aria-describedby={id+'-help'}
          style={{minWidth:0,width:'100%',flex:1}}
          onChange={event=>{setDraft(event.target.value);setError('');}}
          onKeyDown={event=>{
            if (event.key==='Enter') {event.preventDefault();apply();}
            if (event.key==='Escape') {setDraft(formatCoordinate(value));setError('');}
          }} />
        <button type="button" aria-label={'Change sign of '+label} title="Change sign"
          onClick={()=>{setDraft(toggleCoordinateSign(draft));setError('');}}>±</button>
        <button type="button" onClick={apply}>Apply</button>
      </div>
      <p id={id+'-help'} style={{fontSize:12,margin:'4px 0'}} role={error ? 'alert' : undefined}>
        {error || 'Range: '+min+' to '+max+'°. Apply to confirm.'}
      </p>
    </div>
  );
}
