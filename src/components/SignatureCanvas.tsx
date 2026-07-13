import { forwardRef, useCallback, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/cn';

export interface SignatureCanvasHandle {
  /**
   * Returns the drawn signature as raw base64 PNG (no
   * "data:image/png;base64," prefix), or null if nothing has been drawn.
   * If `stampText` is given, it's rendered into the bottom-right corner of
   * the exported image (e.g. the instructor's certificate number) — it is
   * NOT shown on the live pad, only baked into the saved artifact.
   */
  toBase64Png: (stampText?: string) => string | null;
  clear: () => void;
  isEmpty: () => boolean;
}

interface SignatureCanvasProps {
  className?: string;
  /** Called after every stroke completes and after clear(), with whether the pad currently has a drawing. */
  onChange?: (hasDrawing: boolean) => void;
}

/**
 * A pointer-events-based signature pad. Always renders black ink on a white
 * background regardless of the app's theme — signatures are meant to look
 * the same on screen, in exports, and in print, like a paper logbook.
 */
export const SignatureCanvas = forwardRef<SignatureCanvasHandle, SignatureCanvasProps>(
  ({ className, onChange }, ref) => {
    const { t } = useTranslation('signatures');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const drawingRef = useRef(false);
    const hasInkRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const sizeRef = useRef<{ width: number; height: number } | null>(null);
    const [hasInk, setHasInk] = useState(false);

    const getContext = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.getContext('2d');
    }, []);

    const applyPenStyle = (ctx: CanvasRenderingContext2D) => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#111827';
    };

    // Size the backing store for the device pixel ratio so strokes stay
    // crisp, while the CSS size is driven by the responsive container.
    //
    // Once the user has drawn anything, this deliberately becomes a no-op:
    // resizing recreates the canvas's backing store (wiping its pixels),
    // and a container can legitimately report a new size mid-signature
    // (e.g. a dialog settling its layout, a virtual keyboard opening on
    // mobile). Restoring the old content across that reset previously went
    // through an async `Image` round-trip drawn onto an *already
    // dpr-scaled* context — a double-scale bug that could silently corrupt
    // or blank out the captured signature. Simplest robust fix: the pad
    // locks its size at the first stroke.
    const resizeCanvas = useCallback(() => {
      if (hasInkRef.current) return;
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      const width = Math.max(Math.round(rect.width), 1);
      const height = 200;

      // ResizeObserver fires once immediately on observe() and then again
      // on any real change — skip re-applying an identical size so we
      // don't reset context state (stroke style etc.) for no reason.
      if (sizeRef.current && sizeRef.current.width === width && sizeRef.current.height === height) {
        return;
      }
      sizeRef.current = { width, height };

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      applyPenStyle(ctx);
    }, []);

    useEffect(() => {
      resizeCanvas();
      const observer = new ResizeObserver(() => resizeCanvas());
      if (containerRef.current) observer.observe(containerRef.current);
      return () => observer.disconnect();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      canvasRef.current?.setPointerCapture(e.pointerId);
      drawingRef.current = true;
      lastPointRef.current = getPoint(e);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      e.preventDefault();
      const ctx = getContext();
      const point = getPoint(e);
      const last = lastPointRef.current;
      if (ctx && last) {
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
      lastPointRef.current = point;
      if (!hasInkRef.current) {
        hasInkRef.current = true;
        setHasInk(true);
        onChange?.(true);
      }
    };

    const endStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      lastPointRef.current = null;
      canvasRef.current?.releasePointerCapture(e.pointerId);
    };

    const clear = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = getContext();
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      hasInkRef.current = false;
      setHasInk(false);
      onChange?.(false);
      // Now that the pad is empty again, let it track the container's
      // current size in case it changed while locked during drawing.
      resizeCanvas();
    }, [getContext, onChange, resizeCanvas]);

    useImperativeHandle(
      ref,
      () => ({
        toBase64Png: (stampText?: string) => {
          const canvas = canvasRef.current;
          if (!hasInkRef.current || !canvas) return null;

          let source: HTMLCanvasElement = canvas;
          if (stampText && stampText.trim()) {
            const stamped = document.createElement('canvas');
            stamped.width = canvas.width;
            stamped.height = canvas.height;
            const sctx = stamped.getContext('2d');
            if (sctx) {
              // Raw pixel-for-pixel copy first (identity transform), then
              // switch to CSS-pixel coordinates for the text so its size
              // matches what applyPenStyle/getPoint use elsewhere.
              sctx.drawImage(canvas, 0, 0);
              const dpr = window.devicePixelRatio || 1;
              sctx.scale(dpr, dpr);
              const cssWidth = canvas.width / dpr;
              const cssHeight = canvas.height / dpr;
              sctx.font = '13px system-ui, sans-serif';
              sctx.fillStyle = '#4b5563';
              sctx.textAlign = 'right';
              sctx.textBaseline = 'bottom';
              sctx.fillText(stampText.trim(), cssWidth - 8, cssHeight - 6);
              source = stamped;
            }
          }

          const dataUrl = source.toDataURL('image/png');
          const prefix = 'base64,';
          const idx = dataUrl.indexOf(prefix);
          return idx === -1 ? null : dataUrl.slice(idx + prefix.length);
        },
        clear,
        isEmpty: () => !hasInkRef.current,
      }),
      [clear]
    );

    return (
      <div className={cn('space-y-2', className)}>
        <div
          ref={containerRef}
          className="rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white overflow-hidden touch-none"
        >
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={t('signaturePad.ariaLabel')}
            className="block w-full cursor-crosshair touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endStroke}
            onPointerLeave={endStroke}
            onPointerCancel={endStroke}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {hasInk ? t('signaturePad.hint') : t('signaturePad.emptyHint')}
          </p>
          <button
            type="button"
            onClick={clear}
            disabled={!hasInk}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
          >
            {t('signaturePad.clear')}
          </button>
        </div>
      </div>
    );
  }
);

SignatureCanvas.displayName = 'SignatureCanvas';
