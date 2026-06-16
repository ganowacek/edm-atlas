import {
  forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback, useMemo,
} from 'react';
import * as d3 from 'd3';
import type { Genre } from '../types';
import { getFamilyColor } from '../data/colors';

const HUB_ID = '__edm__';

type Kind = 'hub' | 'family' | 'sub';

interface GNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  kind: Kind;
  family: string;
  genre: Genre | null;
  childCount: number;
}

interface GLink extends d3.SimulationLinkDatum<GNode> {
  source: GNode | string;
  target: GNode | string;
}

export interface GraphHandle {
  focusGenre: (genreId: string) => void;
  collapseAll: () => void;
}

interface Props {
  genres: Genre[];
  selectedId: string | null;
  onSelect: (genre: Genre) => void;
}

const R: Record<Kind, number> = { hub: 26, family: 15, sub: 8.5 };
const COLLIDE: Record<Kind, number> = { hub: 38, family: 36, sub: 30 };
const LABEL_ZOOM = 1.25;

function truncate(s: string, n = 18) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function clampPadding(d: GNode) {
  const labelWidth = d.kind === 'hub' ? 0 : Math.min(92, d.name.length * (d.kind === 'sub' ? 3.2 : 3.8));
  return {
    x: Math.max(R[d.kind] + 8, labelWidth),
    y: d.kind === 'hub' ? R[d.kind] + 8 : R[d.kind] + 24,
  };
}

