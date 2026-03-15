"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Activity,
  ArrowRight,
  MapPin,
  Menu,
  Sparkles,
  X,
  ChevronDown,
  MessageSquare,
  Navigation,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navigationItems = [
  {
    title: "Platform",
    href: "#platform",
  },
  {
    title: "Network",
    href: "#network",
  },
  {
    title: "Contact",
    href: "#contact",
  },
];

export default function Header() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
    setServicesOpen(false);
  }, [pathname]);

  const resolveHref = (href: string) =>
    pathname === "/" ? href : `/${href}`;

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-full border border-white/50 bg-white/65 px-5 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-3xl ring-1 ring-white/40">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0f172a] text-white shadow-[0_10px_28px_rgba(15,23,42,0.22)]">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight text-slate-950">
              MedConnect
            </div>
            <div className="hidden text-xs uppercase tracking-[0.28em] text-slate-500 sm:block">
              Healthcare AI Platform
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navigationItems.map((item) => (
            <Link
              key={item.title}
              href={resolveHref(item.href)}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
            >
              {item.title}
            </Link>
          ))}

          <div className="relative">
            <button
              type="button"
              onClick={() => setServicesOpen((open) => !open)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-2 text-sm font-medium text-slate-700 transition-colors",
                servicesOpen ? "bg-white/70 text-slate-950" : "hover:bg-white/60"
              )}
              aria-haspopup="menu"
              aria-expanded={servicesOpen}
            >
              Services
              <ChevronDown className="h-4 w-4" />
            </button>
            {servicesOpen ? (
              <div className="absolute right-0 z-50 mt-3 w-60 overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur-xl">
                <Link
                  href="/app"
                  className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-[#eef2ff]"
                >
                  <MessageSquare className="h-4 w-4 text-[#4c65da]" />
                  AI Chat App
                </Link>
                <Link
                  href="/hospitals"
                  className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-[#eef2ff]"
                >
                  <Navigation className="h-4 w-4 text-[#4c65da]" />
                  Nearby Hospitals
                </Link>
                <Link
                  href="/sos"
                  className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-[#eef2ff]"
                >
                  <AlertTriangle className="h-4 w-4 text-[#d97706]" />
                  SOS App
                </Link>
              </div>
            ) : null}
          </div>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button
            asChild
            className="h-12 rounded-full border border-[#d9e3ff] bg-[#edf2ff] px-6 text-sm font-medium text-[#2748b7] shadow-[0_12px_28px_rgba(91,110,225,0.12)] hover:bg-[#e5ecff]"
          >
            <Link href="/app">
              Experience MedConnect
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 rounded-full border-[#d9d8d3] bg-white px-6 text-sm font-medium text-slate-900 shadow-[0_10px_28px_rgba(15,23,42,0.04)] hover:bg-[#fcfbf8]"
          >
            <Link href="/hospitals">
              Find Hospitals
              <MapPin className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ece7df] bg-white text-slate-900 md:hidden"
          aria-label="Toggle navigation"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

        <div
          className={cn(
          "mx-auto mt-3 max-w-7xl overflow-hidden rounded-[2rem] border border-white/60 bg-white/92 px-5 shadow-[0_18px_45px_rgba(15,23,42,0.1)] backdrop-blur-2xl transition-all md:hidden",
          isOpen ? "max-h-[420px] py-5 opacity-100" : "max-h-0 py-0 opacity-0"
        )}
      >
        <div className="space-y-2">
          {navigationItems.map((item) => (
            <Link
              key={item.title}
              href={resolveHref(item.href)}
              className="block rounded-2xl px-4 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-[#f4f6fb] hover:text-slate-950"
            >
              {item.title}
            </Link>
          ))}
        </div>

        <div className="mt-5 space-y-3 border-t border-[#ebe5db] pt-5">
          <div className="space-y-2 rounded-2xl border border-[#ebe5db] bg-white/80 p-3">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Services
            </div>
            <Link
              href="/app"
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-[#f4f6fb]"
            >
              <MessageSquare className="h-4 w-4 text-[#4c65da]" />
              AI Chat App
            </Link>
            <Link
              href="/hospitals"
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-[#f4f6fb]"
            >
              <Navigation className="h-4 w-4 text-[#4c65da]" />
              Nearby Hospitals
            </Link>
            <Link
              href="/sos"
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-[#f4f6fb]"
            >
              <AlertTriangle className="h-4 w-4 text-[#d97706]" />
              SOS App
            </Link>
          </div>
          <Button
            asChild
            className="h-12 w-full rounded-full border border-[#d9e3ff] bg-[#edf2ff] text-sm font-medium text-[#2748b7] hover:bg-[#e5ecff]"
          >
            <Link href="/app">
              Experience MedConnect
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 w-full rounded-full border-[#ebe5db] bg-white text-sm font-medium text-slate-950 hover:bg-[#faf8f4]"
          >
            <Link href="/hospitals">
              Find Hospitals
              <MapPin className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#eef3ff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#4660d2]">
            <Sparkles className="h-3.5 w-3.5" />
            AI healthcare intelligence
          </div>
        </div>
      </div>
    </header>
  );
}
