import {
  forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback, useMemo,
} from 'react';
import * as d3 from 'd3';
import { GitBranch, Minus, Plus, RotateCcw } from 'lucide-react';
import type { ArtistNode, Genre } from '../types';
import { getFamilyColor } from '../data/colors';

const HUB_ID = '__edm__';

type Kind = 'hub' | 'family' | 'sub' | 'artist';

interface GNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  kind: Kind;
  family: string;
  genre: Genre | null;
  artist: ArtistNode | null;
  parentGenreId?: string;
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
  onSelectArtist: (artist: ArtistNode) => void;
}

const R: Record<Kind, number> = { hub: 26, family: 15, sub: 8.5, artist: 6.5 };
const COLLIDE: Record<Kind, number> = { hub: 38, family: 36, sub: 30, artist: 22 };
const LABEL_ZOOM = 1.25;
const ARTIST_LABEL_ZOOM = 1.7;

function truncate(s: string, n = 18) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function musicSearchUrl(service: 'spotify' | 'apple', name: string) {
  const encoded = encodeURIComponent(name);
  if (service === 'spotify') return `https://open.spotify.com/search/${encoded}`;
  return `https://music.apple.com/us/search?term=${encoded}`;
}

function clampPadding(d: GNode) {
  const labelWidth = d.kind === 'hub' ? 0 : Math.min(92, d.name.length * (d.kind === 'artist' ? 2.7 : d.kind === 'sub' ? 3.2 : 3.8));
  return {
    x: Math.max(R[d.kind] + 8, labelWidth),
    y: d.kind === 'hub' ? R[d.kind] + 8 : R[d.kind] + 24,
  };
}

