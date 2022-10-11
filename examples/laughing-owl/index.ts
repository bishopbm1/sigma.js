/**
 * This example shows how to use different programs to render nodes.
 * This works in two steps:
 * 1. You must declare all the different rendering programs to sigma when you
 *    instantiate it
 * 2. You must give to each node and edge a "type" value that matches a declared
 *    program
 * The programs offered by default by sigma are in src/rendering/webgl/programs,
 * but you can add your own.
 *
 * Here in this example, some nodes are drawn with images in them using the
 * the getNodeProgramImage provided by Sigma. Some others are drawn as white
 * disc with a border, and the custom program to draw them is in this directory:
 * - "./node.border.ts" is the node program. It tells sigma what data to give to
 *   the GPU and how.
 * - "./node.border.vert.glsl" is the vertex shader. It tells the GPU how to
 *   interpret the data provided by the program to obtain a node position,
 *   mostly.
 * - "./node.border.frag.glsl" is the fragment shader. It tells for each pixel
 *   what color it should get, relatively to data given by the program and its
 *   position inside the shape. Basically, the GPU wants to draw a square, but
 *   we "carve" a disc in it.
 */

import Graph from "graphology";
import Sigma from "sigma";

import { Coordinates, EdgeDisplayData, NodeDisplayData } from "sigma/types";

import getNodeProgramImage from "sigma/rendering/webgl/programs/node.image";
import userData from "./graph_data_user_json.json";
import machineData2 from "./graph_data_machine_json.json";

const container = document.getElementById("sigma-container") as HTMLElement;
const contextMenu = document.getElementById("context-menu") as HTMLElement;
const zoomInBtn = document.getElementById("zoom-in") as HTMLButtonElement;
const zoomOutBtn = document.getElementById("zoom-out") as HTMLButtonElement;
const zoomResetBtn = document.getElementById("zoom-reset") as HTMLButtonElement;
const malopRemoveBtn = document.getElementById("malop-remove") as HTMLButtonElement;
const malopAddBtn = document.getElementById("malop-add") as HTMLButtonElement;
const malopXrBtn = document.getElementById("malop-xr") as HTMLButtonElement;
const malopXrCasBtn = document.getElementById("malop-xr-cas") as HTMLButtonElement;
const alignmentSelect = document.getElementById("alignment-select") as HTMLSelectElement;

var sel = alignmentSelect.selectedIndex;
var opt = alignmentSelect.options[sel];

const graph = new Graph({multi: true});
graph.import(machineData2);

const renderer = new Sigma(graph, container, {
  // We don't have to declare edgeProgramClasses here, because we only use the default ones ("line" and "arrow")
  nodeProgramClasses: {
    image: getNodeProgramImage(),
    // border: NodeProgramBorder,
  },
  renderEdgeLabels: false
});

const camera = renderer.getCamera();

function display_values() {
  const cameraState = camera.getState();

  graph.nodes().forEach(function(node) {
    const node_isExtraData = graph.getNodeAttribute(node, 'isExtraData');
    const node_hidden = graph.getNodeAttribute(node, 'hidden');
    if (cameraState.ratio < .3) {
        if (node_isExtraData == true && node_hidden == true) {
          graph.setNodeAttribute(node, 'hidden', false);
        }
    } else {
      if (node_isExtraData == true && node_hidden == false) {
        graph.setNodeAttribute(node, 'hidden', true);
      }
    }
  });

  graph.edges().forEach(function(edge) {
    const edge_attr = graph.getEdgeAttribute(edge, 'attr');
    if (cameraState.ratio < .3) {
        if (edge_attr == false) {
          graph.setEdgeAttribute(edge, 'color', '#FFFFFF');
        }
    } else {
      if (edge_attr == false) {
        graph.setEdgeAttribute(edge, 'color', '#000000');
      }
    }
  });
}

// Type and declare internal state:
interface State {
  hoveredNode?: string;
  hoveredNodeLabel?: string;
  hoveredNodeIsMalop?: boolean;
  // State derived from query:
  selectedNode?: string;
  suggestions?: Set<string>;

  // State derived from hovered node:
  hoveredNeighbors?: Set<string>;
}
const state: State = { };

// Type and declare internal state:
interface ContextState {
  selectedNode?: string;
  removedNode?: string;
  removedNodeAttributes?: object;
  revmovedEdges?: Array<object>;
  newEdges?: Array<string>;
}
const contextState: ContextState = { revmovedEdges: [], newEdges: [] };

function setHoveredNode(node?: string) {
  if (node) {
    state.hoveredNode = node;
    const node_isHidden = graph.getNodeAttribute(node, 'isHidden');
    const node_isExtraData = graph.getNodeAttribute(node, 'isExtraData');
    const node_neighbors = graph.getNodeAttribute(node, 'neighbors');
    state.hoveredNeighbors = new Set(node_neighbors);
    state.hoveredNodeLabel = graph.getNodeAttribute(node, 'label');
    state.hoveredNodeIsMalop = graph.getNodeAttribute(node, 'isMalop');
  } else {
    state.hoveredNode = undefined;
    state.hoveredNeighbors = undefined;
    state.hoveredNodeLabel = undefined;
    state.hoveredNodeIsMalop = false;
  }

  // Refresh rendering:
  renderer.refresh();
}

// Bind graph interactions:
renderer.on("enterNode", ({ node }) => {
  setHoveredNode(node);
});
renderer.on("leaveNode", () => {
  setHoveredNode(undefined);
});

