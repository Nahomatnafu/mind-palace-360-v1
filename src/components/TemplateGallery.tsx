'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createFromTemplate, templateSections, templatesFor, type SpaceTemplate } from '@/domain/templates';
import { repository } from '@/storage/repository';
export default function TemplateGallery() {
  const router = useRouter();
  const [chosen, setChosen] = useState<SpaceTemplate | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const nameInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (chosen) nameInput.current?.select(); }, [chosen]);
  useEffect(() => { const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) setChosen(null); }; window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape); }, [busy]);
  function pick(template: SpaceTemplate) { if (busy || !template.available) return; setError(''); setName(template.id === 'own-photos' ? 'My memory palace' : template.title); setDescription(''); setChosen(template); }
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!chosen || busy) return;
    const title = name.trim();
    if (!title) { setError('Give your palace a name.'); return; }
    setBusy(true); setError('');
    try { const palace = createFromTemplate(chosen.id, { title, description: description.trim() }); await repository.save(palace); router.push(`/palace/${palace.id}`); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to create the palace. Please try again.'); setBusy(false); }
  }
  return <main className="gallery">
    <Link href="/" className="back-link">&larr; Your palaces</Link>
    <header><span className="eyebrow">NEW PALACE</span><h1 className="gallery-title">Choose a space</h1><p>Pick a starting room. You can add rooms, memories and connections once you are inside.</p></header>
    {templateSections.map(section => <section key={section.category} className="template-section" aria-labelledby={`section-${section.category}`}>
      <h2 id={`section-${section.category}`}>{section.title}</h2><p>{section.blurb}</p>
      <div className="palace-grid">{templatesFor(section.category).map(template => <button key={template.id} type="button" className="palace-card template-card" disabled={!template.available || busy} onClick={() => pick(template)}>
        <span className="palace-thumb">{template.preview ? <Image src={template.preview} alt="" fill unoptimized sizes="(max-width: 760px) 50vw, 260px"/> : <span className="thumb-empty">{template.available ? 'Your 360 photos' : 'Coming soon'}</span>}</span>
        <span className="palace-name">{template.title}</span>
        <span className="palace-meta">{template.description}</span>
      </button>)}</div>
    </section>)}
    {chosen && <div className="modal-shade" onClick={() => { if (!busy) setChosen(null); }}><form className="editor-panel" role="dialog" aria-modal="true" aria-labelledby="name-title" onClick={e => e.stopPropagation()} onSubmit={e => void create(e)}>
      <button type="button" className="close-button" aria-label="Cancel" disabled={busy} onClick={() => setChosen(null)}>×</button>
      <span className="eyebrow">{chosen.title.toUpperCase()}</span><h2 id="name-title">Name your palace</h2>
      <label>Palace name<input ref={nameInput} value={name} maxLength={200} required autoComplete="off" disabled={busy} onChange={e => setName(e.target.value)}/></label>
      <label>Description <span className="optional">(optional)</span><textarea value={description} maxLength={2000} rows={3} disabled={busy} placeholder="What will you remember here?" onChange={e => setDescription(e.target.value)}/></label>
      {error && <p role="alert" className="gallery-error">{error}</p>}
      <button type="submit" className="primary" disabled={busy}>{busy ? 'Creating…' : 'Create palace'}</button>
      <button type="button" disabled={busy} onClick={() => setChosen(null)}>Cancel</button>
    </form></div>}
  </main>;
}
