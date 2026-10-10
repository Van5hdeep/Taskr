import { describe, expect, it } from "vitest";
import { parseMermaid, toMermaid } from "./mermaid";
import { layoutScene } from "./layout";
import { makeEdge, makeNode, migrateFlow, nodesInLane, TEMPLATES } from "./model";

const labelOf = (scene, label) => scene.nodes.find((node) => node.data.label === label);
const overlaps = (a, b) => a.position.x < b.position.x + b.width && a.position.x + a.width > b.position.x && a.position.y < b.position.y + b.height && a.position.y + a.height > b.position.y;

describe("mermaid parse", () => {
  it("reads the plan's acceptance example", () => {
    const { scene, direction, errors } = parseMermaid(`flowchart TD
  A[Start] --> B{OK?}
  B -- yes --> C[Ship]
  B -- no --> D[Fix] --> B`);
    expect(errors).toEqual([]);
    expect(direction).toBe("TB");
    expect(scene.nodes.map((node) => [node.data.label, node.data.kind])).toEqual([["Start", "process"], ["OK?", "decision"], ["Ship", "process"], ["Fix", "process"]]);
    const edge = (from, to) => scene.edges.find((e) => e.source === labelOf(scene, from).id && e.target === labelOf(scene, to).id);
    expect(edge("OK?", "Ship").label).toBe("yes");
    expect(edge("OK?", "Fix").label).toBe("no");
    expect(edge("Fix", "OK?")).toBeTruthy();
    expect(scene.edges).toHaveLength(4);
  });

  it("supports shapes, pipe labels, dotted arrows, & groups and quoted labels", () => {
    const { scene, direction, errors, warnings } = parseMermaid(`graph LR
  s([Begin]) -.->|maybe| db[(Users)]
  a & b --> c[/"Input [raw]"/]
  ext[[Bank]] ==> note>Remember]
  style a fill:#f9f
  %% a comment`);
    expect(errors).toEqual([]);
    expect(direction).toBe("LR");
    expect(warnings).toHaveLength(1);
    expect(labelOf(scene, "Begin").data.kind).toBe("terminator");
    expect(labelOf(scene, "Users").data.kind).toBe("store");
    expect(labelOf(scene, "Input [raw]").data.kind).toBe("data");
    expect(labelOf(scene, "Bank").data.kind).toBe("external");
    expect(labelOf(scene, "Remember").data.kind).toBe("note");
    const dotted = scene.edges.find((edge) => edge.label === "maybe");
    expect(dotted.data.style).toBe("dashed");
    expect(scene.edges.filter((edge) => edge.target === labelOf(scene, "Input [raw]").id)).toHaveLength(2);
  });

  it("turns subgraphs into lanes containing their nodes", () => {
    const { scene, errors } = parseMermaid(`flowchart LR
  subgraph cust [Customer]
    r[Request]
  end
  subgraph ops [Operations]
    v{Valid?}
  end
  r --> v`);
    expect(errors).toEqual([]);
    const lanes = scene.nodes.filter((node) => node.type === "lane");
    expect(lanes.map((lane) => lane.data.label)).toEqual(["Customer", "Operations"]);
    expect(nodesInLane(lanes[0], scene.nodes).map((node) => node.data.label)).toEqual(["Request"]);
    expect(nodesInLane(lanes[1], scene.nodes).map((node) => node.data.label)).toEqual(["Valid?"]);
  });

  it("reports unreadable lines with line numbers", () => {
    const { errors } = parseMermaid("flowchart TD\n  A --> \n  B ~~ C\n  subgraph x");
    expect(errors.some((error) => error.startsWith("Line 2"))).toBe(true);
    expect(errors.some((error) => error.startsWith("Line 3"))).toBe(true);
    expect(errors.some((error) => error.includes("missing its \"end\""))).toBe(true);
  });
});

