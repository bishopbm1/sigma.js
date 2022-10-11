/**
 * Sigma.js Canvas Renderer Label Component
 * =========================================
 *
 * Function used by the canvas renderer to display a single node's label.
 * @module
 */
import { Settings } from "../../settings";
import { NodeDisplayData, PartialButFor } from "../../types";

export default function drawLabel(
  context: CanvasRenderingContext2D,
  data: PartialButFor<NodeDisplayData, "x" | "y" | "size" | "label" | "color">,
  settings: Settings,
): void {
  if (!data.label) return;

  const size = settings.labelSize,
    font = settings.labelFont,
    weight = settings.labelWeight,
    labelWidth = context.measureText(data.label).width,
    color = settings.labelColor.attribute
      ? data[settings.labelColor.attribute] || settings.labelColor.color || "#000"
      : settings.labelColor.color;

  context.fillStyle = color;
  context.font = `${weight} ${size}px ${font}`;

  // context.fillText(data.label, data.x + data.size + 3, data.y + size / 3);
  context.fillText(data.label, Math.round(data.x - labelWidth / 2), data.y + data.size + size);
}
