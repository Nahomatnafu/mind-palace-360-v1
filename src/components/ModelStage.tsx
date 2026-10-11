'use client';
import { useEffect, useRef, useState } from 'react';
import type { Camera, Vec3 } from '@/domain/model';
import type { ViewerMarker } from '@/viewer/adapter';
import type { ModelViewerAdapter } from '@/viewer/model-adapter';
interface Props { roomKey?: string; src: string; camera: Camera; position?: Vec3; markers: ViewerMarker[]; moveMarkers?: boolean; onMove?(id: string, point: Vec3): void; onSelect(id: string): void; onPlace(point: Vec3, camera: Camera): boolean; onReady?(viewer: ModelViewerAdapter | null, roomKey?: string, src?: string): void }
/** Hosts the three.js walkthrough viewer for rooms backed by a glTF model. */
export default function ModelStage(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const engine = useRef<ModelViewerAdapter | null>(null);
  const latest = useRef(props);
  const [revision, setRevision] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { latest.current = props; });
  useEffect(() => {
    let disposed = false;
    import('@/viewer/model-adapter').then(({ createModelViewer }) => {
      if (disposed || !container.current) return;
      engine.current = createModelViewer(container.current, { select: id => latest.current.onSelect(id), place: (point, camera) => latest.current.onPlace(point, camera), move: (id, point) => latest.current.onMove?.(id, point) });
      setRevision(n => n + 1);
    }).catch(() => setError('The 3D viewer could not start. Check WebGL support and reload.'));
    return () => { disposed = true; latest.current.onReady?.(null); engine.current?.destroy(); engine.current = null; };
  }, []);
  useEffect(() => {
    const viewer = engine.current; if (!viewer) return;
    let cancelled = false;
    latest.current.onReady?.(null); setLoaded(false); setError('');
    viewer.load(props.src, { position: props.position, camera: props.camera }).then(() => { if (!cancelled) { setLoaded(true); viewer.markers(latest.current.markers); latest.current.onReady?.(viewer, props.roomKey, props.src); } }).catch(() => { if (!cancelled) setError('Unable to open this 3D space. Check your connection and try again.'); });
    return () => { cancelled = true; };
  // The saved arrival view is applied on load only; later camera changes must not reload the model.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.src, props.roomKey, revision]);
  useEffect(() => { if (loaded) engine.current?.markers(props.markers); }, [props.markers, loaded]);
  useEffect(() => { engine.current?.editMarkers(Boolean(props.moveMarkers)); }, [props.moveMarkers, revision]);
  return <div className="panorama"><div ref={container} className="model-stage"/>{error ? <div className="viewer-notice" role="alert">{error}<button onClick={() => setRevision(n => n + 1)}>Retry room</button></div> : !loaded ? <div className="viewer-notice" role="status">Building the 3D space…</div> : null}</div>;
}
