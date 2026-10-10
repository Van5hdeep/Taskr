import { graphlib, layout } from "@dagrejs/dagre";
import { nodesInLane } from "./model";

const LANE_LABEL_SPACE = 150;
const LANE_PADDING = 36;
const LANE_GAP = 24;

function runDagre(nodes, edges, direction, origin) {
  if (!nodes.length) return { positions: {}, width: 0, height: 0 };
  const graph = new graphlib.Graph();
  graph.setGraph({ rankdir: direction, nodesep: 56, ranksep: 84, edgesep: 24, marginx: 0, marginy: 0 });
  graph.setDefaultEdgeLabel(() => ({}));
  const ids = new Set(nodes.map((node) => node.id));
  for (const node of nodes) graph.setNode(node.id, { width: node.width, height: node.height });
  for (const edge of edges) if (ids.has(edge.source) && ids.has(edge.target) && edge.source !== edge.target) graph.setEdge(edge.source, edge.target);
  layout(graph);
  const positions = {};
  let width = 0;
  let height = 0;
  for (const node of nodes) {
    const placed = graph.node(node.id);
    const x = placed.x - node.width / 2;
    const y = placed.y - node.height / 2;
    positions[node.id] = { x: Math.round(origin.x + x), y: Math.round(origin.y + y) };
    width = Math.max(width, x + node.width);
    height = Math.max(height, y + node.height);
  }
  return { positions, width, height };
}

/**
 * Tidy a scene with dagre. Without lanes: one layered layout in `direction`.
 * With lanes: each lane's nodes are laid out left→right inside it, lanes are
 * stacked and resized to fit, and nodes outside any lane go below them.
 * Pure — returns a new scene.
 */
export function layoutScene(scene, direction = "TB") {
  const lanes = scene.nodes.filter((node) => node.type === "lane").sort((a, b) => a.position.y - b.position.y);
  const shapes = scene.nodes.filter((node) => node.type !== "lane");

  if (!lanes.length) {
    const { positions } = runDagre(shapes, scene.edges, direction, { x: 40, y: 40 });
    return { ...scene, nodes: scene.nodes.map((node) => (positions[node.id] ? { ...node, position: positions[node.id] } : node)) };
  }

  const positions = {};
  const laneUpdates = {};
  const assigned = new Set();
  const membership = lanes.map((lane) => {
    const members = nodesInLane(lane, shapes).filter((node) => !assigned.has(node.id));
    members.forEach((node) => assigned.add(node.id));
    return members;
  });

  const laneResults = membership.map((members) => runDagre(members, scene.edges, "LR", { x: 0, y: 0 }));
  const laneWidth = Math.max(800, ...laneResults.map((result) => LANE_LABEL_SPACE + result.width + LANE_PADDING * 2));
  let cursorY = 40;
  lanes.forEach((lane, index) => {
    const result = laneResults[index];
    const height = Math.max(160, result.height + LANE_PADDING * 2);
    laneUpdates[lane.id] = { position: { x: 40, y: cursorY }, width: laneWidth, height };
    const offsetY = cursorY + (height - result.height) / 2;
    for (const [id, position] of Object.entries(result.positions)) {
      positions[id] = { x: Math.round(40 + LANE_LABEL_SPACE + LANE_PADDING + position.x), y: Math.round(offsetY + position.y) };
    }
    cursorY += height + LANE_GAP;
  });

  const loose = shapes.filter((node) => !assigned.has(node.id));
  const looseResult = runDagre(loose, scene.edges, direction, { x: 40, y: cursorY + 40 });
  Object.assign(positions, looseResult.positions);

  return {
    ...scene,
    nodes: scene.nodes.map((node) => {
      if (laneUpdates[node.id]) return { ...node, ...laneUpdates[node.id] };
      if (positions[node.id]) return { ...node, position: positions[node.id] };
      return node;
    }),
  };
}