zoomInBtn.addEventListener("click", () => {
  camera.animatedZoom({ duration: 600 });
  display_values();
});

zoomOutBtn.addEventListener("click", () => {
  camera.animatedUnzoom({ duration: 600 });
  display_values();
});

zoomResetBtn.addEventListener("click", () => {
  camera.animatedReset({ duration: 600 });
  display_values();
});

container.addEventListener('contextmenu', function (e) {
  e.preventDefault();
}, false);

malopAddBtn.addEventListener("click", () => {
  console.log("malopAddBtn")
  if (contextState.removedNode) {
    graph.addNode(contextState.removedNode, contextState.removedNodeAttributes);
    for (let i = 0; i < contextState.revmovedEdges.length; i++) {
      var removedEdge = contextState.revmovedEdges[i];
      graph.addEdge(removedEdge['source'], removedEdge['target'], removedEdge['attributes']);
    }

    for (let i = 0; i < contextState.newEdges.length; i++) {
      var newEdge = contextState.newEdges[i];
      graph.dropEdge(newEdge);
    }

    contextState.removedNode = undefined;
    contextState.removedNodeAttributes = undefined;
    contextState.revmovedEdges = undefined;
    contextState.newEdges = undefined;
    contextMenu.classList.remove("visible");
  }
});

malopRemoveBtn.addEventListener("click", () => {
  if (contextState.selectedNode) {
    contextState.removedNode = contextState.selectedNode;
    contextState.removedNodeAttributes = graph.getNodeAttributes(contextState.selectedNode);
    console.log(contextState.selectedNode);
    var newEdges = {};
    graph.findEdge((contextState.selectedNode, contextState.selectedNode),
      (edge, attributes, source, target, sourceAttributes, targetAttributes) => {
        const label = attributes['label'];
        const attr = attributes['attr'];

        if (attr == false && !(label in newEdges)) {
          newEdges[label] = {
            'source': undefined,
            'target': undefined,
            'attributes': attributes,
          };
        }

        const removedEdge = {
          'source': source,
          'target': target,
          'attributes': attributes,
        };
        contextState.revmovedEdges.push(removedEdge);

        if (attr == false && source == contextState.selectedNode) {
          newEdges[label]['source'] = target;
        }

        if (attr == false && target == contextState.selectedNode) {
          newEdges[label]['target'] = source;

        }
    });

    for (const newEdge in newEdges) {
      const edge = graph.addEdge(newEdges[newEdge]['source'], newEdges[newEdge]['target'], newEdges[newEdge]['attributes']);
      contextState.newEdges.push(edge);
    }

    graph.dropNode(contextState.selectedNode);
    contextMenu.classList.remove("visible");
  }
});

alignmentSelect.addEventListener("change", (e) => {
  var sel = alignmentSelect.selectedIndex;
  var opt = alignmentSelect.options[sel];

  graph.clear();

  switch(opt.value) {
    case "machine":
      graph.import(machineData2);
      break;
    case "user":
      graph.import(userData);
      break;
    case "mitre":
      graph.import(machineData2);
      break;
    default:
      graph.import(machineData2);
  }
});

// Render nodes accordingly to the internal state:
// 1. If a node is selected, it is highlighted
// 2. If there is query, all non-matching nodes are greyed
// 3. If there is a hovered node, all non-neighbor nodes are greyed
renderer.setSetting("nodeReducer", (node, data) => {
  const res: Partial<NodeDisplayData> = { ...data };
  if (!state.hoveredNodeIsMalop) {
    if (state.hoveredNeighbors && !state.hoveredNeighbors.has(node) && state.hoveredNode !== node) {
      res.label = "";
      res.color = "#f6f6f6";
    }

    if (state.selectedNode === node) {
      res.highlighted = true;
    } else if (state.suggestions && !state.suggestions.has(node)) {
      res.label = "";
      res.color = "#f6f6f6";
    }
  }

  return res;
});

// Render edges accordingly to the internal state:
// 1. If a node is hovered, the edge is hidden if it is not connected to the
//    node
// 2. If there is a query, the edge is only visible if it connects two
//    suggestions
renderer.setSetting("edgeReducer", (edge, data) => {
  const res: Partial<EdgeDisplayData> = { ...data };
  if (!state.hoveredNodeIsMalop) {
    let hasNeighbor = false;
    const edgeSource = graph.source(edge);
    if (state.hoveredNeighbors && state.hoveredNeighbors.has(edgeSource)) {
      hasNeighbor = true;
    }

    if (state.hoveredNode && !graph.hasExtremity(edge, state.hoveredNode) && !hasNeighbor) {
      res.hidden = true;
    }

    if (state.suggestions && (!state.suggestions.has(graph.source(edge)) || !state.suggestions.has(graph.target(edge)))) {
      res.hidden = true;
    }
  }

  return res;
});

renderer.on("rightClickNode", (e) => {
  const normalizedY = e.event['y'];
  const normalizedX = e.event['x'];
  contextMenu.classList.remove("visible");
  contextMenu.style.top = `${normalizedY}px`;
  contextMenu.style.left = `${normalizedX}px`;
  contextState.selectedNode = e.node

  setTimeout(() => {
    contextMenu.classList.add("visible");
  });
  return false;
});

renderer.on("doubleClickNode", (e) => {
  camera.animatedZoom({ duration: 600 });
  display_values();
});

// When clicking on the stage, we add a new node and connect it to the closest node
renderer.on("clickStage", (e) => {
  contextMenu.classList.remove("visible");
  display_values();
});