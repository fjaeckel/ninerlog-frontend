import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SignatureCanvas, type SignatureCanvasHandle } from '../../components/SignatureCanvas';

describe('SignatureCanvas', () => {
  it('renders an empty pad with Clear disabled', () => {
    render(<SignatureCanvas />);
    expect(screen.getByRole('img', { name: /signature/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear/i })).toBeDisabled();
  });

  it('marks the pad as having a drawing after a pointer stroke, and calls onChange', () => {
    const onChange = vi.fn();
    render(<SignatureCanvas onChange={onChange} />);

    const canvas = screen.getByRole('img', { name: /signature/i });
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(canvas, { clientX: 20, clientY: 20 });
    fireEvent.pointerUp(canvas, { clientX: 20, clientY: 20 });

    expect(onChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button', { name: /clear/i })).not.toBeDisabled();
  });

  it('clears the drawing and calls onChange(false)', () => {
    const onChange = vi.fn();
    render(<SignatureCanvas onChange={onChange} />);

    const canvas = screen.getByRole('img', { name: /signature/i });
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(canvas, { clientX: 20, clientY: 20 });

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('button', { name: /clear/i })).toBeDisabled();
  });

  it('exposes isEmpty() via the imperative handle', () => {
    const ref = createRef<SignatureCanvasHandle>();
    render(<SignatureCanvas ref={ref} />);

    expect(ref.current?.isEmpty()).toBe(true);

    const canvas = screen.getByRole('img', { name: /signature/i });
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(canvas, { clientX: 20, clientY: 20 });

    expect(ref.current?.isEmpty()).toBe(false);
  });

  it('returns null from toBase64Png() when nothing has been drawn', () => {
    const ref = createRef<SignatureCanvasHandle>();
    render(<SignatureCanvas ref={ref} />);
    expect(ref.current?.toBase64Png()).toBeNull();
  });

  it('returns a base64 string once something has been drawn, with or without a stamp', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,aGVsbG8=');
    const ref = createRef<SignatureCanvasHandle>();
    render(<SignatureCanvas ref={ref} />);

    const canvas = screen.getByRole('img', { name: /signature/i });
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(canvas, { clientX: 20, clientY: 20 });

    expect(ref.current?.toBase64Png()).toBe('aGVsbG8=');
    expect(ref.current?.toBase64Png('Cert. No. 12345')).toBe('aGVsbG8=');
  });

  it('does not resize (and so does not wipe) the canvas backing store once a stroke has started', () => {
    // Regression test: the canvas used to eagerly re-apply its backing
    // store size whenever the container's ResizeObserver fired again,
    // which reset all pixel content. A resize mid-signature is a realistic
    // scenario (a dialog settling its layout, a mobile keyboard opening),
    // so once the user has started drawing, resizing must become a no-op.
    let resizeCallback: ResizeObserverCallback | undefined;
    const OriginalResizeObserver = globalThis.ResizeObserver;
    class FakeResizeObserver {
      constructor(cb: ResizeObserverCallback) {
        resizeCallback = cb;
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;

    try {
      const ref = createRef<SignatureCanvasHandle>();
      render(<SignatureCanvas ref={ref} />);

      const canvas = screen.getByRole('img', { name: /signature/i }) as HTMLCanvasElement;
      fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
      fireEvent.pointerMove(canvas, { clientX: 20, clientY: 20 });

      const widthAfterStroke = canvas.width;
      const heightAfterStroke = canvas.height;

      // Simulate the container reporting a new size mid-signature.
      resizeCallback?.([] as unknown as ResizeObserverEntry[], {} as ResizeObserver);

      expect(canvas.width).toBe(widthAfterStroke);
      expect(canvas.height).toBe(heightAfterStroke);
    } finally {
      globalThis.ResizeObserver = OriginalResizeObserver;
    }
  });
});
