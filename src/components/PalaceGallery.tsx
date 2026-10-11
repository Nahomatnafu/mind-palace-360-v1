'use client';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { repository } from '@/storage/repository';
import { previewForModel } from '@/domain/templates';
interface Card { id: string; title: string; description?: string; rooms: number; thumbnail?: string }
const LONG_PRESS_MS = 500, MOVE_TOLERANCE = 10;
export default function PalaceGallery() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [error, setError] = useState('');
  const [armed, setArmed] = useState('');
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
  useEffect(() => { const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) { setArmed(''); setConfirming(null); } }; window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape); }, [busy]);
  function clearPress() { if (press.current.timer) clearTimeout(press.current.timer); press.current.timer = null; }
  function startPress(id: string, e: ReactPointerEvent) {
    if (e.button !== 0 || busy) return;
    clearPress(); press.current = { timer: null, x: e.clientX, y: e.clientY, fired: false };
    press.current.timer = setTimeout(() => { press.current.timer = null; press.current.fired = true; setArmed(id); }, LONG_PRESS_MS);
  }
  function movePress(e: ReactPointerEvent) { if (press.current.timer && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > MOVE_TOLERANCE) clearPress(); }
  function openCard(id: string, e: ReactMouseEvent) {
    // A long press arms the delete badge instead of opening the palace; a plain tap on an armed card just disarms it.
    if (press.current.fired) { e.preventDefault(); press.current.fired = false; return; }
    if (armed === id) { e.preventDefault(); setArmed(''); return; }
    setArmed('');
  }
  async function deletePalace(card: Card) {
    if (busy) return; setBusy(true); setError('');
    try { await repository.remove(card.id); setCards(current => current?.filter(c => c.id !== card.id) ?? null); setConfirming(null); setArmed(''); }
    catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }
  return <main className="gallery" onClick={e => { if (e.target === e.currentTarget) setArmed(''); }}>
    <header><span className="eyebrow">MIND PALACE</span><h1 className="gallery-title">Your Memory Palaces</h1><p>One shared space for you and Aneesha. Open a palace to explore or edit together. Press and hold a palace to delete it for everyone.</p></header>
    {error && <div><p role="alert" className="gallery-error">{error}</p><button className="primary" onClick={()=>{setError('');setRefresh(n=>n+1);}}>Try again</button></div>}
    {cards === null && !error ? <p role="status">Loading your palaces…</p> : <div className="palace-grid">
      {cards?.map(card => <div key={card.id} className={armed === card.id ? 'palace-item armed' : 'palace-item'}>
        <Link href={`/palace/${card.id}`} className="palace-card" draggable={false} onPointerDown={e => startPress(card.id, e)} onPointerMove={movePress} onPointerUp={clearPress} onPointerCancel={clearPress} onPointerLeave={clearPress} onContextMenu={e => { if (press.current.fired || armed === card.id) e.preventDefault(); }} onClick={e => openCard(card.id, e)}>
          <span className="palace-thumb">{card.thumbnail ? <Image src={card.thumbnail} alt="" fill unoptimized draggable={false} sizes="(max-width: 760px) 50vw, 260px"/> : <span className="thumb-empty">No rooms yet</span>}</span>
          <span className="palace-name">{card.title}</span>
          {card.description && <span className="palace-desc">{card.description}</span>}
          <span className="palace-meta">{card.rooms === 1 ? '1 room' : `${card.rooms} rooms`}</span>
        </Link>
        {armed === card.id && <button type="button" className="delete-badge" aria-label={`Delete ${card.title}`} disabled={busy} onClick={() => setConfirming(card)}><span aria-hidden="true"/></button>}
      </div>)}
      <Link href="/new" className="palace-card palace-add" aria-label="Create a new memory palace" onClick={() => setArmed('')}>
        <span className="palace-thumb" aria-hidden="true">+</span>
        <span className="palace-name">{cards?.length ? 'New palace' : 'Create your first memory palace'}</span>
      </Link>
    </div>}
    {confirming && <div className="modal-shade" onClick={() => { if (!busy) setConfirming(null); }}><section className="editor-panel" role="dialog" aria-modal="true" aria-labelledby="delete-title" onClick={e => e.stopPropagation()}>
      <span className="eyebrow">DELETE PALACE</span><h2 id="delete-title">Delete {confirming.title}?</h2>
      <p>Its rooms and memories will be removed from the shared gallery for everyone. Export a ZIP backup from inside the palace first if you want to keep a copy.</p>
      {error && <p role="alert" className="gallery-error">{error}</p>}
      <button type="button" className="danger" disabled={busy} onClick={() => void deletePalace(confirming)}>{busy ? 'Deleting…' : 'Delete palace'}</button>
      <button type="button" disabled={busy} onClick={() => setConfirming(null)}>Cancel</button>
    </section></div>}
  </main>;
}
function message(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
