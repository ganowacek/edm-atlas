import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import genres from '../data/genres';
import { getFamilyColor, FAMILY_COLORS } from '../data/colors';
import type { Genre } from '../types';
import { Search, X, Filter } from 'lucide-react';

interface MapPageProps {
  onSelectGenre: (genre: Genre) => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  genre: Genre;
  radius: number;
  isRoot: boolean;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: GraphNode | string;
  target: GraphNode | string;
}

const NODE_RADIUS: Record<string, number> = {
  root: 24,
  sub: 14,
};

export default function MapPage({ onSelectGenre }: MapPageProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const [search, setSearch] = useState('');
  const [activeFamily, setActiveFamily] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const filtered = genres.filter((g) => {
    const matchSearch = search === '' ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.family.toLowerCase().includes(search.toLowerCase()) ||
      g.originCities.some((c) => c.toLowerCase().includes(search.toLowerCase())) ||
      g.moods.some((m) => m.toLowerCase().includes(search.toLowerCase()));
    const matchFamily = !activeFamily || g.family === activeFamily;
    return matchSearch && matchFamily;
  });

  const buildGraph = useCallback(() => {
    if (!svgRef.current) return;

    const container = svgRef.current.parentElement!;
    const W = container.clientWidth;
    const H = container.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', W).attr('height', H);

    // Zoom group
    const g = svg.append('g').attr('class', 'graph-root');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (e) => g.attr('transform', e.transform));

    svg.call(zoom);

    // Double-click to reset
    svg.on('dblclick.zoom', () => {
      svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
    });

    const visibleIds = new Set(filtered.map((g) => g.id));

    const nodes: GraphNode[] = filtered.map((g) => ({
      id: g.id,
      genre: g,
      radius: g.parentId ? NODE_RADIUS.sub : NODE_RADIUS.root,
      isRoot: !g.parentId,
    }));

    const links: GraphLink[] = filtered
      .filter((g) => g.parentId && visibleIds.has(g.parentId))
      .map((g) => ({ source: g.parentId!, target: g.id }));

    // Defs
    const defs = svg.append('defs');

    // Glow filter per family
    Object.entries(FAMILY_COLORS).forEach(([family, col]) => {
      const filter = defs.append('filter').attr('id', `glow-${family}`);
      filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
      const merge = filter.append('feMerge');
      merge.append('feMergeNode').attr('in', 'coloredBlur');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');
    });

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'rgba(255,255,255,0.08)')
      .attr('stroke-width', 1);

    // Node groups
    const node = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (e, d) => {
            if (!e.active && simRef.current) simRef.current.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (e, d) => {
            d.fx = e.x;
            d.fy = e.y;
          })
          .on('end', (e, d) => {
            if (!e.active && simRef.current) simRef.current.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Circle
    node.append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => {
        const col = getFamilyColor(d.genre.family);
        return d.isRoot ? col.primary : `${col.glow}bb`;
      })
      .attr('stroke', (d) => getFamilyColor(d.genre.family).primary)
      .attr('stroke-width', (d) => d.isRoot ? 2 : 1)
      .attr('filter', (d) => d.isRoot ? `url(#glow-${d.genre.family})` : null as unknown as string);

    // Label
    node.append('text')
      .text((d) => d.genre.name)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => d.isRoot ? '0.35em' : '0.35em')
      .attr('font-size', (d) => d.isRoot ? '11px' : '9px')
      .attr('font-weight', (d) => d.isRoot ? '700' : '500')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none')
      .style('text-shadow', '0 1px 3px rgba(0,0,0,0.8)');

    // Interactions
    node
      .on('mouseenter', (event, d) => {
        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip({
          text: `${d.genre.name} · ${d.genre.originDecade} · ${d.genre.bpmRange ?? 'Variable BPM'}`,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top - 12,
        });
        d3.select<SVGGElement, GraphNode>(event.currentTarget as SVGGElement)
          .select('circle')
          .transition()
          .duration(150)
          .attr('r', d.radius * 1.3);
      })
      .on('mousemove', (event) => {
        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip((prev) => prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top - 12 } : null);
      })
      .on('mouseleave', (event, d) => {
        setTooltip(null);
        d3.select<SVGGElement, GraphNode>(event.currentTarget as SVGGElement)
          .select('circle')
          .transition()
          .duration(150)
          .attr('r', d.radius);
      })
      .on('click', (_event, d) => {
        onSelectGenre(d.genre);
      });

    // Force simulation
    const sim = d3.forceSimulation<GraphNode, GraphLink>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id((d) => d.id).distance((l) => {
        const s = l.source as GraphNode;
        return s.isRoot ? 140 : 80;
      }).strength(0.5))
      .force('charge', d3.forceManyBody<GraphNode>().strength((d) => d.isRoot ? -500 : -150))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide<GraphNode>().radius((d) => d.radius + 10))
      .on('tick', () => {
        link
          .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
          .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
          .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
          .attr('y2', (d) => (d.target as GraphNode).y ?? 0);
        node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

    simRef.current = sim;

    // Auto-stop after settling
    setTimeout(() => sim.stop(), 6000);

    // Initial gentle zoom to fit
    setTimeout(() => {
      svg.transition().duration(400).call(
        zoom.transform,
        d3.zoomIdentity.translate(W / 2, H / 2).scale(0.85).translate(-W / 2, -H / 2)
      );
    }, 500);
  }, [filtered, onSelectGenre]);

  useEffect(() => {
    buildGraph();
    const ro = new ResizeObserver(buildGraph);
    const el = svgRef.current?.parentElement;
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [buildGraph]);

  return (
    <div className="h-screen flex flex-col pt-14">
      {/* Controls bar */}
      <div className="flex-shrink-0 bg-gray-900/80 backdrop-blur border-b border-white/5 px-4 py-2 flex items-center gap-3 flex-wrap">
        {/* Search */}
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
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Family filter */}
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
          {filtered.length} genres · scroll to zoom · drag to pan · click for details
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 relative overflow-hidden bg-gray-950">
        <svg ref={svgRef} className="w-full h-full" />

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-gray-800 border border-white/10 text-white text-xs rounded-md px-2.5 py-1.5 shadow-xl whitespace-nowrap z-20"
            style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
          >
            {tooltip.text}
          </div>
        )}

        {/* Legend */}
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

        {/* Instructions overlay (fades out) */}
        <div className="absolute top-4 right-4 text-gray-600 text-xs space-y-1 text-right pointer-events-none">
          <p>Drag nodes • Click for details</p>
          <p>Double-click to reset zoom</p>
        </div>
      </div>
    </div>
  );
}
