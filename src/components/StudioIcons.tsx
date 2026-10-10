import type { CSSProperties } from 'react';
const paths = {
 chevron:'m7 10 5 5 5-5', plus:'M12 5v14M5 12h14', minus:'M5 12h14',
 rooms:'M3 10 12 3l9 7v11h-7v-7h-4v7H3z',
 link:'m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l1-1a4 4 0 1 1 6 6l-4 4a4 4 0 0 1-6 0',
 move:'M12 3v18M3 12h18m-12-6 3-3 3 3m-6 12 3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3',
 sliders:'M4 7h9m4 0h3M4 17h3m4 0h9M13 4v6M7 14v6',
 upload:'M12 16V3m-4 4 4-4 4 4M4 15v5h16v-5',
 arrow:'M5 12h14m-5-5 5 5-5 5',
 spark:'m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z',
 phone:'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2m2 16h4',
} as const;
export function StudioIcon({name,style}:{name:keyof typeof paths;style?:CSSProperties}) {return <svg className="studio-icon" style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;}
export function PalaceMark(){return <svg className="palace-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true"><rect width="40" height="40" rx="12" fill="#cdbaff"/><path d="M10 30V18a10 10 0 0 1 20 0v12h-6V18a4 4 0 0 0-8 0v12z" fill="#292137"/><path d="M18 30h4" stroke="#292137" strokeWidth="2" strokeLinecap="round"/><circle cx="29.5" cy="9.5" r="3.5" fill="#fffaf2"/></svg>;}
