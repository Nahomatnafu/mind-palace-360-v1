'use client';
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

/** Visible viewport geometry; tracks the on-screen keyboard through window.visualViewport when available. */
interface SheetViewport { top: number; height: number; keyboard: boolean }
const KEYBOARD_THRESHOLD = 120, INITIAL_HEIGHT_RATIO = 0.55, CLOSE_RATIO = 0.3;

function fieldFocused() { const tag = document.activeElement?.tagName; return tag === 'INPUT' || tag === 'TEXTAREA'; }

export function useSheetViewport(): SheetViewport | null {
  const [viewport, setViewport] = useState<SheetViewport | null>(null);
  const initialHeight = useRef(0);
  useEffect(() => {
    initialHeight.current = window.innerHeight;
    const update = () => {
      const layout = document.documentElement.clientHeight || window.innerHeight;
      const vv = window.visualViewport;
      if (!vv) {
        // No visualViewport: fall back to 100dvh math and detect browsers that shrink the layout viewport for the keyboard.
        const shrunk = initialHeight.current - window.innerHeight > KEYBOARD_THRESHOLD && fieldFocused();
        setViewport({ top: 0, height: window.innerHeight, keyboard: shrunk });
        return;
      }
      const keyboard = layout - vv.height > KEYBOARD_THRESHOLD || (initialHeight.current - window.innerHeight > KEYBOARD_THRESHOLD && fieldFocused());
      setViewport({ top: Math.max(0, Math.round(vv.offsetTop)), height: Math.round(vv.height), keyboard });
    };
    update();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', update); vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update); window.addEventListener('focusin', update); window.addEventListener('focusout', update);
    return () => { vv?.removeEventListener('resize', update); vv?.removeEventListener('scroll', update); window.removeEventListener('resize', update); window.removeEventListener('focusin', update); window.removeEventListener('focusout', update); };
  }, []);
  return viewport;
}

interface SheetDialogProps {
  /** id for the heading; also used as aria-labelledby. */
  labelledBy: string;
  title: string;
  eyebrow?: string;
  busy?: boolean;
  cancelLabel?: string;
  onClose: () => void;
  /** When provided the sheet is a form and submits through this handler. */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  /** Pinned to the bottom of the sheet, above the keyboard and the home indicator. */
  footer?: ReactNode;
  children: ReactNode;
}

/** iOS-style bottom sheet: 55% tall initially, full available height when the keyboard opens, drag-down or backdrop tap to close. */
export default function SheetDialog({ labelledBy, title, eyebrow, busy = false, cancelLabel = 'Cancel', onClose, onSubmit, footer, children }: SheetDialogProps) {
  const sheet = useRef<HTMLFormElement>(null);
  const drag = useRef<{ y: number; pointer: number | null }>({ y: 0, pointer: null });
  const [offset, setOffset] = useState(0);
  const viewport = useSheetViewport();
  useEffect(() => { const { overflow } = document.body.style; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = overflow; }; }, []);
  useEffect(() => { const el = sheet.current; if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true }); }, []);
  function dragStart(e: ReactPointerEvent<HTMLElement>) {
    if (busy || e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    drag.current = { y: e.clientY, pointer: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function dragMove(e: ReactPointerEvent<HTMLElement>) { if (drag.current.pointer === e.pointerId) setOffset(Math.max(0, e.clientY - drag.current.y)); }
  function dragEnd(e: ReactPointerEvent<HTMLElement>) {
    if (drag.current.pointer !== e.pointerId) return;
    drag.current.pointer = null;
    const travelled = Math.max(0, e.clientY - drag.current.y), height = sheet.current?.offsetHeight ?? 0;
    setOffset(0);
    if (!busy && height && travelled > height * CLOSE_RATIO) onClose();
  }
  const dragHandlers = { onPointerDown: dragStart, onPointerMove: dragMove, onPointerUp: dragEnd, onPointerCancel: dragEnd };
  const shadeStyle: CSSProperties | undefined = viewport ? { top: viewport.top, height: viewport.height } : undefined;
  const sheetStyle = {
    ...(viewport ? { '--sheet-height': `${viewport.keyboard ? viewport.height : Math.round(viewport.height * INITIAL_HEIGHT_RATIO)}px` } : {}),
    ...(offset ? { transform: `translateY(${offset}px)` } : {}),
  } as CSSProperties;
  return <div className="sheet-shade" style={shadeStyle} onClick={() => { if (!busy) onClose(); }}>
    <form ref={sheet} tabIndex={-1} className={offset ? 'sheet dragging' : 'sheet'} style={sheetStyle} role="dialog" aria-modal="true" aria-labelledby={labelledBy} onClick={e => e.stopPropagation()} onSubmit={e => { if (onSubmit) onSubmit(e); else e.preventDefault(); }}>
      <div className="sheet-grip" aria-hidden="true" {...dragHandlers}><span className="sheet-handle"/></div>
      <header className="sheet-header" {...dragHandlers}>
        <div className="sheet-header-row"><button type="button" className="sheet-cancel" disabled={busy} onClick={onClose}>{cancelLabel}</button></div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 id={labelledBy}>{title}</h2>
      </header>
      <div className="sheet-body">{children}</div>
      {footer && <footer className="sheet-footer">{footer}</footer>}
    </form>
  </div>;
}
