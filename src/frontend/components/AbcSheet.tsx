import React, { useEffect, useRef, useState } from 'react';
import { Music2 } from 'lucide-react';

type AbcjsModule = typeof import('abcjs');

type AbcSynthController = AbcjsModule['synth']['SynthObjectController'] & {
  destroy(): void;
};

type AbcSheetProps = {
  abc: string;
};

const TEMPO_MIN = 40;
const TEMPO_MAX = 220;
const TEMPO_STEP = 5;
const DEFAULT_TEMPO = 120;

function clearNoteHighlight(container: HTMLElement) {
  container.querySelectorAll('.abcjs-note-highlight').forEach((el) => el.classList.remove('abcjs-note-highlight'));
}

function AbcSheet({ abc }: AbcSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlBarRef = useRef<HTMLDivElement>(null);
  const abcjsRef = useRef<AbcjsModule | null>(null);
  const visualObjRef = useRef<AbcjsModule['TuneObject'] | null>(null);
  const controlRef = useRef<AbcSynthController | null>(null);
  const [ready, setReady] = useState(false);
  const [tempo, setTempo] = useState(DEFAULT_TEMPO);
  const [error, setError] = useState('');

  useEffect(() => {
    const container = containerRef.current;
    const controlBar = controlBarRef.current;
    if (!container) return;

    let cancelled = false;

    Promise.all([import('abcjs'), import('abcjs/abcjs-audio.css')]).then(([abcjsLib]) => {
      if (cancelled) return;
      abcjsRef.current = abcjsLib;
      setReady(true);

      visualObjRef.current = null;
      container.replaceChildren();

      let visualObjs: AbcjsModule['TuneObjectArray'];
      try {
        visualObjs = abcjsLib.renderAbc(container, abc, {
          responsive: 'resize',
          add_classes: true,
        });
        visualObjRef.current = visualObjs[0] ?? null;
        setError('');
      } catch (err) {
        console.error('ABC notation failed to render:', err);
        setError('ABC記法を楽譜に変換できませんでした。');
        return;
      }

      const visualObj = visualObjRef.current;
      if (!visualObj || !controlBar) return;

      const cursorControl: AbcjsModule['CursorControl'] = {
        onStart: () => clearNoteHighlight(container),
        onFinished: () => clearNoteHighlight(container),
        onEvent: (event) => {
          if (!event) return;
          if (event.measureStart && event.left === null) return;
          clearNoteHighlight(container);
          event.elements?.forEach((note) => note?.forEach((el) => el.classList.add('abcjs-note-highlight')));
        },
      };

      const control = new abcjsLib.synth.SynthController();
      control.load(controlBar, cursorControl, {
        displayPlay: true,
        displayRestart: true,
        displayLoop: true,
        displayProgress: true,
        displayWarp: true,
      });
      controlRef.current = control;
      control.setTune(visualObj, false, {});
      controlBar.querySelector('.abcjs-midi-reset')?.addEventListener('click', () => clearNoteHighlight(container));
    });

    return () => {
      cancelled = true;
      controlRef.current?.destroy();
      controlRef.current = null;
      if (controlBar) controlBar.replaceChildren();
    };
  }, [abc]);

  const handleTempoChange = (value: string) => {
    const next = Number(value);
    setTempo(next);
    const control = controlRef.current;
    const visualObj = visualObjRef.current;
    if (!control || !visualObj) return;
    const baseTempo = Math.round(visualObj.getBeatsPerMeasure() / visualObj.millisecondsPerMeasure() * 60000);
    const warp = Math.max(1, Math.min(300, Math.round((next / baseTempo) * 100)));
    control.setWarp(warp);
  };

  return (
    <div className="mt-3 rounded-lg border border-primary/40 bg-black/40 p-3" role="region" aria-label="ABC notation 楽譜プレビュー">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 font-orbitron text-[10px] uppercase tracking-[0.18em] text-primary">
          <Music2 size={13} />
          ABC Notation
        </p>
      </div>

      <div ref={containerRef} className="overflow-x-auto rounded border border-primary/15 bg-[#fdfcf8] p-3" style={{ color: '#202020' }} />
      {!ready && <p className="text-xs text-foreground/50">楽譜エンジンを読み込み中…</p>}

      {error && (
        <p className="mt-2 text-xs text-red-300" role="alert">
          {error}
        </p>
      )}

      <div ref={controlBarRef} className="abcjs-controls mt-3" />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-xs text-foreground/65">
          <span className="font-mono">QPM</span>
          <input
            type="range"
            min={TEMPO_MIN}
            max={TEMPO_MAX}
            step={TEMPO_STEP}
            value={tempo}
            onChange={(event) => handleTempoChange(event.target.value)}
            aria-label="テンポ（QPM）"
            className="accent-[var(--color-primary)]"
          />
          <span className="w-8 text-right font-mono text-foreground/80">{tempo}</span>
        </label>
      </div>
    </div>
  );
}

export default AbcSheet;