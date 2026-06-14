import type { ComponentPreview, RenderResult, ViewBox } from "./types";

/**
 * Pluggable renderer interface so the editor never depends on the wire format.
 * MVP ships a single SvgRenderer; a QGeometry/Canvas renderer can be added
 * later without changing call sites. See docs/geometry-strategy.md.
 */
export interface Renderer {
  /** Render a full design returned by POST /design/render. */
  renderDesign(result: RenderResult): { svg: string; viewBox: ViewBox };
  /** Render a single component preview. Coordinates returned in micrometers. */
  renderPreview(preview: ComponentPreview): { svg: string; viewBox: ViewBox };
}

export const SvgRenderer: Renderer = {
  renderDesign(result) {
    return { svg: result.svg, viewBox: result.viewBox };
  },
  renderPreview(preview) {
    return { svg: preview.svg, viewBox: preview.viewBox };
  },
};

export const activeRenderer: Renderer = SvgRenderer;