const GraphExplorer = forwardRef<GraphHandle, Props>(function GraphExplorer(
  { genres, selectedId, onSelect },
  ref
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [zoomK, setZoomK] = useState(1);
  const [tooltip, setTooltip] = useState<{ text: string; sub: string; x: number; y: number } | null>(null);

  // Persistent D3 state across renders
  const eng = useRef<{
    sim: d3.Simulation<GNode, GLink>;
    nodes: GNode[];
    nodeById: Map<string, GNode>;
    links: GLink[];
    gLink: d3.Selection<SVGGElement, unknown, null, undefined>;
    gNode: d3.Selection<SVGGElement, unknown, null, undefined>;
    zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
    root: d3.Selection<SVGGElement, unknown, null, undefined>;
    W: number;
    H: number;
  } | null>(null);

  const families = useMemo(() => genres.filter((g) => !g.parentId), [genres]);
  const subsByParent = useMemo(() => {
    const map = new Map<string, Genre[]>();
    genres.forEach((g) => {
      if (!g.parentId) return;
      const siblings = map.get(g.parentId) ?? [];
      siblings.push(g);
      map.set(g.parentId, siblings);
    });
    return map;
  }, [genres]);

  // ---- Derive which node ids should currently exist ----
  const desiredNodes = useCallback((): { id: string; genre: Genre | null; kind: Kind }[] => {
    const out: { id: string; genre: Genre | null; kind: Kind }[] = [
      { id: HUB_ID, genre: null, kind: 'hub' },
    ];
    families.forEach((f) => {
      out.push({ id: f.id, genre: f, kind: 'family' });
      if (expanded.has(f.id)) {
        (subsByParent.get(f.id) ?? []).forEach((s) => out.push({ id: s.id, genre: s, kind: 'sub' }));
      }
    });
    return out;
  }, [families, expanded, subsByParent]);

  // ---------------------------------------------------------------------------
  // SETUP (once)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!svgRef.current) return;
    const container = svgRef.current.parentElement!;
    const W = container.clientWidth;
    const H = container.clientHeight;
    const cx = W / 2;
    const cy = H / 2;

    const svg = d3.select(svgRef.current).attr('width', W).attr('height', H);
    svg.selectAll('*').remove();

    const root = svg.append('g');
    const gLink = root.append('g').attr('class', 'links');
    const gNode = root.append('g').attr('class', 'nodes');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 4])
      .on('zoom', (e) => {
        root.attr('transform', e.transform.toString());
        setZoomK(e.transform.k);
      });
    svg.call(zoom);
    svg.on('dblclick.zoom', null);

    const ring1 = Math.min(W, H) * 0.27;
    const ring2 = Math.min(W, H) * 0.42;

    const sim = d3
      .forceSimulation<GNode, GLink>([])
      .force(
        'link',
        d3
          .forceLink<GNode, GLink>([])
          .id((d) => d.id)
          .distance((l) => ((l.source as GNode).kind === 'hub' ? ring1 : 84))
          .strength((l) => ((l.source as GNode).kind === 'hub' ? 0.08 : 0.42))
      )
      .force(
        'charge',
        d3.forceManyBody<GNode>().strength((d) =>
          d.kind === 'hub' ? -120 : d.kind === 'family' ? -680 : -240
        ).distanceMax(520)
      )
      .force(
        'radial',
        d3.forceRadial<GNode>(
          (d) => (d.kind === 'hub' ? 0 : d.kind === 'family' ? ring1 : ring2),
          cx, cy
        ).strength((d) => (d.kind === 'hub' ? 1 : d.kind === 'family' ? 0.45 : 0.16))
      )
      .force('collide', d3.forceCollide<GNode>().radius((d) => COLLIDE[d.kind]).strength(0.95).iterations(3))
      .velocityDecay(0.42)
      .alphaDecay(0.03);

    sim.on('tick', () => {
      const e = eng.current;
      if (!e) return;
      e.gLink.selectAll<SVGLineElement, GLink>('line')
        .attr('x1', (d) => (d.source as GNode).x ?? 0)
        .attr('y1', (d) => (d.source as GNode).y ?? 0)
        .attr('x2', (d) => (d.target as GNode).x ?? 0)
        .attr('y2', (d) => (d.target as GNode).y ?? 0);
      e.gNode.selectAll<SVGGElement, GNode>('g.gnode')
        .attr('transform', (d) => {
          const pad = clampPadding(d);
          d.x = Math.max(pad.x, Math.min(e.W - pad.x, d.x ?? cx));
          d.y = Math.max(R[d.kind] + 8, Math.min(e.H - pad.y, d.y ?? cy));
          return `translate(${d.x},${d.y})`;
        });
    });

    const hub: GNode = {
      id: HUB_ID, name: 'EDM', kind: 'hub', family: 'hub', genre: null,
      childCount: families.length, x: cx, y: cy, fx: cx, fy: cy,
    };

    eng.current = {
      sim, nodes: [hub], nodeById: new Map([[HUB_ID, hub]]),
      links: [], gLink, gNode, zoom, root, W, H,
    };

    updateGraph(true);

    const ro = new ResizeObserver(() => {
      const e = eng.current;
      if (!e || !svgRef.current) return;
      const c = svgRef.current.parentElement!;
      e.W = c.clientWidth; e.H = c.clientHeight;
      svg.attr('width', e.W).attr('height', e.H);
      const hubN = e.nodeById.get(HUB_ID);
      if (hubN) { hubN.fx = e.W / 2; hubN.fy = e.H / 2; }
      e.sim.force('radial', d3.forceRadial<GNode>(
        (d) => (d.kind === 'hub' ? 0 : d.kind === 'family' ? Math.min(e.W, e.H) * 0.27 : Math.min(e.W, e.H) * 0.42),
        e.W / 2, e.H / 2
      ).strength((d) => (d.kind === 'hub' ? 1 : d.kind === 'family' ? 0.45 : 0.14)));
      e.sim.alpha(0.3).restart();
    });
    ro.observe(container);

    return () => { ro.disconnect(); sim.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // STRUCTURAL UPDATE (nodes / links) — preserves positions, gentle reheat
  // ---------------------------------------------------------------------------
  const updateGraph = useCallback((instant = false) => {
    const e = eng.current;
    if (!e) return;
    const cx = e.W / 2, cy = e.H / 2;

    const want = desiredNodes();
    const wantIds = new Set(want.map((w) => w.id));

    // remove gone
    e.nodes = e.nodes.filter((n) => wantIds.has(n.id));
    e.nodeById = new Map(e.nodes.map((n) => [n.id, n]));

    // add new (seed children in a fanned arc pointing away from the hub so
    // they spread immediately instead of piling on the parent)
    const newSubsByParent = new Map<string, string[]>();
    want.forEach((w) => {
      if (e.nodeById.has(w.id)) return;
      if (w.kind === 'sub' && w.genre?.parentId) {
        const arr = newSubsByParent.get(w.genre.parentId) ?? [];
        arr.push(w.id);
        newSubsByParent.set(w.genre.parentId, arr);
      }
    });

    want.forEach((w) => {
      if (e.nodeById.has(w.id)) return;
      let sx = cx, sy = cy;
      if (w.kind === 'sub' && w.genre?.parentId) {
        const p = e.nodeById.get(w.genre.parentId);
        if (p) {
          const px = p.x ?? cx, py = p.y ?? cy;
          // direction from hub outward through the parent
          const outAng = Math.atan2(py - cy, px - cx);
          const siblings = newSubsByParent.get(w.genre.parentId) ?? [w.id];
          const idx = siblings.indexOf(w.id);
          const spread = Math.PI * 0.9;
          const a = outAng + (idx - (siblings.length - 1) / 2) * (spread / Math.max(siblings.length, 1));
          const dist = 52;
          sx = px + Math.cos(a) * dist;
          sy = py + Math.sin(a) * dist;
        }
      } else if (w.kind === 'family') {
        const i = families.findIndex((f) => f.id === w.id);
        const ang = (i / Math.max(families.length, 1)) * 2 * Math.PI - Math.PI / 2;
        const ring = Math.min(e.W, e.H) * 0.27;
        sx = cx + Math.cos(ang) * ring; sy = cy + Math.sin(ang) * ring;
      }
      const node: GNode = {
        id: w.id, name: w.genre?.name ?? 'EDM', kind: w.kind,
        family: w.genre?.family ?? 'hub', genre: w.genre,
        childCount: w.kind === 'family' ? (subsByParent.get(w.id) ?? []).length : 0,
        x: sx, y: sy,
      };
      e.nodes.push(node);
      e.nodeById.set(node.id, node);
    });

    // links
    e.links = [];
    e.nodes.forEach((n) => {
      if (n.kind === 'family') e.links.push({ source: HUB_ID, target: n.id });
      if (n.kind === 'sub' && n.genre?.parentId && e.nodeById.has(n.genre.parentId)) {
        e.links.push({ source: n.genre.parentId, target: n.id });
      }
    });

    e.sim.nodes(e.nodes);
    (e.sim.force('link') as d3.ForceLink<GNode, GLink>).links(e.links);

    // join links
    e.gLink.selectAll<SVGLineElement, GLink>('line')
      .data(e.links, (d) => `${(d.source as GNode).id ?? d.source}->${(d.target as GNode).id ?? d.target}`)
      .join(
        (enter) => enter.append('line').attr('stroke-width', 1).attr('stroke', 'rgba(255,255,255,0.08)').attr('opacity', 0)
          .call((s) => s.transition().duration(300).attr('opacity', 1)),
        (update) => update,
        (exit) => exit.interrupt().remove()
      );

    // join nodes
    const nodeJoin = e.gNode.selectAll<SVGGElement, GNode>('g.gnode')
      .data(e.nodes, (d) => d.id)
      .join(
        (enter) => {
          const g = enter.append('g').attr('class', 'gnode').style('opacity', 0);
          g.transition().duration(300).style('opacity', 1);
          g.append('circle')
            .attr('r', (d) => R[d.kind])
            .attr('fill', (d) => d.kind === 'hub' ? '#1a1722' : d.kind === 'family' ? getFamilyColor(d.family).primary : getFamilyColor(d.family).glow)
            .attr('stroke', (d) => d.kind === 'hub' ? '#8b80e0' : getFamilyColor(d.family).primary)
            .attr('stroke-width', (d) => d.kind === 'family' ? 1.8 : d.kind === 'hub' ? 2.2 : 1.2);
          // expand indicator ring for families with children
          g.filter((d) => d.kind === 'family' && d.childCount > 0)
            .append('circle').attr('class', 'expand-ring')
            .attr('r', (d) => R[d.kind] + 4).attr('fill', 'none')
            .attr('stroke', (d) => getFamilyColor(d.family).primary)
            .attr('stroke-width', 1).attr('stroke-dasharray', '2 3').attr('opacity', 0.5);
          g.append('text').attr('class', 'lbl')
            .attr('text-anchor', 'middle')
            .attr('fill', '#f4f4f6')
            .attr('pointer-events', 'none')
            .style('text-shadow', '0 1px 5px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)')
            .text((d) => d.kind === 'sub' ? truncate(d.name) : d.name)
            .attr('font-size', (d) => d.kind === 'hub' ? '12px' : d.kind === 'family' ? '11px' : '9.5px')
            .attr('font-weight', (d) => d.kind === 'sub' ? 500 : 700)
            .attr('dy', (d) => d.kind === 'hub' ? 4 : R[d.kind] + 12)
            .style('opacity', (d) => d.kind === 'sub' ? 0 : 1);
          return g;
        },
        (update) => update,
        (exit) => exit.interrupt().remove()
      );

    // wire events (rebind every update so new nodes get handlers)
    nodeJoin
      .on('mouseenter', function (event, d) {
        setHoveredId(d.id);
        if (d.kind !== 'hub') {
          const rect = svgRef.current!.getBoundingClientRect();
          setTooltip({
            text: d.name,
            sub: d.genre ? `${d.genre.originDecade}${d.genre.bpmRange ? ' · ' + d.genre.bpmRange : ''}` : '',
            x: event.clientX - rect.left, y: event.clientY - rect.top - 16,
          });
        }
      })
      .on('mousemove', (event) => {
        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip((p) => p ? { ...p, x: event.clientX - rect.left, y: event.clientY - rect.top - 16 } : null);
      })
      .on('mouseleave', () => { setHoveredId(null); setTooltip(null); })
      .on('click', (_evt, d) => {
        if (d.kind === 'hub') { setExpanded(new Set()); return; }
        if (d.kind === 'family') {
          setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(d.id)) next.delete(d.id); else next.add(d.id);
            return next;
          });
        }
        if (d.genre) onSelect(d.genre);
      });

    if (instant) e.sim.alpha(0.9).restart();
    else e.sim.alpha(0.7).alphaTarget(0).velocityDecay(0.38).restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desiredNodes, families, onSelect]);

  // run structural update when expansion / data changes
  useEffect(() => {
    if (eng.current) updateGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, genres]);

  // ---------------------------------------------------------------------------
  // VISUAL UPDATE (focus mode, hover, label LOD) — cheap, no reheat
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const e = eng.current;
    if (!e) return;

    const activeId = hoveredId ?? selectedId;
    let focus: Set<string> | null = null;
    if (activeId) {
      const node = e.nodeById.get(activeId);
      if (node) {
        focus = new Set([activeId]);
        if (node.kind === 'sub' && node.genre?.parentId) { focus.add(node.genre.parentId); focus.add(HUB_ID); }
        if (node.kind === 'family') {
          focus.add(HUB_ID);
          e.nodes.forEach((n) => { if (n.genre?.parentId === node.id) focus!.add(n.id); });
        }
        if (node.kind === 'hub') e.nodes.forEach((n) => focus!.add(n.id));
      }
    }

    e.gNode.selectAll<SVGGElement, GNode>('g.gnode')
      .transition().duration(160)
      .style('opacity', (d) => (focus && !focus.has(d.id) ? 0.14 : 1));

    e.gNode.selectAll<SVGGElement, GNode>('g.gnode').select('circle')
      .transition().duration(180)
      .attr('r', (d) => {
        const base = R[d.kind];
        if (d.id === selectedId) return base * 1.45;
        if (d.id === hoveredId) return base * 1.2;
        return base;
      })
      .attr('stroke-width', (d) => (d.id === selectedId ? 3 : d.kind === 'family' ? 1.8 : d.kind === 'hub' ? 2.2 : 1.2));

    // selected ring pulse
    e.gNode.selectAll<SVGGElement, GNode>('g.gnode').select('.expand-ring')
      .transition().duration(160)
      .attr('opacity', (d) => (expanded.has(d.id) ? 0 : 0.5))
      .attr('r', (d) => R[d.kind] + 4);

    // links
    e.gLink.selectAll<SVGLineElement, GLink>('line')
      .transition().duration(160)
      .attr('stroke', (l) => {
        const s = (l.source as GNode).id, t = (l.target as GNode).id;
        if (focus && focus.has(s) && focus.has(t)) {
          const fam = e.nodeById.get(t)?.family ?? 'house';
          return `${getFamilyColor(fam).primary}cc`;
        }
        return focus ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)';
      })
      .attr('stroke-width', (l) => {
        const s = (l.source as GNode).id, t = (l.target as GNode).id;
        return focus && focus.has(s) && focus.has(t) ? 1.8 : 1;
      });

    // labels (LOD)
    e.gNode.selectAll<SVGGElement, GNode>('g.gnode').select<SVGTextElement>('text.lbl')
      .text((d) => d.kind === 'sub' ? truncate(d.name) : d.name)
      .attr('font-size', (d) => d.kind === 'hub' ? '12px' : d.kind === 'family' ? '11px' : '9.5px')
      .attr('font-weight', (d) => d.kind === 'sub' ? 500 : 700)
      .attr('dy', (d) => d.kind === 'hub' ? 4 : R[d.kind] + 12)
      .style('opacity', (d) => {
        if (d.kind === 'hub' || d.kind === 'family') return 1;
        if (focus && focus.has(d.id)) return 1;
        if (zoomK >= LABEL_ZOOM) return 1;
        return 0;
      });
  }, [selectedId, hoveredId, zoomK, expanded]);

  // ---------------------------------------------------------------------------
  // Imperative: search jumps here
  // ---------------------------------------------------------------------------
  const focusGenre = useCallback((genreId: string) => {
    const genre = genres.find((g) => g.id === genreId);
    if (!genre) return;
    // ensure parent expanded
    if (genre.parentId) {
      setExpanded((prev) => {
        if (prev.has(genre.parentId!)) return prev;
        const next = new Set(prev); next.add(genre.parentId!); return next;
      });
    }
    onSelect(genre);
    // center on node after it settles
    window.setTimeout(() => {
      const e = eng.current;
      if (!e || !svgRef.current) return;
      const node = e.nodeById.get(genreId);
      if (!node || node.x == null || node.y == null) return;
      const k = 1.5;
      const t = d3.zoomIdentity.translate(e.W / 2 - node.x * k, e.H / 2 - node.y * k).scale(k);
      d3.select(svgRef.current).transition().duration(600).call(e.zoom.transform, t);
    }, genre.parentId ? 380 : 60);
  }, [genres, onSelect]);

  useImperativeHandle(ref, () => ({
    focusGenre,
    collapseAll: () => setExpanded(new Set()),
  }), [focusGenre]);

  const resetZoom = () => {
    const e = eng.current;
    if (!e || !svgRef.current) return;
    d3.select(svgRef.current).transition().duration(450).call(e.zoom.transform, d3.zoomIdentity);
  };

  return (
    <div className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full touch-none" />

      {tooltip && (
        <div
          className="absolute pointer-events-none z-20 anim-fade"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          <div className="rounded-lg px-2.5 py-1.5 shadow-xl border" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-strong)' }}>
            <div className="text-xs font-semibold text-white whitespace-nowrap">{tooltip.text}</div>
            {tooltip.sub && <div className="text-[10px] font-mono mt-0.5 whitespace-nowrap" style={{ color: 'var(--text-3)' }}>{tooltip.sub}</div>}
          </div>
        </div>
      )}

      {/* zoom + reset controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5">
        <button onClick={() => { const e = eng.current; if (e && svgRef.current) d3.select(svgRef.current).transition().duration(200).call(e.zoom.scaleBy, 1.3); }}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg border transition-colors hover:bg-white/5"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-2)' }} aria-label="Zoom in">+</button>
        <button onClick={() => { const e = eng.current; if (e && svgRef.current) d3.select(svgRef.current).transition().duration(200).call(e.zoom.scaleBy, 1 / 1.3); }}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg border transition-colors hover:bg-white/5"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-2)' }} aria-label="Zoom out">−</button>
        <button onClick={resetZoom}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-xs border transition-colors hover:bg-white/5"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-2)' }} aria-label="Reset view">⌂</button>
      </div>
    </div>
  );
});

export default GraphExplorer;
