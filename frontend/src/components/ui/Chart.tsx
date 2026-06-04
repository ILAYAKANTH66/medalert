import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './Card';

interface ChartDataPoint {
  date: string;
  adherencePercentage: number;
}

interface ChartProps {
  data: ChartDataPoint[];
  title: string;
  description?: string;
}

export const Chart = ({ data = [], title, description }: ChartProps) => {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center text-sm text-zinc-400">
          No data available
        </CardContent>
      </Card>
    );
  }

  // Dimension settings
  const width = 500;
  const height = 160;
  const paddingX = 40;
  const paddingY = 25;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Calculate SVG Coordinates
  const points = data.map((d, index) => {
    const x = paddingX + (index * chartWidth) / (data.length - 1 || 1);
    // Percentage 0-100 mapped to height coordinate
    const y = paddingY + chartHeight - (d.adherencePercentage / 100) * chartHeight;
    return { x, y, val: d.adherencePercentage, date: d.date };
  });

  // Smooth bezier helper
  const smooth = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpX = (prev.x + curr.x) / 2;
      d += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  };

  // Construct smooth Line SVG Path
  const linePath = smooth(points);

  // Construct smooth Shaded Area SVG Path
  const areaPath = linePath
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : '';

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      // E.g., "Mon" or "20 May"
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="col-span-full md:col-span-2 overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      
      <CardContent>
        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none"
            aria-label="Adherence Area Chart"
          >
            <defs>
              {/* Shading Area Gradient */}
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0d9488" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Y-axis percentage labels */}
            <text x={paddingX - 6} y={paddingY + 4} className="fill-zinc-400 dark:fill-zinc-600" fontSize="9" textAnchor="end">100%</text>
            <text x={paddingX - 6} y={paddingY + chartHeight / 2 + 4} className="fill-zinc-400 dark:fill-zinc-600" fontSize="9" textAnchor="end">50%</text>
            <text x={paddingX - 6} y={paddingY + chartHeight + 4} className="fill-zinc-400 dark:fill-zinc-600" fontSize="9" textAnchor="end">0%</text>

            {/* Grid Helper Horizontal Lines */}
            <line 
              x1={paddingX} y1={paddingY} 
              x2={width - paddingX} y2={paddingY} 
              className="stroke-zinc-100 dark:stroke-zinc-800/80 stroke-1" 
              strokeDasharray="4"
            />
            <line 
              x1={paddingX} y1={paddingY + chartHeight / 2} 
              x2={width - paddingX} y2={paddingY + chartHeight / 2} 
              className="stroke-zinc-100 dark:stroke-zinc-800/80 stroke-1" 
              strokeDasharray="4"
            />
            <line 
              x1={paddingX} y1={paddingY + chartHeight} 
              x2={width - paddingX} y2={paddingY + chartHeight} 
              className="stroke-zinc-200 dark:stroke-zinc-850 stroke-1" 
            />

            {/* Area Fill */}
            {areaPath && (
              <path
                d={areaPath}
                fill="url(#chartGradient)"
                className="transition-all duration-500 ease-in-out"
              />
            )}

            {/* Top Border Line — smooth bezier */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#0d9488"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-700 ease-in-out drop-shadow-sm"
              />
            )}

            {/* Plot Circles and Hover Indicators */}
            {points.map((p, i) => (
              <g key={i} className="group cursor-pointer">
                {/* Larger hover backdrop glow */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="12"
                  fill="#0d9488"
                  fillOpacity="0"
                  className="hover:fill-opacity-10 transition-all duration-200"
                />
                {/* White outer circle */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="5"
                  fill="#ffffff"
                  stroke="#0d9488"
                  strokeWidth="2"
                  className="transition-all duration-200"
                />
                {/* Dynamic tooltip box when hovering */}
                <title>{`Adherence on ${p.date}: ${p.val}%`}</title>
              </g>
            ))}
          </svg>

          {/* X Axis Labels under SVG */}
          <div className="flex justify-between px-6 pt-2 text-[10px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
            {data.map((d, index) => (
              <span key={index} className="w-10 text-center truncate">
                {formatDate(d.date)}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