function artistNodesForGenre(genre: Genre): ArtistNode[] {
  const primary = genre.artists.map((artist) => ({
    id: `artist:${genre.id}:${slugify(artist.name)}`,
    name: artist.name,
    importance: artist.importance,
    history: [
      artist.importance,
      `${artist.name} appears here through the ${genre.name} branch, where the surrounding scene was shaped by ${genre.originCities.slice(0, 2).join(' and ') || 'its core club communities'}.`,
      ...(genre.history?.slice(0, 1) ?? []),
    ],
    spotifyUrl: artist.spotifyUrl,
    appleMusicUrl: artist.appleMusicUrl,
    genreId: genre.id,
    genreName: genre.name,
    family: genre.family,
    primary: true,
  }));

  const more = (genre.moreArtists ?? []).map((name) => ({
    id: `artist:${genre.id}:${slugify(name)}`,
    name,
    importance: `${name} is part of the broader ${genre.name} listening path in EDM Atlas.`,
    history: [
      `${name} is part of the broader ${genre.name} listening path in EDM Atlas.`,
      `${genre.name} is connected to ${genre.influences.slice(0, 3).join(', ') || 'the wider electronic music lineage'} and helped shape ${genre.influenced.slice(0, 3).join(', ') || 'later club sounds'}.`,
      ...(genre.history?.slice(0, 1) ?? []),
    ],
    spotifyUrl: musicSearchUrl('spotify', name),
    appleMusicUrl: musicSearchUrl('apple', name),
    genreId: genre.id,
    genreName: genre.name,
    family: genre.family,
    primary: false,
  }));

  const seen = new Set<string>();
  return [...primary, ...more].filter((artist) => {
    const key = artist.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const GraphExplorer = forwardRef<GraphHandle, Props>(function GraphExplorer(
  { genres, selectedId, onSelect, onSelectArtist },
  ref
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedArtists, setExpandedArtists] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(selectedId);
  const zoomKRef = useRef(1);
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

  const updateLabelVisibility = useCallback(() => {
    const e = eng.current;
    if (!e) return;

    const activeId = hoveredIdRef.current ?? selectedIdRef.current;
    let focus: Set<string> | null = null;
    if (activeId) {
      const node = e.nodeById.get(activeId);
        if (node) {
          focus = new Set([activeId]);
        if (node.kind === 'artist' && node.parentGenreId) { focus.add(node.parentGenreId); }
        if (node.kind === 'sub' && node.genre?.parentId) { focus.add(node.genre.parentId); focus.add(HUB_ID); }
        if (node.kind === 'family') {
          focus.add(HUB_ID);
          e.nodes.forEach((n) => { if (n.genre?.parentId === node.id) focus!.add(n.id); });
        }
        if (node.kind === 'hub') e.nodes.forEach((n) => focus!.add(n.id));
      }
    }

    e.gNode.selectAll<SVGGElement, GNode>('g.gnode').select<SVGTextElement>('text.lbl')
      .interrupt()
      .text((d) => d.kind === 'sub' || d.kind === 'artist' ? truncate(d.name) : d.name)
      .attr('font-size', (d) => d.kind === 'hub' ? '12px' : d.kind === 'family' ? '11px' : d.kind === 'artist' ? '8.5px' : '9.5px')
      .attr('font-weight', (d) => d.kind === 'sub' || d.kind === 'artist' ? 500 : 700)
      .attr('dy', (d) => d.kind === 'hub' ? 4 : R[d.kind] + 12)
      .style('display', (d) => {
        if (d.kind === 'hub' || d.kind === 'family') return null;
        if (focus && focus.has(d.id)) return null;
        if (d.kind === 'artist') return zoomKRef.current >= ARTIST_LABEL_ZOOM ? null : 'none';
        if (zoomKRef.current >= LABEL_ZOOM) return null;
        return 'none';
      })
      .style('opacity', (d) => {
        if (d.kind === 'hub' || d.kind === 'family') return 1;
        if (focus && focus.has(d.id)) return 1;
        if (d.kind === 'artist') return zoomKRef.current >= ARTIST_LABEL_ZOOM ? 1 : 0;
        if (zoomKRef.current >= LABEL_ZOOM) return 1;
        return 0;
      });
  }, []);

  useEffect(() => {
    hoveredIdRef.current = hoveredId;
    selectedIdRef.current = selectedId;
    updateLabelVisibility();
  }, [hoveredId, selectedId, updateLabelVisibility]);

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
  const desiredNodes = useCallback((): { id: string; genre: Genre | null; artist: ArtistNode | null; kind: Kind; parentGenreId?: string }[] => {
    const out: { id: string; genre: Genre | null; artist: ArtistNode | null; kind: Kind; parentGenreId?: string }[] = [
      { id: HUB_ID, genre: null, artist: null, kind: 'hub' },
    ];
    const expandedFamilies = showAll ? new Set(families.map((f) => f.id)) : expanded;

    families.forEach((f) => {
      out.push({ id: f.id, genre: f, artist: null, kind: 'family' });
      if (expandedFamilies.has(f.id)) {
        (subsByParent.get(f.id) ?? []).forEach((s) => out.push({ id: s.id, genre: s, artist: null, kind: 'sub' }));
      }
    });
    const visibleGenreIds = new Set(out.filter((node) => node.genre).map((node) => node.id));
    const expandedArtistBranches = showAll ? visibleGenreIds : expandedArtists;
    out.filter((node) => node.genre && expandedArtistBranches.has(node.id) && visibleGenreIds.has(node.id))
      .forEach((node) => {
        artistNodesForGenre(node.genre!).forEach((artist) => {
          out.push({ id: artist.id, genre: node.genre, artist, kind: 'artist', parentGenreId: node.id });
        });
      });
    return out;
  }, [families, expanded, expandedArtists, showAll, subsByParent]);

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
        zoomKRef.current = e.transform.k;
        updateLabelVisibility();
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
          .distance((l) => ((l.target as GNode).kind === 'artist' ? 72 : (l.source as GNode).kind === 'hub' ? ring1 : 84))
          .strength((l) => ((l.target as GNode).kind === 'artist' ? 0.26 : (l.source as GNode).kind === 'hub' ? 0.08 : 0.42))
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
          (d) => (d.kind === 'hub' ? 0 : d.kind === 'family' ? ring1 : d.kind === 'artist' ? ring2 + 70 : ring2),
          cx, cy
        ).strength((d) => (d.kind === 'hub' ? 1 : d.kind === 'family' ? 0.45 : d.kind === 'artist' ? 0.1 : 0.16))
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
      artist: null,
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
        (d) => (d.kind === 'hub' ? 0 : d.kind === 'family' ? Math.min(e.W, e.H) * 0.27 : d.kind === 'artist' ? Math.min(e.W, e.H) * 0.42 + 70 : Math.min(e.W, e.H) * 0.42),
        e.W / 2, e.H / 2
      ).strength((d) => (d.kind === 'hub' ? 1 : d.kind === 'family' ? 0.45 : d.kind === 'artist' ? 0.1 : 0.14)));
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
      } else if (w.kind === 'artist' && w.parentGenreId) {
        const arr = newSubsByParent.get(w.parentGenreId) ?? [];
        arr.push(w.id);
        newSubsByParent.set(w.parentGenreId, arr);
      }
    });

    want.forEach((w) => {
      if (e.nodeById.has(w.id)) return;
      let sx = cx, sy = cy;
      const parentId = w.kind === 'artist' ? w.parentGenreId : w.genre?.parentId;
      if ((w.kind === 'sub' || w.kind === 'artist') && parentId) {
        const p = e.nodeById.get(parentId);
        if (p) {
          const px = p.x ?? cx, py = p.y ?? cy;
          // direction from hub outward through the parent
          const outAng = Math.atan2(py - cy, px - cx);
          const siblings = newSubsByParent.get(parentId) ?? [w.id];
          const idx = siblings.indexOf(w.id);
          const spread = w.kind === 'artist' ? Math.PI * 1.25 : Math.PI * 0.9;
          const a = outAng + (idx - (siblings.length - 1) / 2) * (spread / Math.max(siblings.length, 1));
          const dist = w.kind === 'artist' ? 74 : 52;
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
        id: w.id, name: w.artist?.name ?? w.genre?.name ?? 'EDM', kind: w.kind,
        family: w.genre?.family ?? 'hub', genre: w.genre,
        artist: w.artist,
        parentGenreId: w.parentGenreId,
        childCount: w.kind === 'family' ? (subsByParent.get(w.id) ?? []).length : w.genre ? artistNodesForGenre(w.genre).length : 0,
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
      if (n.kind === 'artist' && n.parentGenreId && e.nodeById.has(n.parentGenreId)) {
        e.links.push({ source: n.parentGenreId, target: n.id });
      }
    });

    e.sim.nodes(e.nodes);
    (e.sim.force('link') as d3.ForceLink<GNode, GLink>).links(e.links);
    (e.sim.force('link') as d3.ForceLink<GNode, GLink>)
      .distance((l) => ((l.target as GNode).kind === 'artist' ? 72 : (l.source as GNode).kind === 'hub' ? Math.min(e.W, e.H) * 0.27 : 84))
      .strength((l) => ((l.target as GNode).kind === 'artist' ? 0.26 : (l.source as GNode).kind === 'hub' ? 0.08 : 0.42));

    // join links
    e.gLink.selectAll<SVGLineElement, GLink>('line')
      .data(e.links, (d) => `${(d.source as GNode).id ?? d.source}->${(d.target as GNode).id ?? d.target}`)
      .join(
        (enter) => enter.append('line')
          .attr('stroke-width', (d) => ((d.target as GNode).kind === 'artist' ? 0.8 : 1))
          .attr('stroke', (d) => {
            const target = d.target as GNode;
            return target.kind === 'artist'
              ? `${getFamilyColor(target.family).primary}88`
              : 'rgba(255,255,255,0.08)';
          })
          .attr('stroke-dasharray', (d) => ((d.target as GNode).kind === 'artist' ? '2 4' : null))
          .attr('opacity', 0)
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
            .attr('fill', (d) => d.kind === 'hub' ? '#1a1722' : d.kind === 'family' ? getFamilyColor(d.family).primary : d.kind === 'artist' ? '#0f0f14' : getFamilyColor(d.family).glow)
            .attr('stroke', (d) => d.kind === 'hub' ? '#8b80e0' : getFamilyColor(d.family).primary)
            .attr('stroke-width', (d) => d.kind === 'family' ? 1.8 : d.kind === 'hub' ? 2.2 : d.kind === 'artist' ? 1 : 1.2);
          // expand indicator ring for families with children
          g.filter((d) => d.kind !== 'artist' && d.kind !== 'hub' && d.childCount > 0)
            .append('circle').attr('class', 'expand-ring')
            .attr('r', (d) => R[d.kind] + 4).attr('fill', 'none')
            .attr('stroke', (d) => getFamilyColor(d.family).primary)
            .attr('stroke-width', 1).attr('stroke-dasharray', '2 3').attr('opacity', 0.5);
          g.append('text').attr('class', 'lbl')
            .attr('text-anchor', 'middle')
            .attr('fill', '#f4f4f6')
            .attr('pointer-events', 'none')
            .style('text-shadow', '0 1px 5px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)')
            .text((d) => d.kind === 'sub' || d.kind === 'artist' ? truncate(d.name) : d.name)
            .attr('font-size', (d) => d.kind === 'hub' ? '12px' : d.kind === 'family' ? '11px' : d.kind === 'artist' ? '8.5px' : '9.5px')
            .attr('font-weight', (d) => d.kind === 'sub' || d.kind === 'artist' ? 500 : 700)
            .attr('dy', (d) => d.kind === 'hub' ? 4 : R[d.kind] + 12)
            .style('display', (d) => d.kind === 'sub' || d.kind === 'artist' ? 'none' : null)
            .style('opacity', (d) => d.kind === 'sub' || d.kind === 'artist' ? 0 : 1);
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
            sub: d.kind === 'artist' && d.artist ? `Artist · ${d.artist.genreName}` : d.genre ? `${d.genre.originDecade}${d.genre.bpmRange ? ' · ' + d.genre.bpmRange : ''}` : '',
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
        if (d.kind === 'hub') { setShowAll(false); setExpanded(new Set()); setExpandedArtists(new Set()); return; }
        if (d.kind === 'artist' && d.artist) {
          onSelectArtist(d.artist);
          return;
        }
        if (d.kind === 'family') {
          setShowAll(false);
          setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(d.id)) next.delete(d.id); else next.add(d.id);
            return next;
          });
        }
        if (d.genre) {
          setShowAll(false);
          setExpandedArtists((prev) => (prev.has(d.id) && prev.size === 1 ? new Set() : new Set([d.id])));
          onSelect(d.genre);
        }
      });

    if (instant) e.sim.alpha(0.9).restart();
    else e.sim.alpha(0.7).alphaTarget(0).velocityDecay(0.38).restart();
    updateLabelVisibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desiredNodes, families, onSelect, onSelectArtist, updateLabelVisibility]);

  // run structural update when expansion / data changes
  useEffect(() => {
    if (eng.current) updateGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, expandedArtists, showAll, genres]);

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
        if (node.kind === 'artist' && node.parentGenreId) { focus.add(node.parentGenreId); }
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
      .attr('stroke-width', (d) => (d.id === selectedId ? 3 : d.kind === 'family' ? 1.8 : d.kind === 'hub' ? 2.2 : d.kind === 'artist' ? 1 : 1.2));

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
        const target = l.target as GNode;
        if (target.kind === 'artist') return focus ? `${getFamilyColor(target.family).primary}33` : `${getFamilyColor(target.family).primary}88`;
        return focus ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)';
      })
      .attr('stroke-width', (l) => {
        const s = (l.source as GNode).id, t = (l.target as GNode).id;
        const target = l.target as GNode;
        if (focus && focus.has(s) && focus.has(t)) return target.kind === 'artist' ? 1.2 : 1.8;
        return target.kind === 'artist' ? 0.8 : 1;
      });

    updateLabelVisibility();
  }, [selectedId, hoveredId, expanded, updateLabelVisibility]);

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
    setShowAll(false);
    setExpandedArtists(new Set([genre.id]));
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
    collapseAll: () => { setShowAll(false); setExpanded(new Set()); setExpandedArtists(new Set()); },
  }), [focusGenre]);

  const resetZoom = () => {
    const e = eng.current;
    if (!e || !svgRef.current) return;
    d3.select(svgRef.current).transition().duration(450).call(e.zoom.transform, d3.zoomIdentity);
  };

  const toggleAll = () => {
    setShowAll((value) => {
      const next = !value;
      if (next) {
        setExpanded(new Set(families.map((family) => family.id)));
        setExpandedArtists(new Set());
      } else {
        setExpanded(new Set());
        setExpandedArtists(new Set());
      }
      return next;
    });
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
        <button onClick={toggleAll}
          className="w-9 h-9 rounded-lg flex items-center justify-center border transition-colors hover:bg-white/5"
          style={{
            background: showAll ? 'var(--accent)' : 'var(--surface-1)',
            borderColor: showAll ? 'var(--accent)' : 'var(--border)',
            color: showAll ? '#0a0a0e' : 'var(--text-2)',
          }} aria-label={showAll ? 'Collapse all families' : 'Expand all families'}>
          <GitBranch size={15} />
        </button>
        <button onClick={() => { const e = eng.current; if (e && svgRef.current) d3.select(svgRef.current).transition().duration(200).call(e.zoom.scaleBy, 1.3); }}
          className="w-9 h-9 rounded-lg flex items-center justify-center border transition-colors hover:bg-white/5"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-2)' }} aria-label="Zoom in">
          <Plus size={16} />
        </button>
        <button onClick={() => { const e = eng.current; if (e && svgRef.current) d3.select(svgRef.current).transition().duration(200).call(e.zoom.scaleBy, 1 / 1.3); }}
          className="w-9 h-9 rounded-lg flex items-center justify-center border transition-colors hover:bg-white/5"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-2)' }} aria-label="Zoom out">
          <Minus size={16} />
        </button>
        <button onClick={resetZoom}
          className="w-9 h-9 rounded-lg flex items-center justify-center border transition-colors hover:bg-white/5"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-2)' }} aria-label="Reset view">
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
});

export default GraphExplorer;
