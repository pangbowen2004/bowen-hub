import type { AtlasPaper } from "./atlas";

export type AtlasFocus = { id: string; space: string; concept: string | null; reduced: boolean };
export type AtlasSpace = { id: string; label: string };
export type SceneInput =
  | {
      type: "init";
      canvas: OffscreenCanvas;
      papers: AtlasPaper[];
      spaces: AtlasSpace[];
      pixelRatio: number;
      width: number;
      height: number;
      visible: boolean;
    }
  | { type: "focus"; focus: AtlasFocus }
  | { type: "resize"; width: number; height: number }
  | { type: "visibility"; visible: boolean }
  | { type: "move"; x: number; y: number }
  | { type: "leave" }
  | { type: "click"; x: number; y: number };
export type SceneOutput =
  | { type: "ready" }
  | { type: "paper" | "space"; id: string }
  | { type: "error" };
