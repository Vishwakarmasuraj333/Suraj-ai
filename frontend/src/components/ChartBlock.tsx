"use client";

import React, { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import type { ChartPayload } from "@/types";

const COLORS = ["#f97316", "#38bdf8", "#a855f7", "#10b981", "#f43f5e", "#eab308"];
const VALID_CHART_TYPES = ["bar", "line", "area", "pie"] as const;
type ChartKind = (typeof VALID_CHART_TYPES)[number];

function normalizeChartType(t?: string): ChartKind {
  return VALID_CHART_TYPES.includes(t as ChartKind) ? (t as ChartKind) : "bar";
}

interface ChartBlockProps {
  payload: ChartPayload;
}

export function ChartBlock({ payload }: ChartBlockProps) {
  const [chartType, setChartType] = useState<ChartKind>(normalizeChartType(payload.type));

  React.useEffect(() => {
    setChartType(normalizeChartType(payload.type));
  }, [payload.type]);

  const data = Array.isArray(payload.data)
    ? payload.data.filter((item): item is Record<string, string | number> => Boolean(item && typeof item === "object"))
    : [];
  if (!data.length) return null;

  const firstItem = data[0];
  const xKey =
    payload.xKey ||
    Object.keys(firstItem).find((k) => typeof firstItem[k] === "string") ||
    "label";
  const series =
    payload.series && payload.series.length > 0
      ? payload.series
      : Object.keys(firstItem).filter((k) => k !== xKey && typeof firstItem[k] === "number");

  if (!series.length) return null;

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-slate-200/80 bg-white/85 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-orange-500" />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {payload.title || "Interactive Data Chart"}
          </h4>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200/80 bg-slate-100/80 p-0.5 text-xs dark:border-white/10 dark:bg-white/5">
          {(["bar", "line", "area", "pie"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setChartType(t)}
              className={`rounded-md px-2.5 py-1 capitalize transition ${
                chartType === t
                  ? "bg-white font-semibold text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.92)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  color: "#f8fafc",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              {series.map((key, idx) => (
                <Bar key={key} dataKey={key} fill={COLORS[idx % COLORS.length]} radius={[6, 6, 0, 0]} />
              ))}
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.92)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  color: "#f8fafc",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              {series.map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2.4}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          ) : chartType === "area" ? (
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.92)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  color: "#f8fafc",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              {series.map((key, idx) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[idx % COLORS.length]}
                  fill={COLORS[idx % COLORS.length]}
                  fillOpacity={0.22}
                />
              ))}
            </AreaChart>
          ) : (
            <PieChart>
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.92)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  color: "#f8fafc",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Pie
                data={data}
                dataKey={series[0]}
                nameKey={xKey}
                cx="50%"
                cy="50%"
                outerRadius={88}
                label
              >
                {data.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

