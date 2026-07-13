import { forwardRef, useCallback, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/cn';

export interface SignatureCanvasHandle {
  /** Returns the drawn signature as raw base64 PNG (no "data:image/png;base64," prefix), or null if nothing has been drawn. */
  toBase64Png: () => string | null;
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
    const [hasInk, setHasInk] = useState(false);

    const getContext = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.getContext('2d');
    }, []);

    // Size the backing store for the device pixel ratio so strokes stay
    // crisp, while the CSS size is driven by the responsive container.
    const resizeCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const priorHadInk = hasInkRef.current;
      const priorContent = priorHadInk ? canvas.toDataURL('image/png') : null;

      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      const width = Math.max(rect.width, 1);
      const height = 200;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#111827';

      // Restore prior drawing across a resize (e.g. orientation change)
      // rather than silently discarding the signature.
      if (priorContent) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, width, height);
        img.src = priorContent;
      }
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
    }, [getContext, onChange]);

    useImperativeHandle(
      ref,
      () => ({
        toBase64Png: () => {
          if (!hasInkRef.current || !canvasRef.current) return null;
          const dataUrl = canvasRef.current.toDataURL('image/png');
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
