import { Info, X } from 'lucide-react';

interface Props {
  open: boolean;
  onToggle: () => void;
}

const ITEMS = [
  { label: 'EDM hub', size: 18, fill: 'var(--graph-hub-fill)', stroke: '#8b80e0' },
  { label: 'Family', size: 14, fill: 'var(--accent)', stroke: 'var(--accent)' },
  { label: 'Genre / subgenre', size: 10, fill: 'var(--graph-sub-fill, var(--surface-2))', stroke: 'var(--accent)' },
  { label: 'Artist', size: 9, fill: 'var(--graph-artist-fill)', stroke: 'var(--accent)' },
  { label: 'Track', size: 7, fill: 'var(--accent)', stroke: 'var(--accent)' },
];

export default function MapMiniLegend({ open, onToggle }: Props) {
  return (
    <div className="absolute left-3 bottom-3 z-20">
      {open && (
        <div className="mb-2 w-56 rounded-xl border shadow-xl p-3 anim-fade"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border-strong)' }}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Map legend</p>
            <button onClick={onToggle} aria-label="Close map legend"
              className="p-1 rounded-md hover:bg-white/5" style={{ color: 'var(--text-2)' }}>
              <X size={13} />
            </button>
          </div>
          <div className="space-y-2">
            {ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="inline-flex w-6 justify-center">
                  <span className="rounded-full border"
                    style={{
                      width: item.size,
                      height: item.size,
                      background: item.fill,
                      borderColor: item.stroke,
                    }}
                  />
                </span>
                <span className="text-xs" style={{ color: 'var(--text-2)' }}>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
            <p className="text-[11px]" style={{ color: 'var(--text-2)' }}>Click nodes to expand branches.</p>
            <p className="text-[11px]" style={{ color: 'var(--text-2)' }}>Branch control shows the full genre map.</p>
          </div>
        </div>
      )}
      <button onClick={onToggle} aria-label={open ? 'Hide map legend' : 'Show map legend'}
        className="w-10 h-10 rounded-lg border flex items-center justify-center shadow-lg transition-colors hover:bg-white/5"
        style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
        <Info size={17} />
      </button>
    </div>
  );
}
