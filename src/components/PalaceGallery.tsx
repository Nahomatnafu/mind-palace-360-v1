'use client';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { importPalace } from '@/storage/backup';
import { repository } from '@/storage/repository';
import { previewForModel } from '@/domain/templates';
import SheetDialog from './SheetDialog';
interface Card { id: string; title: string; description?: string; rooms: number; thumbnail?: string }
const LONG_PRESS_MS = 500, MOVE_TOLERANCE = 10, FAB_THRESHOLD = 6;
const THUMB_SIZES = '(max-width: 600px) 50vw, (max-width: 900px) 33vw, 260px';
export default function PalaceGallery() {
  const router=useRouter();
  const backupInput=useRef<HTMLInputElement>(null);
  const importing=useRef(false);
  const [cards, setCards] = useState<Card[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState<Card | null>(null);
  const [busy, setBusy] = useState(false);
  const [refresh,setRefresh]=useState(0);
  const press = useRef<{ timer: ReturnType<typeof setTimeout> | null; x: number; y: number; fired: boolean }>({ timer: null, x: 0, y: 0, fired: false });
  useEffect(() => {
    let cancelled = false; const urls: string[] = [];
    (async () => {
      try {
        const next: Card[] = [];
        for (const summary of await repository.list()) {
          const palace = await repository.load(summary.id);
          const start = palace?.rooms.find(r => r.id === palace.startRoomId) ?? palace?.rooms[0];
          let thumbnail = start?.demoSrc ?? previewForModel(start?.modelSrc);
          if (!thumbnail && start?.panoramaAssetId) { const asset = await repository.asset(start.panoramaAssetId); if (asset && !cancelled) { thumbnail = URL.createObjectURL(asset.blob); urls.push(thumbnail); } }
          next.push({ id: summary.id, title: summary.title, description: palace?.description, rooms: palace?.rooms.length ?? 0, thumbnail });
        }
        if (!cancelled) setCards(next);
      } catch (e) { if (!cancelled) setError(message(e)); }
    })();
    return () => { cancelled = true; urls.forEach(URL.revokeObjectURL); };
  }, [refresh]);
  useEffect(()=>{const onFocus=()=>setRefresh(n=>n+1);window.addEventListener('focus',onFocus);return()=>window.removeEventListener('focus',onFocus);},[]);
  useEffect(() => { const current=press.current;return()=>{if(current.timer)clearTimeout(current.timer);}; }, []);
  useEffect(() => { const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) { setEditing(false); setConfirming(null); } }; window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape); }, [busy]);
  async function restore(file?:File) {
    if(!file || busy || importing.current)return;
    importing.current=true;setBusy(true);setError('');
    try { const palace=await importPalace(file);router.push('/palace/'+encodeURIComponent(palace.id)); }
    catch(error) { setError(message(error)); }
    finally { importing.current=false;setBusy(false);if(backupInput.current)backupInput.current.value=''; }
  }
  function clearPress() { if (press.current.timer) clearTimeout(press.current.timer); press.current.timer = null; }
  function startPress(e: ReactPointerEvent) {
    if (e.button !== 0 || busy || editing) return;
    clearPress(); press.current = { timer: null, x: e.clientX, y: e.clientY, fired: false };
    press.current.timer = setTimeout(() => { press.current.timer = null; press.current.fired = true; setEditing(true); }, LONG_PRESS_MS);
  }
  function movePress(e: ReactPointerEvent) { if (press.current.timer && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > MOVE_TOLERANCE) clearPress(); }
  function openCard(e: ReactMouseEvent) {
    // A long press enters edit mode instead of opening the palace; while editing, taps on cards do nothing until Done.
    if (press.current.fired) { e.preventDefault(); press.current.fired = false; return; }
    if (editing) e.preventDefault();
  }
  async function deletePalace(card: Card) {
    if (busy) return; setBusy(true); setError('');
    try {
      await repository.remove(card.id);
      const remaining = cards?.filter(c => c.id !== card.id) ?? null;
      setCards(remaining); setConfirming(null);
      if (!remaining?.length) setEditing(false);
    }
    catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }
  const showFab = !!cards && cards.length >= FAB_THRESHOLD && !editing;
  return <main className="gallery">
    <header><span className="eyebrow">Mind Palace</span><h1 className="gallery-title">Your Memory Palaces</h1><p>One shared space for you and Aneesha. Open a palace to explore or edit together. Press and hold a palace to delete it for everyone.</p></header>
    <div className="gallery-tools">
      <button type="button" className="gallery-tool" disabled={busy} onClick={()=>{setError('');setRefresh(n=>n+1);}}><RefreshIcon/>Refresh shared space</button>
      <button type="button" className="gallery-tool" disabled={busy} title="Import a tour ZIP into your shared space" onClick={()=>backupInput.current?.click()}><RestoreIcon/>{busy?'Working…':'Restore ZIP'}</button>
    </div>
    <input ref={backupInput} type="file" accept=".zip" hidden aria-label="Restore palace backup" onChange={e=>void restore(e.target.files?.[0])}/>
    {error && !confirming && <p role="alert" className="gallery-error">{error}</p>}
    {editing && <p role="status" className="gallery-sr-only">Edit mode. Tap a red badge to delete that palace, or Done to finish.</p>}
    {cards === null && !error ? <p role="status">Loading your palaces…</p> : <div className={editing ? 'palace-grid editing' : 'palace-grid'}>
      <Link href="/new" className="palace-card palace-add" aria-label="Create a new memory palace" aria-disabled={editing || undefined} tabIndex={editing ? -1 : undefined} onClick={e => { if (editing) e.preventDefault(); }}>
        <span className="palace-thumb" aria-hidden="true"><PlusIcon/></span>
        <span className="palace-text"><span className="palace-name">{cards?.length ? 'New palace' : 'Create your first memory palace'}</span></span>
      </Link>
      {cards?.map(card => <div key={card.id} className="palace-item">
        <Link href={`/palace/${card.id}`} className="palace-card" draggable={false} aria-disabled={editing || undefined} onPointerDown={startPress} onPointerMove={movePress} onPointerUp={clearPress} onPointerCancel={clearPress} onPointerLeave={clearPress} onContextMenu={e => { if (press.current.fired || editing) e.preventDefault(); }} onClick={openCard}>
          <span className="palace-thumb">{card.thumbnail ? <Image src={card.thumbnail} alt="" fill unoptimized draggable={false} sizes={THUMB_SIZES}/> : <span className="thumb-empty">No rooms yet</span>}</span>
          <span className="palace-text">
            <span className="palace-name">{card.title}</span>
            {card.description && <span className="palace-desc">{card.description}</span>}
            <span className="palace-meta">{card.rooms === 1 ? '1 room' : `${card.rooms} rooms`}</span>
          </span>
        </Link>
        {editing && <button type="button" className="delete-badge" aria-label={`Delete ${card.title}`} disabled={busy} onClick={() => { setError(''); setConfirming(card); }}><span aria-hidden="true"/></button>}
      </div>)}
    </div>}
    {showFab && <Link href="/new" className="gallery-fab" aria-label="Create a new memory palace"><PlusIcon/></Link>}
    {editing && <button type="button" className="gallery-done" disabled={busy} onClick={() => setEditing(false)}>Done</button>}
    {confirming && <SheetDialog labelledBy="delete-title" eyebrow="Delete palace" title={`Delete ${confirming.title}?`} busy={busy} onClose={() => setConfirming(null)}
      footer={<button type="button" className="sheet-primary danger" disabled={busy} onClick={() => void deletePalace(confirming)}>{busy ? 'Deleting…' : 'Delete palace'}</button>}>
      <p>Its rooms and memories will be removed from the shared gallery for everyone. Export a ZIP backup from inside the palace first if you want to keep a copy.</p>
      {error && <p role="alert" className="gallery-error">{error}</p>}
    </SheetDialog>}
  </main>;
}
function message(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
function PlusIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>; }
function RefreshIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function RestoreIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4v11m0 0 4-4m-4 4-4-4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