describe("mermaid round trip", () => {
  it("exports and re-imports the same structure", () => {
    const original = TEMPLATES.find((template) => template.id === "flow").build();
    const text = toMermaid(original, "TB");
    expect(text.startsWith("flowchart TD")).toBe(true);
    const { scene, errors } = parseMermaid(text);
    expect(errors).toEqual([]);
    expect(scene.nodes.map((node) => [node.data.label, node.data.kind]).sort()).toEqual(original.nodes.map((node) => [node.data.label, node.data.kind]).sort());
    const pairs = (s) => s.edges.map((edge) => `${labelOf(s, s.nodes.find((n) => n.id === edge.source).data.label).data.label}>${s.nodes.find((n) => n.id === edge.target).data.label}:${edge.label}`).sort();
    expect(pairs(scene)).toEqual(pairs(original));
  });

  it("escapes quotes and newlines", () => {
    const scene = { nodes: [makeNode("process", { x: 0, y: 0 }, { id: "a", label: 'Say "hi"\nnow' })], edges: [] };
    const text = toMermaid(scene);
    expect(text).toContain('n1["Say #quot;hi#quot;<br>now"]');
    expect(parseMermaid(text).scene.nodes[0].data.label).toBe('Say "hi"\nnow');
  });
});

describe("layout", () => {
  it("lays out without overlaps and in rank order", () => {
    const scene = TEMPLATES.find((template) => template.id === "flow").build();
    const laid = layoutScene(scene, "TB");
    const shapes = laid.nodes;
    for (let i = 0; i < shapes.length; i += 1) for (let j = i + 1; j < shapes.length; j += 1) expect(overlaps(shapes[i], shapes[j])).toBe(false);
    expect(labelOf(laid, "Start").position.y).toBeLessThan(labelOf(laid, "Capture task").position.y);
    const lr = layoutScene(scene, "LR");
    expect(labelOf(lr, "Start").position.x).toBeLessThan(labelOf(lr, "Capture task").position.x);
  });

  it("keeps nodes inside their lanes and stacks lanes", () => {
    const scene = TEMPLATES.find((template) => template.id === "swimlane").build();
    const before = Object.fromEntries(scene.nodes.filter((n) => n.type === "lane").map((lane) => [lane.id, nodesInLane(lane, scene.nodes).map((n) => n.id).sort()]));
    const laid = layoutScene(scene, "LR");
    const lanes = laid.nodes.filter((node) => node.type === "lane");
    for (const lane of lanes) expect(nodesInLane(lane, laid.nodes).map((n) => n.id).sort()).toEqual(before[lane.id]);
    for (let i = 1; i < lanes.length; i += 1) expect(lanes[i].position.y).toBeGreaterThanOrEqual(lanes[i - 1].position.y + lanes[i - 1].height);
  });
});

describe("migrateFlow", () => {
  it("converts the old fixed-canvas format", () => {
    const old = { title: "x", scene: { diagramType: "flow", nodes: [{ id: "a", type: "decision", label: "Q?", x: 10, y: 20, width: 150, height: 110, color: "amber" }, { id: "b", type: "process", label: "Do", x: 300, y: 20 }], edges: [{ id: "e", source: "a", target: "b", label: "yes", style: "dashed" }, { id: "bad", source: "a", target: "zzz" }] } };
    const scene = migrateFlow(old);
    expect(scene.version).toBe(2);
    expect(scene.nodes[0]).toMatchObject({ id: "a", type: "shape", position: { x: 10, y: 20 }, width: 150, data: { kind: "decision", label: "Q?", color: "amber" } });
    expect(scene.edges).toEqual([expect.objectContaining({ id: "e", label: "yes", data: { style: "dashed" } })]);
    expect(migrateFlow(null).nodes).toEqual([]);
    expect(migrateFlow(scene)).toEqual(scene);
  });

  it("builds every template", () => {
    for (const template of TEMPLATES) {
      const scene = template.build();
      const ids = new Set(scene.nodes.map((node) => node.id));
      for (const edge of scene.edges) { expect(ids.has(edge.source)).toBe(true); expect(ids.has(edge.target)).toBe(true); }
      expect(makeEdge("a", "b").type).toBe("smoothstep");
    }
  });
});
