'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { APARTMENT_STARTER_ID, createFromTemplate, templateSections, templatesFor, type SpaceTemplate } from '@/domain/templates';
import type { Palace } from '@/domain/model';
import { repository } from '@/storage/repository';
import RoomThumbnail from './RoomThumbnail';
export default function TemplateGallery() {
  const router = useRouter();
  const [chosen, setChosen] = useState<SpaceTemplate | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [apartment, setApartment] = useState<Palace | null>(null);
  const [starterError, setStarterError] = useState('');
  const [retry, setRetry] = useState(0);
  const nameInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    repository.load(APARTMENT_STARTER_ID).then(source => {
      if (!source?.rooms.length) throw new Error('The apartment starter is unavailable. Please try again.');
      if (active) setApartment(source);
    }).catch(e => { if (active) setStarterError(e instanceof Error ? e.message : 'Unable to load the apartment starter.'); });
    return () => { active = false; };
  }, [retry]);
  useEffect(() => { if (chosen) nameInput.current?.select(); }, [chosen]);
  useEffect(() => { const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) setChosen(null); }; window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape); }, [busy]);
  function pick(template: SpaceTemplate) { if (busy || !template.available || (template.sourcePalaceId && !apartment)) return; setError(''); setName(template.sourcePalaceId ? 'My Apartment — copy' : template.title); setDescription(''); setChosen(template); }
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!chosen || busy) return;
    const title = name.trim();
    if (!title) { setError('Give your palace a name.'); return; }
    setBusy(true); setError('');
    try { const palace = createFromTemplate(chosen.id, { title, description: description.trim() }, apartment ?? undefined); await repository.save(palace); router.push(`/palace/${palace.id}`); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to create the palace. Please try again.'); setBusy(false); }
  }
  const apartmentCover = apartment?.rooms.find(room => room.id === apartment.startRoomId) ?? apartment?.rooms[0];
  return <main className="gallery">
    <Link href="/" className="back-link">&larr; Your palaces</Link>
    <header><span className="eyebrow">NEW PALACE</span><h1 className="gallery-title">Choose a space</h1><p>Pick a starting room. You can add rooms, memories and connections once you are inside.</p></header>
    {templateSections.map(section => <section key={section.category} className="template-section" aria-labelledby={`section-${section.category}`}>
      <h2 id={`section-${section.category}`}>{section.title}</h2><p>{section.blurb}</p>
      {section.category === 'real' && starterError && <div><p className="gallery-error" role="alert">{starterError}</p><button className="primary" onClick={() => { setStarterError(''); setRetry(n => n + 1); }}>Retry starter</button></div>}
      <div className="palace-grid">{templatesFor(section.category).map(template => <button key={template.id} type="button" className="palace-card template-card" aria-label={template.title} disabled={!template.available || busy || Boolean(template.sourcePalaceId && !apartment)} onClick={() => pick(template)}>
        <span className="palace-thumb">{template.sourcePalaceId && apartmentCover ? <RoomThumbnail assetId={apartmentCover.panoramaAssetId} src={apartmentCover.demoSrc} title="My Apartment preview"/> : template.preview ? <Image src={template.preview} alt="" fill unoptimized sizes="(max-width: 760px) 50vw, 260px"/> : <span className="thumb-empty">{template.sourcePalaceId ? (starterError ? 'Starter unavailable' : 'Loading apartment…') : 'Coming soon'}</span>}</span>
        <span className="palace-name">{template.title}</span>
        {template.sourcePalaceId && apartment && <span className="palace-meta">{apartment.rooms.length} connected rooms · Fresh copy</span>}
        <span className="palace-meta">{template.description}</span>
      </button>)}</div>
      {section.category === 'real' && <aside className="phone-photo-guide"><h3>Bring a familiar place from your phone</h3><p>Capture a full 360° photo with a compatible phone app or 360° camera, then upload the equirectangular JPEG using <strong>Import rooms</strong> inside a palace.</p><p><span className="coming-soon">Coming soon</span> Regular phone panoramas and capture inside the app. A standard camera panorama is only a partial view and is not supported yet.</p></aside>}
    </section>)}
    {chosen && <div className="modal-shade" onClick={() => { if (!busy) setChosen(null); }}><form className="editor-panel" role="dialog" aria-modal="true" aria-labelledby="name-title" onClick={e => e.stopPropagation()} onSubmit={e => void create(e)}>
      <button type="button" className="close-button" aria-label="Cancel" disabled={busy} onClick={() => setChosen(null)}>×</button>
      <span className="eyebrow">{chosen.title.toUpperCase()}</span><h2 id="name-title">Name your palace</h2>
      {chosen.sourcePalaceId && <p>You’ll get the apartment rooms and connections, ready for your own memories. The original tour stays unchanged.</p>}
      <label>Palace name<input ref={nameInput} value={name} maxLength={200} required autoComplete="off" disabled={busy} onChange={e => setName(e.target.value)}/></label>
      <label>Description <span className="optional">(optional)</span><textarea value={description} maxLength={2000} rows={3} disabled={busy} placeholder="What will you remember here?" onChange={e => setDescription(e.target.value)}/></label>
      {error && <p role="alert" className="gallery-error">{error}</p>}
      <button type="submit" className="primary" disabled={busy}>{busy ? 'Creating…' : 'Create palace'}</button>
      <button type="button" disabled={busy} onClick={() => setChosen(null)}>Cancel</button>
    </form></div>}
  </main>;
}
