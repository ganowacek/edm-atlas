import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import genres from '../data/genres';
import { getFamilyColor, FAMILY_COLORS } from '../data/colors';
import type { Genre } from '../types';
import { Search, X, Filter } from 'lucide-react';

interface MapPageProps {
  onSelectGenre: (genre: Genre) => void;
}

const HUB_ID = '__edm_hub__';

type NodeKind = 'hub' | 'genre' | 'sub';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  family: string;
  genre: Genre | null;
  radius: number;
  kind: NodeKind;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: GraphNode | string;
  target: GraphNode | string;
}

const RADIUS: Record<NodeKind, number> = { hub: 30, genre: 17, sub: 9 };
// collision padding leaves room for labels so nodes never overlap text
const COLLIDE_PAD: Record<NodeKind, number> = { hub: 14, genre: 30, sub: 18 };
const ZOOM_LABEL_THRESHOLD = 1.45;

export default function MapPage({ onSelectGenre }: MapPageProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const scaleRef = useRef(1);
  const [search, setSearch] = useState('');
  const [activeFamily, setActiveFamily] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const matchesSearch = (g: Genre) =>
    search === '' ||
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.family.toLowerCase().includes(search.toLowerCase()) ||
    g.originCities.some((c) => c.toLowerCase().includes(search.toLowerCase())) ||
    g.moods.some((m) => m.toLowerCase().includes(search.toLowerCase())) ||
    g.originDecade.toLowerCase().includes(search.toLowerCase());

  const filtered = genres.filter(
    (g) => matchesSearch(g) && (!activeFamily || g.family === activeFamily)
  );

  const buildGraph = useCallback(() => {
    if (!svgRef.current) return;
    simRef.current?.stop();

    const container = svgRef.current.parentElement!;
    const W = container.clientWidth;
    const H = container.clientHeight;
    const cx = W / 2;
    const cy = H / 2;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', W).attr('height', H);

    const g = svg.append('g').attr('class', 'graph-root');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4])
      .on('zoom', (e) => {
        g.attr('transform', e.transform.toString());
        scaleRef.current = e.transform.k;
        updateLabels(null);
      });
    svg.call(zoom);
    svg.on('dblclick.zoom', () => fitToBounds(400));

    const visibleIds = new Set(filtered.map((x) => x.id));
    const topLevel = filtered.filter((x) => !x.parentId);

    // ---- Build nodes (hub + genres), with organised starting positions ----
    const hub: GraphNode = {
      id: HUB_ID, name: 'EDM', family: 'hub', genre: null,
      radius: RADIUS.hub, kind: 'hub', x: cx, y: cy, fx: cx, fy: cy,
    };

    const nodes: GraphNode[] = [hub];
    const angleStep = (2 * Math.PI) / Math.max(topLevel.length, 1);
    const ring = Math.min(W, H) * 0.32;

    topLevel.forEach((genre, i) => {
      const ang = i * angleStep - Math.PI / 2;
      const gx = cx + Math.cos(ang) * ring;
      const gy = cy + Math.sin(ang) * ring;
      nodes.push({
        id: genre.id, name: genre.name, family: genre.family, genre,
        radius: RADIUS.genre, kind: 'genre', x: gx, y: gy,
      });
      // subgenres seeded in a small arc just outside their parent
      const subs = filtered.filter((s) => s.parentId === genre.id);
      const subStep = subs.length > 1 ? 0.6 / (subs.length - 1) : 0;
      subs.forEach((sub, j) => {
        const subAng = ang + (j - (subs.length - 1) / 2) * subStep;
        nodes.push({
          id: sub.id, name: sub.name, family: sub.family, genre: sub,
          radius: RADIUS.sub, kind: 'sub',
          x: cx + Math.cos(subAng) * (ring + 90),
          y: cy + Math.sin(subAng) * (ring + 90),
        });
      });
    });

    // orphaned subgenres (parent filtered out) seeded near centre
    filtered
      .filter((s) => s.parentId && !topLevel.some((t) => t.id === s.parentId))
      .forEach((sub) => {
        if (nodes.some((n) => n.id === sub.id)) return;
        nodes.push({
          id: sub.id, name: sub.name, family: sub.family, genre: sub,
          radius: RADIUS.sub, kind: 'sub',
          x: cx + (Math.random() - 0.5) * 120,
          y: cy + (Math.random() - 0.5) * 120,
        });
      });

    // ---- Links: every genre -> hub; every sub -> parent (or hub if parent hidden) ----
    const links: GraphLink[] = [];
    nodes.forEach((n) => {
      if (n.kind === 'genre') links.push({ source: HUB_ID, target: n.id });
      if (n.kind === 'sub') {
        const pid = n.genre?.parentId;
        links.push({ source: pid && visibleIds.has(pid) ? pid : HUB_ID, target: n.id });
      }
    });

    const adjacency = new Map<string, Set<string>>();
    nodes.forEach((n) => adjacency.set(n.id, new Set()));
    links.forEach((l) => {
      const s = l.source as string;
      const t = l.target as string;
      adjacency.get(s)?.add(t);
      adjacency.get(t)?.add(s);
    });

    // ---- SVG layers ----
    const linkSel = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'rgba(255,255,255,0.10)')
      .attr('stroke-width', 1);

    const nodeSel = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', (d) => (d.kind === 'hub' ? 'default' : 'pointer'))
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .filter((_e, d) => d.kind !== 'hub')
          .on('start', (e, d) => {
            if (!e.active) simRef.current?.alphaTarget(0.25).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on('end', (e, d) => {
            if (!e.active) simRef.current?.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      );

    nodeSel.append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => {
        if (d.kind === 'hub') return '#1e1b4b';
        const col = getFamilyColor(d.family);
        return d.kind === 'genre' ? col.primary : `${col.glow}cc`;
      })
      .attr('stroke', (d) => (d.kind === 'hub' ? '#a78bfa' : getFamilyColor(d.family).primary))
      .attr('stroke-width', (d) => (d.kind === 'genre' ? 2 : d.kind === 'hub' ? 2.5 : 1));

    const labelSel = nodeSel.append('text')
      .text((d) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => (d.kind === 'sub' ? d.radius + 11 : d.kind === 'hub' ? 4 : d.radius + 13))
      .attr('font-size', (d) => (d.kind === 'hub' ? '13px' : d.kind === 'genre' ? '11px' : '9px'))
      .attr('font-weight', (d) => (d.kind === 'sub' ? 500 : 700))
      .attr('fill', '#fff')
      .attr('pointer-events', 'none')
      .style('text-shadow', '0 1px 4px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)');

    function updateLabels(highlight: Set<string> | null) {
      const zoomedIn = scaleRef.current > ZOOM_LABEL_THRESHOLD;
      labelSel.style('opacity', (d) => {
        if (d.kind !== 'sub') return 1;
        if (zoomedIn) return 1;
        if (highlight && highlight.has(d.id)) return 1;
        return 0;
      });
    }
    updateLabels(null);

    // ---- Hover highlight ----
    function setHighlight(d: GraphNode | null) {
      if (!d) {
        nodeSel.transition().duration(150).style('opacity', 1);
        linkSel.transition().duration(150)
          .attr('stroke', 'rgba(255,255,255,0.10)').attr('stroke-width', 1);
        updateLabels(null);
        return;
      }
      const keep = new Set<string>([d.id, ...(adjacency.get(d.id) ?? [])]);
      if (d.kind === 'hub') nodes.forEach((n) => keep.add(n.id));
      nodeSel.transition().duration(150).style('opacity', (n) => (keep.has(n.id) ? 1 : 0.12));
      linkSel.transition().duration(150)
        .attr('stroke', (l) => {
          const s = (l.source as GraphNode).id;
          const t = (l.target as GraphNode).id;
          return keep.has(s) && keep.has(t) ? `${getFamilyColor(d.family).primary}aa` : 'rgba(255,255,255,0.03)';
        })
        .attr('stroke-width', (l) => {
          const s = (l.source as GraphNode).id;
          const t = (l.target as GraphNode).id;
          return keep.has(s) && keep.has(t) ? 1.8 : 1;
        });
      updateLabels(keep);
    }

    nodeSel
      .on('mouseenter', (event, d) => {
        if (d.kind !== 'hub') {
          const rect = svgRef.current!.getBoundingClientRect();
          const meta = d.genre
            ? `${d.genre.name} · ${d.genre.originDecade}${d.genre.bpmRange ? ' · ' + d.genre.bpmRange : ''}`
            : d.name;
          setTooltip({ text: meta, x: event.clientX - rect.left, y: event.clientY - rect.top - 14 });
        }
        setHighlight(d);
        d3.select(event.currentTarget as SVGGElement).select('circle')
          .transition().duration(150).attr('r', d.radius * 1.25);
      })
      .on('mousemove', (event) => {
        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip((p) => (p ? { ...p, x: event.clientX - rect.left, y: event.clientY - rect.top - 14 } : null));
      })
      .on('mouseleave', (event, d) => {
        setTooltip(null);
        setHighlight(null);
        d3.select(event.currentTarget as SVGGElement).select('circle')
          .transition().duration(150).attr('r', d.radius);
      })
      .on('click', (_e, d) => { if (d.genre) onSelectGenre(d.genre); });

    // ---- Simulation: hub anchors the centre, families fan out radially ----
    const sim = d3.forceSimulation<GraphNode, GraphLink>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id((d) => d.id)
        .distance((l) => ((l.source as GraphNode).kind === 'hub' ? 165 : 72))
        .strength(0.55))
      .force('charge', d3.forceManyBody<GraphNode>()
        .strength((d) => (d.kind === 'hub' ? -200 : d.kind === 'genre' ? -520 : -130))
        .distanceMax(420))
      .force('collide', d3.forceCollide<GraphNode>()
        .radius((d) => d.radius + COLLIDE_PAD[d.kind])
        .strength(0.92).iterations(2))
      .force('x', d3.forceX(cx).strength(0.04))
      .force('y', d3.forceY(cy).strength(0.04))
      .velocityDecay(0.45)
      .alphaDecay(0.028);

    sim.on('tick', () => {
      // keep everything inside the viewport
      nodes.forEach((n) => {
        if (n.kind === 'hub') return;
        n.x = Math.max(n.radius + 4, Math.min(W - n.radius - 4, n.x ?? cx));
        n.y = Math.max(n.radius + 30, Math.min(H - n.radius - 8, n.y ?? cy));
      });
      linkSel
        .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
        .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
        .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
        .attr('y2', (d) => (d.target as GraphNode).y ?? 0);
      nodeSel.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    simRef.current = sim;

    function fitToBounds(duration: number) {
      const xs = nodes.map((n) => n.x ?? cx);
      const ys = nodes.map((n) => n.y ?? cy);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const bw = maxX - minX || 1;
      const bh = maxY - minY || 1;
      const scale = Math.min(2, Math.max(0.3, 0.9 * Math.min(W / bw, H / bh)));
      const tx = W / 2 - scale * (minX + maxX) / 2;
      const ty = H / 2 - scale * (minY + maxY) / 2;
      svg.transition().duration(duration).call(
        zoom.transform,
        d3.zoomIdentity.translate(tx, ty).scale(scale)
      );
    }

    // settle, then fit and stop
    sim.alpha(1).restart();
    window.setTimeout(() => fitToBounds(500), 1600);
    window.setTimeout(() => sim.stop(), 4500);
  }, [filtered, onSelectGenre]);

  useEffect(() => {
    buildGraph();
    const el = svgRef.current?.parentElement;
    if (!el) return;
    let t: number;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(t);
      t = window.setTimeout(buildGraph, 200);
    });
    ro.observe(el);
    return () => { ro.disconnect(); window.clearTimeout(t); };
  }, [buildGraph]);

  return (
    <div className="h-screen flex flex-col pt-14">
      <div className="flex-shrink-0 bg-gray-900/80 backdrop-blur border-b border-white/5 px-4 py-2 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search genres, cities, moods…"
            className="pl-8 pr-8 py-1.5 bg-white/5 border border-white/10 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 w-56"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter size={13} className="text-gray-500 flex-shrink-0" />
          {Object.entries(FAMILY_COLORS).map(([family, col]) => (
            <button
              key={family}
              onClick={() => setActiveFamily(activeFamily === family ? null : family)}
              className="px-2 py-0.5 rounded text-xs font-semibold capitalize transition-all"
              style={{
                background: activeFamily === family ? col.primary : `${col.glow}30`,
                color: activeFamily === family ? '#000' : col.text,
                border: `1px solid ${activeFamily === family ? col.primary : `${col.primary}40`}`,
              }}
            >
              {family}
            </button>
          ))}
          {(activeFamily || search) && (
            <button
              onClick={() => { setActiveFamily(null); setSearch(''); }}
              className="px-2 py-0.5 rounded text-xs text-gray-400 hover:text-white border border-white/10 bg-white/5"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="ml-auto text-xs text-gray-500 hidden sm:block">
          {filtered.length} genres · hover to highlight · scroll to zoom · click for details
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden bg-gray-950">
        <svg ref={svgRef} className="w-full h-full" />

        {tooltip && (
          <div
            className="absolute pointer-events-none bg-gray-800 border border-white/10 text-white text-xs rounded-md px-2.5 py-1.5 shadow-xl whitespace-nowrap z-20"
            style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
          >
            {tooltip.text}
          </div>
        )}

        <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur border border-white/5 rounded-lg p-3">
          <p className="text-gray-500 text-xs mb-2 font-semibold uppercase tracking-wider">Families</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(FAMILY_COLORS).map(([family, col]) => (
              <div key={family} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col.primary }} />
                <span className="text-gray-400 text-xs capitalize">{family}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute top-4 right-4 text-gray-600 text-xs space-y-1 text-right pointer-events-none">
          <p>Hover a node to reveal its branches</p>
          <p>Double-click to reset the view</p>
        </div>
      </div>
    </div>
  );
}
