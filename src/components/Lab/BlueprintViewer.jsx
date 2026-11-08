import React, { useEffect, useState } from 'react';
import { Box, Image as ImageIcon, Maximize2, Minimize2, RefreshCw, AlertCircle } from 'lucide-react';

// <model-viewer> (+ three.js) is ~1 MB, so it's imported only when a 3D attachment is shown.
let modelViewerLoad = null;
const loadModelViewer = () => (modelViewerLoad ??= import('@google/model-viewer'));

function ModelViewer({ src, alt }) {
  const [state, setState] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [ref, setRef] = useState(null);

  useEffect(() => {
    let alive = true;
    loadModelViewer()
      .then(() => alive && setState((s) => (s === 'loading' ? 'ready' : s)))
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, []);

  // model-viewer reports load failures (bad file, CORS, 404) via an 'error' event
  useEffect(() => {
    if (!ref) return undefined;
    const onError = () => setState('error');
    ref.addEventListener('error', onError);
    return () => ref.removeEventListener('error', onError);
  }, [ref]);

  if (state === 'error') {
    return (
      <p className="h-full flex items-center justify-center gap-1.5 text-[11px] text-amber-400 px-4 text-center">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Couldn’t load this 3D model. Use a .glb file (or a .gltf with embedded buffers) from a host that allows cross-origin access.
      </p>
    );
  }
  if (state === 'loading') {
    return (
      <p className="h-full flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading 3D viewer…
      </p>
    );
  }
  // disable-zoom: wheel-zoom would hijack page scrolling in the feed (drag-to-orbit still works)
  return (
    <model-viewer
      ref={setRef}
      src={src}
      alt={alt}
      camera-controls=""
      camera-orbit="35deg 65deg auto"
      disable-zoom=""
      auto-rotate=""
      touch-action="pan-y"
      shadow-intensity="1"
      exposure="1.1"
      interaction-prompt="none"
      style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
    />
  );
}

/** Media area for a breakdown: interactive 3D model or zoomable blueprint image. */
export default function BlueprintViewer({ media, title }) {
  const [zoomed, setZoomed] = useState(false);
  const is3d = media.kind === '3d';

  return (
    <figure className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
          {is3d ? <Box className="w-3.5 h-3.5 text-indigo-400" /> : <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />}
          {is3d ? '3D model viewer — drag to orbit' : 'Blueprint'}
        </p>
        {!is3d && (
          <button onClick={() => setZoomed((z) => !z)} className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1" aria-pressed={zoomed}>
            {zoomed ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />} {zoomed ? 'Fit' : 'Zoom'}
          </button>
        )}
      </div>
      <div
        className={`rounded-xl border border-slate-800 bg-[radial-gradient(circle_at_center,#1e293b_0%,#020617_100%)] ${
          is3d ? 'h-72' : zoomed ? 'max-h-[32rem] overflow-auto' : 'h-64 overflow-hidden'
        }`}
      >
        {is3d ? (
          <ModelViewer src={media.src} alt={`3D model for ${title}`} />
        ) : (
          <img
            src={media.src}
            alt={media.caption || `Blueprint for ${title}`}
            className={zoomed ? 'max-w-none w-[200%]' : 'w-full h-full object-contain'}
          />
        )}
      </div>
      {media.caption && <figcaption className="text-[10px] text-slate-500">{media.caption}</figcaption>}
    </figure>
  );
}
