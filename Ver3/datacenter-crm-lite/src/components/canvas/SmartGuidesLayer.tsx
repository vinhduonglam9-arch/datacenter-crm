import React from 'react';
import { SmartGuideLine } from '../../utils/graph-algorithms.ts';

interface SmartGuidesLayerProps {
  guides: SmartGuideLine[];
  zoom: number;
}

export const SmartGuidesLayer: React.FC<SmartGuidesLayerProps> = React.memo(({ guides, zoom }) => {
  if (!guides || guides.length === 0) return null;

  const strokeW = 1.5 / zoom;
  const dash = `${5 / zoom},${3.5 / zoom}`;
  const markerR = 3.2 / zoom;

  return (
    <>
      {guides.map((g, idx) => {
        const guideColor = g.snapType === 'center' ? '#F43F5E' : '#2563EB';
        return (
          <g key={`smart-guide-${idx}`} className="pointer-events-none">
            {g.orientation === 'vertical' ? (
              <line
                x1={g.pos}
                y1={g.start}
                x2={g.pos}
                y2={g.end}
                stroke={guideColor}
                strokeWidth={strokeW}
                strokeDasharray={dash}
              />
            ) : (
              <line
                x1={g.start}
                y1={g.pos}
                x2={g.end}
                y2={g.pos}
                stroke={guideColor}
                strokeWidth={strokeW}
                strokeDasharray={dash}
              />
            )}
            {g.anchorPoints.map((pt, pIdx) => (
              <g key={`smart-guide-pt-${idx}-${pIdx}`}>
                <line
                  x1={pt.x - markerR}
                  y1={pt.y - markerR}
                  x2={pt.x + markerR}
                  y2={pt.y + markerR}
                  stroke={guideColor}
                  strokeWidth={strokeW}
                  strokeLinecap="round"
                />
                <line
                  x1={pt.x + markerR}
                  y1={pt.y - markerR}
                  x2={pt.x - markerR}
                  y2={pt.y + markerR}
                  stroke={guideColor}
                  strokeWidth={strokeW}
                  strokeLinecap="round"
                />
              </g>
            ))}
          </g>
        );
      })}
    </>
  );
});
