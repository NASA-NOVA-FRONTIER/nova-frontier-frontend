import type { DrawEvent, Pointer } from "@/features/geo/drawMachine";

// What the E2E stub globe (GlobeView.stub.tsx) hands to tests in place of a Cesium canvas.
// Each hook calls the same GlobeView callback a real click, hover or drag would.
export type GlobeHooks = {
  // `px` is where on screen the click would be; the draw machine compares corners in pixels.
  click: (lon: number, lat: number, px?: Pointer["px"]) => void;
  hover: (lon: number, lat: number) => void;
  leave: () => void;
  draw: (events: DrawEvent[]) => void;
  openCase: (id: string) => void;
};

declare global {
  // Global augmentation only works with an interface.
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface Window {
    __globe?: GlobeHooks;
  }
}
