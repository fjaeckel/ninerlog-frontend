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
});
