import { useEffect, useRef, useState } from "react";

import type { LonLat } from "@/features/frames/frame.types";
import { frameUnder } from "@/features/frames/frames";
import "@/features/globe/globeHooks";
import { GlobeTooltip, StampLabel, type TooltipContent } from "@/features/globe/GlobeTooltip";
import type { GlobeViewProps } from "@/features/globe/GlobeView";
import { frameTooltip } from "@/features/globe/tooltipText";

// E2E only: vite.config.ts swaps this in for GlobeView.tsx when VITE_E2E_GLOBE=stub. Tests read the
// props in data-* and drive the callbacks through window.__globe, so UI tests skip a 20 s Cesium boot.
// It forwards props and nothing else: any behaviour here would be tested instead of the real globe.
export type { CameraTarget, GlobeScene, GlobeSquare, GlobeStamp } from "@/features/globe/GlobeView";

const TOOLTIP_AT = { x: 720, y: 400 };

export const GlobeView = (props: GlobeViewProps) => {
  const [hover, setHover] = useState<TooltipContent>();
  // The hooks are installed once, so they read the latest props through a ref, as GlobeView does.
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    window.__globe = {
      click: (lon, lat) => latest.current.onPlace([lon, lat]),
      dragSquare: (lon, lat) => {
        const { scene, onMoveSquare } = latest.current;
        if (scene.square?.movable === true) onMoveSquare([lon, lat]);
      },
      hover: (lon, lat) => {
        const point: LonLat = [lon, lat];
        const frame = frameUnder(latest.current.frames, point);
        setHover(frame && frameTooltip(frame, point));
      },
      leave: () => setHover(undefined),
      openCase: (id) => {
        const item = latest.current.cases.find((entry) => entry.id === id);
        if (item !== undefined) latest.current.onOpenCase(item);
      },
    };
    return () => {
      delete window.__globe;
    };
  }, []);

  const { scene, view } = props;
  return (
    <div
      className="x-globe"
      data-testid="globe"
      data-globe="stub"
      data-view={view}
      data-scene={JSON.stringify(scene)}
    >
      {scene.stamp !== undefined && <StampLabel stamp={scene.stamp} />}
      {hover !== undefined && <GlobeTooltip content={hover} {...TOOLTIP_AT} />}
    </div>
  );
};
