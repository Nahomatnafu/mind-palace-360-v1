'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createFromTemplate, templateSections, templatesFor, type SpaceTemplate, type TemplateCategory } from '@/domain/templates';
import { repository } from '@/storage/repository';
import SheetDialog from './SheetDialog';
const CARD_SIZES = '(max-width: 900px) 180px, 25vw';
export default function TemplateGallery() {
  const router = useRouter();
  const [chosen, setChosen] = useState<SpaceTemplate | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Partial<Record<TemplateCategory, boolean>>>({});
  const nameInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (chosen) { nameInput.current?.focus({ preventScroll: true }); nameInput.current?.select(); } }, [chosen]);
  useEffect(() => { const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) setChosen(null); }; window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape); }, [busy]);
  function pick(template: SpaceTemplate) { if (busy || !template.available) return; setError(''); setName(template.id === 'own-photos' ? 'My memory palace' : template.title); setDescription(''); setChosen(template); }
  function close() { if (!busy) setChosen(null); }
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!chosen || busy) return;
    const title = name.trim();
    if (!title) { setError('Give your palace a name.'); nameInput.current?.focus(); return; }
    setBusy(true); setError('');
    try { const palace = createFromTemplate(chosen.id, { title, description: description.trim() }); await repository.save(palace); router.push(`/palace/${palace.id}`); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to create the palace. Please try again.'); setBusy(false); }
  }
  return <main className="gallery">
    <nav className="gallery-topbar" aria-label="Breadcrumb"><Link href="/" className="topbar-back"><ChevronIcon/>Palaces</Link></nav>
    <header><span className="eyebrow">New palace</span><h1 className="gallery-title">Choose a space</h1><p>Pick a starting room. You can add rooms, memories and connections once you are inside.</p></header>
    {templateSections.map(section => {
      const open = !!expanded[section.category], listId = `templates-${section.category}`;
      return <section key={section.category} className="template-section" aria-labelledby={`section-${section.category}`}>
        <div className="template-heading">
          <h2 id={`section-${section.category}`}>{section.title}</h2>
          <button type="button" className="template-seeall" aria-expanded={open} aria-controls={listId} onClick={() => setExpanded(current => ({ ...current, [section.category]: !open }))}>{open ? 'Show less' : 'See all'}</button>
        </div>
        <p>{section.blurb}</p>
        <div id={listId} className={open ? 'template-grid' : 'template-strip'}>{templatesFor(section.category).map(template => <button key={template.id} type="button" className="template-card" disabled={!template.available || busy} aria-label={template.available ? `${template.title}. ${template.description}` : `${template.title}, coming soon`} onClick={() => pick(template)}>
          <span className="template-thumb" aria-hidden="true">{template.preview ? <Image src={template.preview} alt="" fill unoptimized draggable={false} sizes={CARD_SIZES}/> : <span className="thumb-empty">{template.available ? '360°' : 'Coming soon'}</span>}</span>
          <span className="template-scrim" aria-hidden="true"/>
          <span className="template-label" aria-hidden="true"><strong>{template.title}</strong><span>{template.available ? template.description : 'Coming soon'}</span></span>
        </button>)}</div>
      </section>;
    })}
    {chosen && <SheetDialog labelledBy="name-title" eyebrow={chosen.title} title="Name your palace" busy={busy} onClose={close} onSubmit={e => void create(e)}
      footer={<button type="submit" className="sheet-primary" disabled={busy}>{busy ? 'Creating…' : 'Create palace'}</button>}>
      <label>Palace name<input ref={nameInput} value={name} maxLength={200} required autoFocus autoComplete="off" enterKeyHint="done" disabled={busy} aria-invalid={error ? true : undefined} onChange={e => setName(e.target.value)}/></label>
      <label>Description <span className="optional">(optional)</span><textarea value={description} maxLength={2000} rows={3} disabled={busy} placeholder="What will you remember here?" onChange={e => setDescription(e.target.value)}/></label>
      {error && <p role="alert" className="gallery-error">{error}</p>}
    </SheetDialog>}
  </main>;
}
function ChevronIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
