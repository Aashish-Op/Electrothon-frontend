"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, MapPin, Shield } from "lucide-react";

export default function SosPage() {
  return (
    <div className="relative min-h-dvh bg-[#f7f6f2] text-slate-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-[radial-gradient(circle_at_top,rgba(251,170,100,0.2),transparent_46%),radial-gradient(circle_at_50%_18%,rgba(145,169,255,0.18),transparent_42%)]" />

      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 pb-16 pt-16">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[#e6dfd6] bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-[#fcfbf8] hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to website
          </Link>
          <Button
            asChild
            className="rounded-full border border-[#d9e3ff] bg-[#edf2ff] px-4 text-sm font-semibold text-[#2748b7] hover:bg-[#e5ecff]"
          >
            <Link href="/app">
              Open AI Chat
            </Link>
          </Button>
        </div>

        <div className="rounded-[2rem] border border-[#e7dfd4] bg-white/92 p-8 shadow-[0_24px_64px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                SOS App
              </p>
              <h1 className="font-display text-4xl leading-tight tracking-[-0.04em] text-slate-950 sm:text-5xl">
                One-tap SOS to reach responders and hospitals faster.
              </h1>
              <p className="text-lg leading-8 text-slate-600">
                MedConnect SOS lets citizens broadcast verified emergencies, share live location, and reach the nearest trained responders and hospitals instantly. Human operators and AI triage work together to get help moving in seconds.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-2xl bg-[#f4f1eb] p-4">
                  <Shield className="mt-1 h-5 w-5 text-[#4c65da]" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Safety-first routing
                    </p>
                    <p className="text-sm text-slate-600">
                      Verified incidents, risk-aware dispatch, and hospital readiness signals.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl bg-[#eef3ff] p-4">
                  <MapPin className="mt-1 h-5 w-5 text-[#2748b7]" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Live location sharing
                    </p>
                    <p className="text-sm text-slate-600">
                      Share real-time location and updates until responders arrive.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  className="rounded-full bg-[#111111] px-5 text-sm font-semibold text-white hover:bg-black"
                  asChild
                >
                  <Link href="/soon">
                    Get the app
                    <Download className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-[#d9e3ff] bg-[#edf2ff] px-5 text-sm font-semibold text-[#2748b7] hover:bg-[#e5ecff]"
                >
                  <Link href="/hospitals">Find hospitals</Link>
                </Button>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 rounded-[1.6rem] border border-[#e6dfd6] bg-white/90 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                Scan to download
              </div>
              <div className="rounded-2xl border border-[#e5dfd5] bg-white p-4 shadow-inner">
                <img
                  src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><rect width='180' height='180' fill='%23f7f6f2'/><rect x='18' y='18' width='36' height='36' fill='%23111111'/><rect x='126' y='18' width='36' height='36' fill='%23111111'/><rect x='18' y='126' width='36' height='36' fill='%23111111'/><rect x='60' y='60' width='60' height='60' fill='%23111111'/><rect x='114' y='114' width='24' height='24' fill='%23111111'/></svg>"
                  alt="Download SOS app QR"
                  className="h-44 w-44 rounded-xl border border-[#ebe4da]"
                />
              </div>
              <p className="text-xs text-slate-500 text-center">
                Point your camera to download the MedConnect SOS app.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
