"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen items-center justify-center bg-[#040712] px-4 text-white">
        <div className="max-w-md rounded-2xl border border-white/15 bg-slate-900/90 p-8 text-center">
          <h2 className="text-lg font-bold">SURaj AI Recovery Mode</h2>
          <p className="mt-2 text-sm text-slate-300">
            {error.message || "A critical application error occurred."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-5 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
