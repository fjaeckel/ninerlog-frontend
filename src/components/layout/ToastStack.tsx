import { createContext, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const STACK_CLASS =
  'fixed inset-x-4 z-[1000] flex flex-col gap-2 pointer-events-none [&>*]:pointer-events-auto bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+1rem)] lg:bottom-4 sm:left-auto sm:right-4 sm:w-96';

interface SlotState {
  slot: HTMLElement | null;
  setSlot: (el: HTMLElement | null) => void;
}

const ToastSlotContext = createContext<SlotState | null>(null);

/** Provides the shared bottom-right toast stack to the tree below it. */
export function ToastStackProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  return <ToastSlotContext.Provider value={{ slot, setSlot }}>{children}</ToastSlotContext.Provider>;
}

/** The fixed bottom-right column toasts stack in: page toasts first, then `children`. */
export function ToastStack({ children }: { children?: ReactNode }) {
  const ctx = useContext(ToastSlotContext);
  return (
    <div className={STACK_CLASS} data-testid="toast-stack">
      <div ref={ctx?.setSlot} className="contents" />
      {children}
    </div>
  );
}

/** Renders `children` into the shared toast stack, or in a stack of its own outside one. */
export function InToastStack({ children }: { children: ReactNode }) {
  const ctx = useContext(ToastSlotContext);
  if (ctx) return ctx.slot ? createPortal(children, ctx.slot) : null;
  return <div className={STACK_CLASS}>{children}</div>;
}
