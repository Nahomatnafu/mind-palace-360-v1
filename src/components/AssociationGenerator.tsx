'use client';
import { useEffect, useRef, useState } from 'react';
import type { Asset, Association } from '@/domain/model';
import { importImage } from '@/media/images';
import { parseAssociations, requireAIResponse } from './association-client';
import styles from './AssociationGenerator.module.css';

export interface AssociationGeneratorProps { onImage: (asset: Asset, title: string, note: string) => void; disabled?: boolean }
type Phase = 'idle' | 'suggesting' | 'generating' | 'adding';
interface Generated { asset: Asset; title: string; note: string; url: string }
export function AssociationGenerator({ onImage, disabled = false }: AssociationGeneratorProps) {
  const [concept,setConcept] = useState(''); const [context,setContext] = useState(''); const [code,setCode] = useState('');
  const [suggestions,setSuggestions] = useState<Association[]>([]); const [selected,setSelected] = useState<Association>();
  const [prompt,setPrompt] = useState(''); const [title,setTitle] = useState(''); const [note,setNote] = useState('');
  const [phase,setPhase] = useState<Phase>('idle'); const [error,setError] = useState(''); const [notice,setNotice] = useState('');
  const [generated,setGenerated] = useState<Generated>();
  const controller = useRef<AbortController | undefined>(undefined); const epoch = useRef({value:0}); const active = useRef(false); const mounted = useRef(true);
  const busy = phase !== 'idle';
  useEffect(() => { const operation=epoch.current; mounted.current = true; return () => { mounted.current = false; operation.value++; controller.current?.abort(); }; },[]);
  useEffect(() => () => { if (generated?.url) URL.revokeObjectURL(generated.url); },[generated?.url]);
  function cancel() { epoch.current.value++; controller.current?.abort(); active.current = false; setPhase('idle'); setNotice('Request cancelled. A completed provider request may still incur a charge. Retry only when you choose.'); }
  async function run(kind: 'suggesting' | 'generating') {
    if (active.current || disabled) return;
    if (!code.trim() || (kind === 'suggesting' ? !concept.trim() : !prompt.trim())) { setError('Enter the demo access code and '+(kind === 'suggesting' ? 'a concept.' : 'an image prompt.')); return; }
    active.current = true; const operation = ++epoch.current.value; const aborter = new AbortController(); controller.current = aborter;
    setPhase(kind); setError(''); setNotice('');
    if (kind === 'generating') setGenerated(undefined);
    try {
      const response = await requireAIResponse(await fetch('/api/ai/'+(kind === 'suggesting' ? 'associations' : 'image'), { method:'POST',headers:{'Content-Type':'application/json','x-demo-code':code.trim(),'x-request-id':crypto.randomUUID()},body:JSON.stringify(kind === 'suggesting' ? {concept:concept.trim(),context:context.trim()} : {prompt:prompt.trim()}),signal:aborter.signal }));
      if (operation !== epoch.current.value || !mounted.current) return;
      if (kind === 'suggesting') {
        const next = parseAssociations(await response.json());
        if (operation !== epoch.current.value || !mounted.current) return;
        setSuggestions(next); setSelected(undefined); setGenerated(undefined); setNotice('Choose an association, then generate its image.');
      } else {
        if (!response.headers.get('Content-Type')?.startsWith('image/png')) throw new Error('AI returned an unsupported image. Try uploading your own image.');
        const blob = await response.blob();
        if (!blob.size || blob.size > 3_000_000) throw new Error('AI returned an empty or oversized image.');
        const asset = await importImage(new File([blob],'association.png',{type:'image/png'}),'memory');
        if (operation !== epoch.current.value || !mounted.current) return;
        setGenerated({asset,title:title.trim() || selected?.title || concept.trim(),note:note.trim(),url:URL.createObjectURL(asset.blob)});
        setNotice('Preview ready. Choose Use image to add it to your memory.');
      }
    } catch (failure) { if (operation === epoch.current.value && mounted.current && !aborter.signal.aborted) setError(failure instanceof Error ? failure.message : 'AI could not complete this request. Retry manually.'); }
    finally { if (operation === epoch.current.value && mounted.current) { active.current = false; setPhase('idle'); } }
  }
  async function applyImage() {
    if (!generated || active.current || disabled) return;
    active.current = true; setPhase('adding'); setError('');
    try { await onImage(generated.asset,title.trim() || generated.title,note.trim()); if (mounted.current) { setGenerated(undefined); setNotice('Image added to the memory editor. Place it in your room and save.'); } }
    catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : 'Could not add the image. Your preview is still available.'); }
    finally { active.current = false; if (mounted.current) setPhase('idle'); }
  }
  function choose(item: Association) { setSelected(item); setPrompt(item.prompt); setTitle(item.title); setNote(item.explanation); setGenerated(undefined); setError(''); setNotice('You can edit this association before generating.'); }
  return <section className={styles.panel} aria-label="AI association studio">
    <div className={styles.heading}><strong>Imagine a memory</strong><span>Upload your own image anytime, or create one here.</span></div>
    <label>Concept<input value={concept} onChange={event=>setConcept(event.target.value)} maxLength={200} placeholder="Gold, a name, an idea…" disabled={busy || disabled}/></label>
    <label>Context <span className={styles.optional}>(optional)</span><textarea value={context} onChange={event=>setContext(event.target.value)} maxLength={1500} placeholder="What do you want to remember?" rows={2} disabled={busy || disabled}/></label>
    <label>Demo access code<input type="password" value={code} onChange={event=>setCode(event.target.value)} maxLength={256} autoComplete="off" placeholder="Required for AI" disabled={busy || disabled}/></label>
    <p className={styles.hint}>The code stays in this component’s memory. Only your concept, context, or chosen prompt goes to AI; room photos are not sent.</p>
    <button type="button" onClick={()=>void run('suggesting')} disabled={busy || disabled || !concept.trim() || !code.trim()}>{phase === 'suggesting' ? 'Finding three ideas…' : suggestions.length ? 'Get three new ideas' : 'Suggest three associations'}</button>
    {suggestions.length > 0 && <div className={styles.choices} aria-label="Association suggestions">{suggestions.map(item=><button type="button" key={item.id} aria-pressed={selected?.id === item.id} disabled={busy || disabled} onClick={()=>choose(item)}><strong>{item.title}</strong><span>{item.explanation}</span></button>)}</div>}
    {selected && <div className={styles.editor}>
      <label>Memory title<input value={title} onChange={event=>setTitle(event.target.value)} maxLength={160} disabled={busy || disabled}/></label>
      <label>Image prompt<textarea value={prompt} onChange={event=>setPrompt(event.target.value)} maxLength={2500} rows={3} disabled={busy || disabled}/></label>
      <label>Note<textarea value={note} onChange={event=>setNote(event.target.value)} maxLength={10000} rows={3} disabled={busy || disabled}/></label>
      <button type="button" onClick={()=>void run('generating')} disabled={busy || disabled || !prompt.trim() || !code.trim()}>{phase === 'generating' ? 'Creating your image…' : generated ? 'Generate a replacement' : 'Generate one image'}</button>
      <p className={styles.hint}>Generation uses paid credits. Every generation and retry requires your action.</p>
    </div>}
    {(phase === 'suggesting' || phase === 'generating') && <button type="button" className={styles.secondary} onClick={cancel}>Cancel request</button>}
    {generated && <div className={styles.preview}>
      {/* A temporary, validated image Blob; rendering needs no HTML content. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={generated.url} alt={generated.title} width={144} height={144}/>
      <button type="button" disabled={busy || disabled} onClick={()=>void applyImage()}>{phase === 'adding' ? 'Adding image…' : 'Use image'}</button>
    </div>}
    {busy && <p role="status">{phase === 'generating' ? 'Generating may take a minute or two. Keep this panel open.' : phase === 'suggesting' ? 'Looking for memorable visual associations.' : 'Preparing your memory image.'}</p>}
    {notice && <p role="status" className={styles.hint}>{notice}</p>}
    {error && <p role="alert" className={styles.error}>{error} Use the action above to retry; requests are never retried automatically.</p>}
  </section>;
}

export default AssociationGenerator;
