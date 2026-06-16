import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onClose: () => void;
  accentColor: string;
  initialSnap?: number;
}

const SNAP_POINTS = [0.25, 0.5, 0.9];
const CLOSE_THRESHOLD = 0.15;
const VELOCITY_CLOSE = 800;

export default function BottomSheet({ children, onClose, accentColor, initialSnap = 0.5 }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [snapFraction, setSnapFraction] = useState<number>(initialSnap);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startFractionRef = useRef(initialSnap);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const animRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const currentFractionRef = useRef(initialSnap);

  const snapTo = useCallback((fraction: number, animate = true) => {
    if (fraction < CLOSE_THRESHOLD) {
      onClose();
      return;
    }
    const clamped = Math.max(SNAP_POINTS[0], Math.min(SNAP_POINTS[SNAP_POINTS.length - 1], fraction));
    if (animate && sheetRef.current) {
      sheetRef.current.style.transition = 'height 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
      sheetRef.current.style.height = `${clamped * 100}vh`;
      setTimeout(() => {
        if (sheetRef.current) sheetRef.current.style.transition = '';
      }, 300);
    }
    setSnapFraction(clamped);
    currentFractionRef.current = clamped;
  }, [onClose]);

  const findNearestSnap = useCallback((fraction: number, velocity: number): number => {
    if (velocity > VELOCITY_CLOSE || fraction < CLOSE_THRESHOLD) return 0;
    const dir = velocity < -400 ? 1 : velocity > 400 ? -1 : 0;
    if (dir !== 0) {
      const filtered = dir > 0
        ? SNAP_POINTS.filter((s) => s > fraction)
        : SNAP_POINTS.filter((s) => s < fraction);
      if (filtered.length > 0) return dir > 0 ? filtered[0] : filtered[filtered.length - 1];
    }
    return SNAP_POINTS.reduce((prev, curr) =>
      Math.abs(curr - fraction) < Math.abs(prev - fraction) ? curr : prev
    );
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    lastYRef.current = touch.clientY;
    lastTimeRef.current = performance.now();
    startFractionRef.current = currentFractionRef.current;
    velocityRef.current = 0;
    setIsDragging(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    const now = performance.now();
    const dt = now - lastTimeRef.current;
    if (dt > 0) {
      velocityRef.current = (touch.clientY - lastYRef.current) / dt * 1000;
    }
    lastYRef.current = touch.clientY;
    lastTimeRef.current = now;

    const dy = touch.clientY - startYRef.current;
    const viewH = window.innerHeight;
    const nextFraction = startFractionRef.current - dy / viewH;
    const clamped = Math.max(CLOSE_THRESHOLD - 0.05, Math.min(SNAP_POINTS[SNAP_POINTS.length - 1], nextFraction));

    currentFractionRef.current = clamped;
    if (sheetRef.current) {
      sheetRef.current.style.height = `${clamped * 100}vh`;
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    setIsDragging(false);
    const nearest = findNearestSnap(currentFractionRef.current, velocityRef.current);
    snapTo(nearest);
  }, [findNearestSnap, snapTo]);

  useEffect(() => {
    const el = document.body;
    const prev = el.style.overflow;
    el.style.overflow = 'hidden';
    el.style.overscrollBehavior = 'none';
    return () => {
      el.style.overflow = prev;
      el.style.overscrollBehavior = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 anim-fade" onClick={onClose} />
      <div
        ref={sheetRef}
        className="relative rounded-t-2xl overflow-hidden flex flex-col"
        style={{
          height: `${snapFraction * 100}vh`,
          borderTop: `2px solid ${accentColor}`,
          background: 'var(--surface-1)',
          willChange: 'height',
          touchAction: 'none',
          overscrollBehavior: 'contain',
        }}
      >
        {/* drag handle */}
        <div
          className="flex justify-center pt-2 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing"
          style={{ background: 'var(--surface-1)', touchAction: 'none' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="rounded-full transition-all duration-150"
            style={{
              width: isDragging ? '48px' : '36px',
              height: '4px',
              background: isDragging ? accentColor : 'var(--surface-3)',
            }}
          />
        </div>

        {/* snap point buttons */}
        <div className="flex justify-center gap-4 pb-2 flex-shrink-0" style={{ touchAction: 'none' }}>
          {SNAP_POINTS.map((s) => (
            <button
              key={s}
              onClick={() => snapTo(s)}
              aria-label={`Expand to ${Math.round(s * 100)}%`}
              className="rounded-full transition-all"
              style={{
                width: '6px',
                height: '6px',
                background: Math.abs(snapFraction - s) < 0.05 ? accentColor : 'var(--surface-3)',
              }}
            />
          ))}
        </div>

        <div
          className="flex-1 overflow-y-auto"
          style={{ overscrollBehavior: 'contain' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
