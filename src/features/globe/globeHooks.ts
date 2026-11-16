// What the E2E stub globe (GlobeView.stub.tsx) hands to tests in place of a Cesium canvas.
// Each hook calls the same GlobeView callback a real click, hover or drag would.
export type GlobeHooks = {
  // A click on the globe: places the square there.
  click: (lon: number, lat: number) => void;
  // A drag of the placed square released with its centre here; nothing when it can't move.
  dragSquare: (lon: number, lat: number) => void;
  hover: (lon: number, lat: number) => void;
  leave: () => void;
  openCase: (id: string) => void;
};

declare global {
  // Global augmentation only works with an interface.
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface Window {
    __globe?: GlobeHooks;
  }
}
