import {
  forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback, useMemo,
} from 'react';
import * as d3 from 'd3';
import { GitBranch, Minus, Plus, RotateCcw } from 'lucide-react';
import type { ArtistNode, Genre, TrackNode } from '../types';
import { getFamilyColor } from '../data/colors';
import { artistNodesForGenre, orphanKeyArtistsForFamily } from '../data/artistNodes';

const HUB_ID = '__edm__';

type Kind = 'hub' | 'family' | 'sub' | 'artist' | 'track';

interface GNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  kind: Kind;
  family: string;
  genre: Genre | null;
  artist: ArtistNode | null;
  track: TrackNode | null;
  parentGenreId?: string;
  parentArtistId?: string;
  childCount: number;
}

interface GLink extends d3.SimulationLinkDatum<GNode> {
  source: GNode | string;
  target: GNode | string;
}

export interface GraphHandle {
  focusGenre: (genreId: string) => void;
  focusArtist: (genreId: string, artistId: string) => void;
  collapseAll: () => void;
}

interface Props {
  genres: Genre[];
  selectedId: string | null;
  onSelect: (genre: Genre) => void;
  onSelectArtist: (artist: ArtistNode) => void;
  onSelectTrack: (track: TrackNode) => void;
}

const R: Record<Kind, number> = { hub: 26, family: 15, sub: 8.5, artist: 6.5, track: 4.6 };
const COLLIDE: Record<Kind, number> = { hub: 42, family: 48, sub: 40, artist: 34, track: 24 };
const LABEL_ZOOM = 1.25;
const ARTIST_LABEL_ZOOM = 1.7;
const TRACK_LABEL_ZOOM = 2.15;
const LABEL_VIEWPORT_MARGIN = 96;

function linkFamilyColor(link: GLink) {
  const target = link.target as GNode;
  const source = link.source as GNode;
  const family = target.family !== 'hub' ? target.family : source.family;
  return getFamilyColor(family).primary;
}

function linkOpacity(link: GLink) {
  const target = link.target as GNode;
  if (target.kind === 'track') return 0.68;
  if (target.kind === 'artist') return 0.6;
  if (target.kind === 'sub') return 0.55;
  return 0.32;
}

function linkWidth(link: GLink) {
  const target = link.target as GNode;
  if (target.kind === 'track') return 0.9;
  if (target.kind === 'artist') return 1.1;
  if (target.kind === 'sub') return 1.35;
  return 1;
}

function truncate(s: string, n = 18) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function layoutMetrics(width: number, height: number, nodeCount: number) {
  const minViewport = Math.min(width, height);
  const expandedSpan = Math.sqrt(Math.max(nodeCount, 1)) * 78;
  const span = Math.max(minViewport, expandedSpan);
  return {
    cx: width / 2,
    cy: height / 2,
    ring1: span * 0.23,
    ring2: span * 0.5,
    artistRing: span * 0.5 + 94,
    trackRing: span * 0.5 + 148,
  };
}

function radialDistance(d: GNode, metrics: ReturnType<typeof layoutMetrics>) {
  if (d.kind === 'hub') return 0;
  if (d.kind === 'family') return metrics.ring1;
  if (d.kind === 'artist') return metrics.artistRing;
  if (d.kind === 'track') return metrics.trackRing;
  return metrics.ring2;
}

function radialStrength(d: GNode) {
  if (d.kind === 'hub') return 1;
  if (d.kind === 'family') return 0.42;
  if (d.kind === 'artist') return 0.08;
  if (d.kind === 'track') return 0.07;
  return 0.12;
}

const GraphExplorer = forwardRef<GraphHandle, Props>(function GraphExplorer(
  { genres, selectedId, onSelect, onSelectArtist, onSelectTrack },
  ref
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedArtists, setExpandedArtists] = useState<Set<string>>(new Set());
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(selectedId);
  const zoomKRef = useRef(1);
  const isSettlingRef = useRef(false);
  const currentTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const isInteractingRef = useRef(false);
  const interactionTimerRef = useRef<number | null>(null);
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

  const labelIsInViewport = useCallback((node: GNode) => {
    const e = eng.current;
    if (!e || node.x == null || node.y == null) return true;
    const transform = currentTransformRef.current;
    const labelY = node.y + (node.kind === 'hub' ? 4 : R[node.kind] + 12);
    const screenX = node.x * transform.k + transform.x;
    const screenY = labelY * transform.k + transform.y;
    return screenX >= -LABEL_VIEWPORT_MARGIN
      && screenX <= e.W + LABEL_VIEWPORT_MARGIN
      && screenY >= -LABEL_VIEWPORT_MARGIN
      && screenY <= e.H + LABEL_VIEWPORT_MARGIN;
  }, []);

  const labelShouldRender = useCallback((node: GNode, focus: Set<string> | null) => {
    if (!labelIsInViewport(node)) return false;
    // While dragging/zooming or the simulation is settling, nodes (including
    // family nodes) are moving on screen — hide every non-anchor label so
    // moving text can't trail.
    const moving = isInteractingRef.current || isSettlingRef.current;
    if (moving && node.kind !== 'hub') return false;
    if (node.kind === 'hub' || node.kind === 'family') return true;
    if (focus && focus.has(node.id)) return true;
    if (node.kind === 'track') return zoomKRef.current >= TRACK_LABEL_ZOOM;
    if (node.kind === 'artist') return zoomKRef.current >= ARTIST_LABEL_ZOOM;
    return zoomKRef.current >= LABEL_ZOOM;
  }, [labelIsInViewport]);

  const validateGraphIntegrity = useCallback(() => {
    if (!import.meta.env.DEV) return;
    const e = eng.current;
    if (!e) return;
    const groups = e.gNode.selectAll<SVGGElement, GNode>('g.gnode').nodes();
    const ids = new Set<string>();
    const duplicateIds: string[] = [];
    const missingLabels: string[] = [];
    let detachedLabels = 0;

    groups.forEach((group) => {
      const datum = d3.select<SVGGElement, GNode>(group).datum();
      if (!datum?.id) return;
      if (ids.has(datum.id)) duplicateIds.push(datum.id);
      ids.add(datum.id);
      if (!group.querySelector('text.lbl')) missingLabels.push(datum.id);
    });

    e.gNode.selectAll<SVGTextElement, GNode>('text.lbl').nodes().forEach((label) => {
      if (!label.closest('g.gnode')) detachedLabels += 1;
    });

    if (groups.length !== e.nodes.length || missingLabels.length || duplicateIds.length || detachedLabels) {
      console.warn('EDM Atlas graph label integrity warning', {
        expectedNodes: e.nodes.length,
        renderedNodes: groups.length,
        missingLabels,
        duplicateIds,
        detachedLabels,
      });
    }
  }, []);

  const updateLabelVisibility = useCallback(() => {
    const e = eng.current;
    if (!e) return;

    const activeId = hoveredIdRef.current ?? selectedIdRef.current;
    let focus: Set<string> | null = null;
    if (activeId) {
      const node = e.nodeById.get(activeId);
      if (node) {
        focus = new Set([activeId]);
        if (node.kind === 'track' && node.parentArtistId) {
          focus.add(node.parentArtistId);
          const artistNode = e.nodeById.get(node.parentArtistId);
          if (artistNode?.parentGenreId) focus.add(artistNode.parentGenreId);
        }
        if (node.kind === 'artist' && node.parentGenreId) {
          focus.add(node.parentGenreId);
          e.nodes.forEach((n) => { if (n.parentArtistId === node.id) focus!.add(n.id); });
        }
        if (node.kind === 'sub' && node.genre?.parentId) { focus.add(node.genre.parentId); focus.add(HUB_ID); }
        if (node.kind === 'family') {
          focus.add(HUB_ID);
          e.nodes.forEach((n) => { if (n.genre?.parentId === node.id || n.parentGenreId === node.id) focus!.add(n.id); });
        }
        if (node.kind === 'hub') e.nodes.forEach((n) => focus!.add(n.id));
      }
    }

    e.gNode.selectAll<SVGGElement, GNode>('g.gnode').select<SVGTextElement>('text.lbl')
      .interrupt()
      .text((d) => d.kind === 'sub' || d.kind === 'artist' || d.kind === 'track' ? truncate(d.name) : d.name)
      .attr('font-size', (d) => d.kind === 'hub' ? '12px' : d.kind === 'family' ? '11px' : d.kind === 'artist' ? '8.5px' : d.kind === 'track' ? '7.5px' : '9.5px')
      .attr('font-weight', (d) => d.kind === 'sub' || d.kind === 'artist' || d.kind === 'track' ? 500 : 700)
      .attr('dy', (d) => d.kind === 'hub' ? 4 : R[d.kind] + 12)
      .style('display', (d) => (labelShouldRender(d, focus) ? null : 'none'))
      .style('opacity', (d) => (labelShouldRender(d, focus) ? 1 : 0));
  }, [labelShouldRender]);

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
  const desiredNodes = useCallback((): { id: string; genre: Genre | null; artist: ArtistNode | null; track: TrackNode | null; kind: Kind; parentGenreId?: string; parentArtistId?: string }[] => {
    const out: { id: string; genre: Genre | null; artist: ArtistNode | null; track: TrackNode | null; kind: Kind; parentGenreId?: string; parentArtistId?: string }[] = [
      { id: HUB_ID, genre: null, artist: null, track: null, kind: 'hub' },
    ];
    const expandedFamilies = showAll ? new Set(families.map((f) => f.id)) : expanded;

    families.forEach((f) => {
      out.push({ id: f.id, genre: f, artist: null, track: null, kind: 'family' });
      if (expandedFamilies.has(f.id)) {
        (subsByParent.get(f.id) ?? []).forEach((s) => out.push({ id: s.id, genre: s, artist: null, track: null, kind: 'sub' }));
        if (!showAll) {
          // Key artists with no matching subgenre get their own node directly under the family.
          orphanKeyArtistsForFamily(f, genres).forEach((artist) => {
            out.push({ id: artist.id, genre: f, artist, track: null, kind: 'artist', parentGenreId: f.id });
            if (expandedTracks.has(artist.id)) {
              artist.tracks.forEach((track) => {
                out.push({
                  id: track.id,
                  genre: f,
                  artist,
                  track,
                  kind: 'track',
                  parentGenreId: f.id,
                  parentArtistId: artist.id,
                });
              });
            }
          });
        }
      }
    });
    const visibleGenreIds = new Set(out.filter((node) => node.genre).map((node) => node.id));
    const expandedArtistBranches = expandedArtists;
    out.filter((node) => node.genre && expandedArtistBranches.has(node.id) && visibleGenreIds.has(node.id))
      .forEach((node) => {
        const visibleChildGenres = (subsByParent.get(node.id) ?? []).filter((child) => visibleGenreIds.has(child.id));
        if (visibleChildGenres.length > 0) return;
        artistNodesForGenre(node.genre!).forEach((artist) => {
          out.push({ id: artist.id, genre: node.genre, artist, track: null, kind: 'artist', parentGenreId: node.id });
          if (expandedTracks.has(artist.id)) {
            artist.tracks.forEach((track) => {
              out.push({
                id: track.id,
                genre: node.genre,
                artist,
                track,
                kind: 'track',
                parentGenreId: node.id,
                parentArtistId: artist.id,
              });
            });
          }
        });
      });
    return out;
  }, [families, genres, expanded, expandedArtists, expandedTracks, showAll, subsByParent]);

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
      .on('start', () => {
        isInteractingRef.current = true;
        if (interactionTimerRef.current) window.clearTimeout(interactionTimerRef.current);
        updateLabelVisibility();
      })
      .on('zoom', (e) => {
        currentTransformRef.current = e.transform;
        root.attr('transform', e.transform.toString());
        zoomKRef.current = e.transform.k;
        updateLabelVisibility();
      })
      .on('end', () => {
        if (interactionTimerRef.current) window.clearTimeout(interactionTimerRef.current);
        interactionTimerRef.current = window.setTimeout(() => {
          isInteractingRef.current = false;
          updateLabelVisibility();
        }, 110);
      });
    svg.call(zoom);
    svg.on('dblclick.zoom', null);

    const metrics = layoutMetrics(W, H, families.length + 1);

    const sim = d3
      .forceSimulation<GNode, GLink>([])
      .force(
        'link',
        d3
          .forceLink<GNode, GLink>([])
          .id((d) => d.id)
          .distance((l) => ((l.target as GNode).kind === 'track' ? 54 : (l.target as GNode).kind === 'artist' ? 86 : (l.source as GNode).kind === 'hub' ? metrics.ring1 : 104))
          .strength((l) => ((l.target as GNode).kind === 'track' ? 0.5 : (l.target as GNode).kind === 'artist' ? 0.26 : (l.source as GNode).kind === 'hub' ? 0.08 : 0.42))
      )
      .force(
        'charge',
        d3.forceManyBody<GNode>().strength((d) =>
          d.kind === 'hub' ? -160 : d.kind === 'family' ? -860 : d.kind === 'artist' ? -260 : d.kind === 'track' ? -110 : -360
        ).distanceMax(Math.max(720, metrics.trackRing * 1.25))
      )
      .force(
        'radial',
        d3.forceRadial<GNode>(
          (d) => radialDistance(d, metrics),
          cx, cy
        ).strength(radialStrength)
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
          d.x = d.x ?? cx;
          d.y = d.y ?? cy;
          return `translate(${d.x},${d.y})`;
        });
      // While the simulation is hot (nodes moving), hide labels so moving
      // SVG text can't leave paint trails on mobile Safari. Restore on settle.
      const hot = e.sim.alpha() > 0.08;
      if (hot !== isSettlingRef.current) {
        isSettlingRef.current = hot;
        updateLabelVisibility();
      }
    });
    sim.on('end', () => {
      isSettlingRef.current = false;
      updateLabelVisibility();
      validateGraphIntegrity();
    });

    const hub: GNode = {
      id: HUB_ID, name: 'EDM', kind: 'hub', family: 'hub', genre: null,
      artist: null, track: null,
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
      const nextMetrics = layoutMetrics(e.W, e.H, e.nodes.length);
      e.sim.force('radial', d3.forceRadial<GNode>(
        (d) => radialDistance(d, nextMetrics),
        e.W / 2, e.H / 2
      ).strength(radialStrength));
      e.sim.alpha(0.3).restart();
    });
    ro.observe(container);

    return () => {
      if (interactionTimerRef.current) window.clearTimeout(interactionTimerRef.current);
      ro.disconnect();
      sim.stop();
    };
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
    const metrics = layoutMetrics(e.W, e.H, want.length);

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
      } else if (w.kind === 'track' && w.parentArtistId) {
        const arr = newSubsByParent.get(w.parentArtistId) ?? [];
        arr.push(w.id);
        newSubsByParent.set(w.parentArtistId, arr);
      }
    });

    want.forEach((w) => {
      if (e.nodeById.has(w.id)) return;
      let sx = cx, sy = cy;
      const parentId = w.kind === 'track' ? w.parentArtistId : w.kind === 'artist' ? w.parentGenreId : w.genre?.parentId;
      if ((w.kind === 'sub' || w.kind === 'artist' || w.kind === 'track') && parentId) {
        const p = e.nodeById.get(parentId);
        if (p) {
          const px = p.x ?? cx, py = p.y ?? cy;
          // direction from hub outward through the parent
          const outAng = Math.atan2(py - cy, px - cx);
          const siblings = newSubsByParent.get(parentId) ?? [w.id];
          const idx = siblings.indexOf(w.id);
          const spread = w.kind === 'track' ? Math.PI * 0.85 : w.kind === 'artist' ? Math.PI * 1.25 : Math.PI * 0.9;
          const a = outAng + (idx - (siblings.length - 1) / 2) * (spread / Math.max(siblings.length, 1));
          const dist = w.kind === 'track' ? 42 : w.kind === 'artist' ? 74 : 52;
          sx = px + Math.cos(a) * dist;
          sy = py + Math.sin(a) * dist;
        }
      } else if (w.kind === 'family') {
        const i = families.findIndex((f) => f.id === w.id);
        const ang = (i / Math.max(families.length, 1)) * 2 * Math.PI - Math.PI / 2;
        sx = cx + Math.cos(ang) * metrics.ring1; sy = cy + Math.sin(ang) * metrics.ring1;
      }
      const node: GNode = {
        id: w.id, name: w.track?.title ?? w.artist?.name ?? w.genre?.name ?? 'EDM', kind: w.kind,
        family: w.genre?.family ?? 'hub', genre: w.genre,
        artist: w.artist,
        track: w.track,
        parentGenreId: w.parentGenreId,
        parentArtistId: w.parentArtistId,
        childCount: w.kind === 'family' ? (subsByParent.get(w.id) ?? []).length : w.kind === 'artist' ? (w.artist?.tracks.length ?? 0) : w.genre ? artistNodesForGenre(w.genre).length : 0,
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
      if (n.kind === 'track' && n.parentArtistId && e.nodeById.has(n.parentArtistId)) {
        e.links.push({ source: n.parentArtistId, target: n.id });
      }
    });

    e.sim.nodes(e.nodes);
    (e.sim.force('charge') as d3.ForceManyBody<GNode>)
      .distanceMax(Math.max(720, metrics.trackRing * 1.25));
    (e.sim.force('link') as d3.ForceLink<GNode, GLink>).links(e.links);
    (e.sim.force('link') as d3.ForceLink<GNode, GLink>)
      .distance((l) => ((l.target as GNode).kind === 'track' ? 54 : (l.target as GNode).kind === 'artist' ? 86 : (l.source as GNode).kind === 'hub' ? metrics.ring1 : 104))
      .strength((l) => ((l.target as GNode).kind === 'track' ? 0.5 : (l.target as GNode).kind === 'artist' ? 0.26 : (l.source as GNode).kind === 'hub' ? 0.08 : 0.42));
    e.sim.force('radial', d3.forceRadial<GNode>(
      (d) => radialDistance(d, metrics),
      cx, cy
    ).strength(radialStrength));

    // join links
    e.gLink.selectAll<SVGLineElement, GLink>('line')
      .data(e.links, (d) => `${(d.source as GNode).id ?? d.source}->${(d.target as GNode).id ?? d.target}`)
      .join(
        (enter) => enter.append('line')
          .attr('stroke-width', linkWidth)
          .attr('stroke', linkFamilyColor)
          .attr('stroke-linecap', 'round')
          .attr('opacity', 0)
          .call((s) => s.transition().duration(300).attr('opacity', linkOpacity)),
        (update) => update
          .attr('stroke-width', linkWidth)
          .attr('stroke', linkFamilyColor)
          .attr('stroke-linecap', 'round')
          .attr('opacity', linkOpacity),
        (exit) => exit.interrupt().remove()
      );

    // join nodes
    const nodeJoin = e.gNode.selectAll<SVGGElement, GNode>('g.gnode')
      .data(e.nodes, (d) => d.id)
      .join(
        (enter) => {
          const g = enter.append('g')
            .attr('class', 'gnode')
            .attr('data-node-id', (d) => d.id)
            .style('opacity', 0);
          g.transition().duration(300).style('opacity', 1);
          g.append('circle')
            .attr('r', (d) => R[d.kind])
            .attr('fill', (d) => d.kind === 'hub' ? 'var(--graph-hub-fill)' : d.kind === 'family' ? getFamilyColor(d.family).primary : d.kind === 'artist' ? 'var(--graph-artist-fill)' : d.kind === 'track' ? getFamilyColor(d.family).primary : getFamilyColor(d.family).glow)
            .attr('stroke', (d) => d.kind === 'hub' ? '#8b80e0' : getFamilyColor(d.family).primary)
            .attr('stroke-width', (d) => d.kind === 'family' ? 1.8 : d.kind === 'hub' ? 2.2 : d.kind === 'artist' ? 1 : d.kind === 'track' ? 0.9 : 1.2)
            .attr('opacity', (d) => (d.kind === 'track' ? 0.86 : 1));
          // expand indicator ring for families with children
          g.filter((d) => d.kind !== 'track' && d.kind !== 'hub' && d.childCount > 0)
            .append('circle').attr('class', 'expand-ring')
            .attr('r', (d) => R[d.kind] + 4).attr('fill', 'none')
            .attr('stroke', (d) => getFamilyColor(d.family).primary)
            .attr('stroke-width', 1).attr('stroke-dasharray', '2 3').attr('opacity', 0.5);
          g.append('text').attr('class', 'lbl')
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--graph-label)')
            .attr('pointer-events', 'none')
            .style('text-shadow', 'var(--graph-label-shadow)')
            .text((d) => d.kind === 'sub' || d.kind === 'artist' || d.kind === 'track' ? truncate(d.name) : d.name)
            .attr('font-size', (d) => d.kind === 'hub' ? '12px' : d.kind === 'family' ? '11px' : d.kind === 'artist' ? '8.5px' : d.kind === 'track' ? '7.5px' : '9.5px')
            .attr('font-weight', (d) => d.kind === 'sub' || d.kind === 'artist' || d.kind === 'track' ? 500 : 700)
            .attr('dy', (d) => d.kind === 'hub' ? 4 : R[d.kind] + 12)
            .style('display', (d) => d.kind === 'sub' || d.kind === 'artist' || d.kind === 'track' ? 'none' : null)
            .style('opacity', (d) => d.kind === 'sub' || d.kind === 'artist' || d.kind === 'track' ? 0 : 1);
          return g;
        },
        (update) => update.attr('data-node-id', (d) => d.id),
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
            sub: d.kind === 'track' && d.track
              ? `Track · ${d.track.artistName}`
              : d.kind === 'artist' && d.artist
                ? `Artist · ${d.artist.genreName}${d.artist.tracks.length ? ' · songs available' : ''}`
                : d.genre ? `${d.genre.originDecade}${d.genre.bpmRange ? ' · ' + d.genre.bpmRange : ''}` : '',
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
        if (d.kind === 'hub') { setShowAll(false); setExpanded(new Set()); setExpandedArtists(new Set()); setExpandedTracks(new Set()); return; }
        if (d.kind === 'track' && d.track) {
          onSelectTrack(d.track);
          return;
        }
        if (d.kind === 'artist' && d.artist) {
          setExpandedTracks((prev) => (prev.has(d.id) && prev.size === 1 ? new Set() : new Set([d.id])));
          onSelectArtist(d.artist);
          return;
        }
        if (d.kind === 'family') {
          setShowAll(false);
          const children = subsByParent.get(d.id) ?? [];
          const childIds = children.map((child) => child.id);
          setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(d.id)) next.delete(d.id); else next.add(d.id);
            return next;
          });
          setExpandedTracks(new Set());
          setExpandedArtists((prev) => {
            if (children.length === 0) {
              return prev.has(d.id) && prev.size === 1 ? new Set() : new Set([d.id]);
            }
            const next = new Set(prev);
            childIds.forEach((id) => next.delete(id));
            return next;
          });
          if (d.genre) onSelect(d.genre);
          return;
        }
        if (d.genre) {
          setShowAll(false);
          setExpandedTracks(new Set());
          setExpandedArtists((prev) => (prev.has(d.id) && prev.size === 1 ? new Set() : new Set([d.id])));
          onSelect(d.genre);
        }
      });

    if (instant) e.sim.alpha(0.9).restart();
    else e.sim.alpha(0.7).alphaTarget(0).velocityDecay(0.38).restart();
    updateLabelVisibility();
    validateGraphIntegrity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desiredNodes, families, onSelect, onSelectArtist, updateLabelVisibility, validateGraphIntegrity]);

  // run structural update when expansion / data changes
  useEffect(() => {
    if (eng.current) updateGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, expandedArtists, expandedTracks, showAll, genres]);

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
        if (node.kind === 'track' && node.parentArtistId) {
          focus.add(node.parentArtistId);
          const artistNode = e.nodeById.get(node.parentArtistId);
          if (artistNode?.parentGenreId) focus.add(artistNode.parentGenreId);
        }
        if (node.kind === 'artist' && node.parentGenreId) {
          focus.add(node.parentGenreId);
          e.nodes.forEach((n) => { if (n.parentArtistId === node.id) focus!.add(n.id); });
        }
        if (node.kind === 'sub' && node.genre?.parentId) { focus.add(node.genre.parentId); focus.add(HUB_ID); }
        if (node.kind === 'family') {
          focus.add(HUB_ID);
          e.nodes.forEach((n) => { if (n.genre?.parentId === node.id || n.parentGenreId === node.id) focus!.add(n.id); });
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
      .attr('opacity', (d) => {
        const isExpanded = d.kind === 'artist'
          ? expandedTracks.has(d.id)
          : d.kind === 'sub'
            ? expandedArtists.has(d.id)
            : expanded.has(d.id);
        return isExpanded ? 0 : 0.5;
      })
      .attr('r', (d) => R[d.kind] + 4);

    // links
    e.gLink.selectAll<SVGLineElement, GLink>('line')
      .transition().duration(160)
      .attr('stroke', (l) => {
        const s = (l.source as GNode).id, t = (l.target as GNode).id;
        if (focus && focus.has(s) && focus.has(t)) return linkFamilyColor(l);
        return linkFamilyColor(l);
      })
      .attr('stroke-width', (l) => {
        const s = (l.source as GNode).id, t = (l.target as GNode).id;
        if (focus && focus.has(s) && focus.has(t)) return linkWidth(l) + 0.55;
        return linkWidth(l);
      })
      .attr('opacity', (l) => {
        const s = (l.source as GNode).id, t = (l.target as GNode).id;
        if (focus && focus.has(s) && focus.has(t)) return 0.9;
        if (focus) return Math.max(0.18, linkOpacity(l) * 0.45);
        return linkOpacity(l);
      });

    updateLabelVisibility();
  }, [selectedId, hoveredId, expanded, expandedArtists, expandedTracks, updateLabelVisibility]);

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
    setExpandedTracks(new Set());
    if (genre.parentId) {
      setExpandedArtists(new Set([genre.id]));
    } else {
      const children = subsByParent.get(genre.id) ?? [];
      if (children.length > 0) {
        setExpanded((prev) => {
          if (prev.has(genre.id)) return prev;
          const next = new Set(prev); next.add(genre.id); return next;
        });
        setExpandedArtists(new Set());
      } else {
        setExpandedArtists(new Set([genre.id]));
      }
    }
    onSelect(genre);
    // center on node after it settles
    window.setTimeout(() => {
      const e = eng.current;
      if (!e || !svgRef.current) return;
      const node = e.nodeById.get(genreId);
      if (!node || node.x == null || node.y == null) return;
      const k = 1.5;
      const verticalOffset = 40; // offset down so label isn't clipped at top
      const t = d3.zoomIdentity.translate(e.W / 2 - node.x * k, e.H / 2 - node.y * k + verticalOffset).scale(k);
      d3.select(svgRef.current).transition().duration(600).call(e.zoom.transform, t);
    }, genre.parentId ? 380 : 60);
  }, [genres, onSelect, subsByParent]);

  // jump straight to an artist node — expanding whichever genre branch hosts it
  // (a family's own branch when the artist has no home in a subgenre)
  const focusArtist = useCallback((genreId: string, artistId: string) => {
    const genre = genres.find((g) => g.id === genreId);
    if (!genre) return;
    setShowAll(false);
    setExpandedTracks(new Set());
    let delay: number;
    if (genre.parentId) {
      setExpanded((prev) => {
        if (prev.has(genre.parentId!)) return prev;
        const next = new Set(prev); next.add(genre.parentId!); return next;
      });
      setExpandedArtists(new Set([genre.id]));
      delay = 380;
    } else {
      const children = subsByParent.get(genre.id) ?? [];
      setExpanded((prev) => {
        if (prev.has(genre.id)) return prev;
        const next = new Set(prev); next.add(genre.id); return next;
      });
      if (children.length === 0) setExpandedArtists(new Set([genre.id]));
      delay = 280;
    }
    window.setTimeout(() => {
      const e = eng.current;
      if (!e || !svgRef.current) return;
      const node = e.nodeById.get(artistId);
      if (!node || node.x == null || node.y == null) return;
      const k = 1.6;
      const verticalOffset = 40;
      const t = d3.zoomIdentity.translate(e.W / 2 - node.x * k, e.H / 2 - node.y * k + verticalOffset).scale(k);
      d3.select(svgRef.current).transition().duration(600).call(e.zoom.transform, t);
    }, delay);
  }, [genres, subsByParent]);

  useImperativeHandle(ref, () => ({
    focusGenre,
    focusArtist,
    collapseAll: () => { setShowAll(false); setExpanded(new Set()); setExpandedArtists(new Set()); setExpandedTracks(new Set()); },
  }), [focusGenre, focusArtist]);

  const fitToGraph = useCallback((duration = 600) => {
    const e = eng.current;
    if (!e || !svgRef.current) return;
    const positioned = e.nodes.filter((node) => node.x != null && node.y != null);
    if (positioned.length === 0) return;
    const pad = 180;
    const extraTop = 60; // extra top clearance so labels above nodes aren't clipped
    const xs = positioned.map((node) => node.x!);
    const ys = positioned.map((node) => node.y!);
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad - extraTop;
    const maxY = Math.max(...ys) + pad;
    const graphW = Math.max(1, maxX - minX);
    const graphH = Math.max(1, maxY - minY);
    const scale = Math.max(0.14, Math.min(2.1, Math.min(e.W / graphW, e.H / graphH)));
    const tx = e.W / 2 - ((minX + maxX) / 2) * scale;
    const ty = e.H / 2 - ((minY + maxY) / 2) * scale;
    const t = d3.zoomIdentity.translate(tx, ty).scale(scale);
    d3.select(svgRef.current).transition().duration(duration).call(e.zoom.transform, t);
  }, []);

  useEffect(() => {
    if (!eng.current) return;
    const timeout = window.setTimeout(() => fitToGraph(showAll ? 900 : 650), showAll ? 1250 : 850);
    return () => window.clearTimeout(timeout);
  }, [expanded, expandedArtists, expandedTracks, showAll, fitToGraph]);

  const resetZoom = () => fitToGraph(500);

  const toggleAll = () => {
    setShowAll((value) => {
      const next = !value;
      if (next) {
        setExpanded(new Set(families.map((family) => family.id)));
        setExpandedArtists(new Set());
        setExpandedTracks(new Set());
        window.setTimeout(() => fitToGraph(900), 1300);
      } else {
        setExpanded(new Set());
        setExpandedArtists(new Set());
        setExpandedTracks(new Set());
        window.setTimeout(() => fitToGraph(500), 500);
      }
      return next;
    });
  };

  return (
    <div className="graph-shell relative w-full h-full">
      <svg ref={svgRef} className="graph-svg w-full h-full touch-none" style={{ WebkitBackfaceVisibility: 'hidden' }} />

      {tooltip && (
        <div
          className="absolute pointer-events-none z-20 anim-fade"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          <div className="rounded-lg px-2.5 py-1.5 shadow-xl border" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-strong)' }}>
            <div className="text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--text-1)' }}>{tooltip.text}</div>
            {tooltip.sub && <div className="text-[10px] font-mono mt-0.5 whitespace-nowrap" style={{ color: 'var(--text-3)' }}>{tooltip.sub}</div>}
          </div>
        </div>
      )}

      {/* zoom + reset controls */}
      <div className="absolute right-3 bottom-20 sm:right-4 sm:bottom-4 flex flex-col gap-2 sm:gap-1.5">
        <button onClick={toggleAll}
          className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center border transition-colors hover:bg-white/5"
          style={{
            background: showAll ? 'var(--accent)' : 'var(--surface-1)',
            borderColor: showAll ? 'var(--accent)' : 'var(--border)',
            color: showAll ? 'var(--accent-contrast)' : 'var(--text-2)',
          }} aria-label={showAll ? 'Collapse full graph' : 'Expand full graph'}>
          <GitBranch size={15} />
        </button>
        <button onClick={() => { const e = eng.current; if (e && svgRef.current) d3.select(svgRef.current).transition().duration(200).call(e.zoom.scaleBy, 1.3); }}
          className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center border transition-colors hover:bg-white/5"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-2)' }} aria-label="Zoom in">
          <Plus size={16} />
        </button>
        <button onClick={() => { const e = eng.current; if (e && svgRef.current) d3.select(svgRef.current).transition().duration(200).call(e.zoom.scaleBy, 1 / 1.3); }}
          className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center border transition-colors hover:bg-white/5"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-2)' }} aria-label="Zoom out">
          <Minus size={16} />
        </button>
        <button onClick={resetZoom}
          className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center border transition-colors hover:bg-white/5"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-2)' }} aria-label="Reset view">
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
});

export default GraphExplorer;
