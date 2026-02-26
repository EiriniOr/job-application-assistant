"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { getApplications } from "@/lib/supabase-storage";
import type { Application } from "@/lib/api";
import {
  Briefcase, FileText, Clock, Trophy, Loader2, Rocket, Sparkles,
  Search, Target, Wand2, ChevronRight,
} from "lucide-react";
import Link from "next/link";

// ─── Hero illustration: physical CV → particle stream → digital outputs ───────
const HeroIllustration = () => (
  <svg viewBox="0 0 480 260" fill="none" xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full" aria-hidden="true">
    <defs>
      <linearGradient id="h-doc" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#818cf8" stopOpacity="0.7" />
      </linearGradient>
      <linearGradient id="h-stream" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="45%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#e879f9" />
      </linearGradient>
      <linearGradient id="h-digital" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#e879f9" />
      </linearGradient>
      <filter id="h-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="h-softglow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>

    {/* === LEFT: Stacked document / CV === */}
    <rect x="20" y="36" width="108" height="140" rx="5" fill="#3b0764" opacity="0.45" transform="rotate(-7 20 36)" />
    <rect x="16" y="27" width="108" height="140" rx="5" fill="#4c1d95" opacity="0.6" transform="rotate(-3.5 16 27)" />
    <rect x="12" y="18" width="108" height="142" rx="5" fill="url(#h-doc)" />
    <rect x="12" y="18" width="108" height="142" rx="5" fill="none" stroke="white" strokeWidth="0.5" opacity="0.25" />
    {/* Document header */}
    <rect x="22" y="30" width="88" height="9" rx="3" fill="white" opacity="0.88" />
    <rect x="22" y="45" width="55" height="4" rx="2" fill="white" opacity="0.55" />
    <rect x="22" y="55" width="88" height="1" rx="0.5" fill="white" opacity="0.2" />
    {/* Section 1 */}
    <rect x="22" y="61" width="38" height="4" rx="2" fill="white" opacity="0.7" />
    <rect x="22" y="70" width="88" height="3" rx="1.5" fill="white" opacity="0.38" />
    <rect x="22" y="77" width="72" height="3" rx="1.5" fill="white" opacity="0.33" />
    <rect x="22" y="84" width="80" height="3" rx="1.5" fill="white" opacity="0.33" />
    <rect x="22" y="92" width="88" height="1" rx="0.5" fill="white" opacity="0.15" />
    {/* Section 2 */}
    <rect x="22" y="99" width="42" height="4" rx="2" fill="white" opacity="0.7" />
    <rect x="22" y="108" width="88" height="3" rx="1.5" fill="white" opacity="0.32" />
    <rect x="22" y="115" width="60" height="3" rx="1.5" fill="white" opacity="0.28" />
    <rect x="22" y="122" width="75" height="3" rx="1.5" fill="white" opacity="0.28" />
    {/* Section 3 */}
    <rect x="22" y="132" width="88" height="3" rx="1.5" fill="white" opacity="0.23" />
    <rect x="22" y="139" width="48" height="3" rx="1.5" fill="white" opacity="0.2" />
    <rect x="22" y="146" width="65" height="3" rx="1.5" fill="white" opacity="0.18" />
    {/* Pen */}
    <g transform="translate(42, 172)">
      <rect x="0" y="0" width="7" height="48" rx="3.5" fill="#a78bfa" opacity="0.88" />
      <rect x="4.5" y="4" width="2" height="36" rx="1" fill="#7c3aed" opacity="0.65" />
      <path d="M0.5 48 L3.5 62 L6.5 48 Z" fill="#c4b5fd" opacity="0.88" />
      <circle cx="3.5" cy="63" r="2" fill="#38bdf8" opacity="0.9" filter="url(#h-glow)" />
    </g>

    {/* === CENTRE: Particle dissolution & data streams === */}
    <circle cx="124" cy="42" r="2.5" fill="#818cf8" opacity="0.8" />
    <circle cx="132" cy="68" r="1.8" fill="#a78bfa" opacity="0.7" />
    <circle cx="127" cy="96" r="2.2" fill="#818cf8" opacity="0.8" />
    <circle cx="133" cy="120" r="1.5" fill="#c4b5fd" opacity="0.7" />
    <circle cx="126" cy="148" r="2" fill="#818cf8" opacity="0.6" />

    <path d="M122 42 C158 37,196 43,232 50 C265 57,292 53,322 51"
      stroke="url(#h-stream)" strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
    <path d="M122 70 C160 63,202 73,242 74 C276 75,302 71,330 75"
      stroke="url(#h-stream)" strokeWidth="2" opacity="0.75" strokeLinecap="round" />
    <path d="M122 98 C162 91,207 104,250 98 C282 93,310 99,338 97"
      stroke="url(#h-stream)" strokeWidth="3.5" opacity="0.95" strokeLinecap="round" filter="url(#h-softglow)" />
    <path d="M122 126 C160 132,202 122,242 128 C276 134,302 128,330 125"
      stroke="url(#h-stream)" strokeWidth="2" opacity="0.7" strokeLinecap="round" />
    <path d="M122 150 C157 157,196 148,232 154 C266 160,292 156,322 154"
      stroke="url(#h-stream)" strokeWidth="1.5" opacity="0.55" strokeLinecap="round" />

    <circle cx="160" cy="56" r="2" fill="#38bdf8" opacity="0.75" />
    <circle cx="186" cy="88" r="1.5" fill="#c4b5fd" opacity="0.8" />
    <circle cx="212" cy="46" r="1.2" fill="#e879f9" opacity="0.65" />
    <circle cx="230" cy="116" r="2.2" fill="#38bdf8" opacity="0.7" />
    <circle cx="255" cy="68" r="1.5" fill="#818cf8" opacity="0.85" />
    <circle cx="272" cy="143" r="2" fill="#e879f9" opacity="0.6" />
    <circle cx="290" cy="54" r="1.2" fill="#38bdf8" opacity="0.75" />
    <circle cx="303" cy="112" r="2.5" fill="#a78bfa" opacity="0.55" />
    <circle cx="318" cy="79" r="1.5" fill="#38bdf8" opacity="0.7" />
    <circle cx="177" cy="136" r="1.8" fill="#e879f9" opacity="0.6" />
    <circle cx="247" cy="157" r="1.5" fill="#818cf8" opacity="0.65" />

    {/* === RIGHT: Digital UI fragments === */}
    {/* ATS score donut */}
    <g transform="translate(340, 18)" filter="url(#h-softglow)">
      <circle cx="32" cy="32" r="29" fill="none" stroke="#1e1b4b" strokeWidth="5" />
      <circle cx="32" cy="32" r="29" fill="none" stroke="url(#h-digital)" strokeWidth="5"
        strokeDasharray="148 34" strokeDashoffset="41" strokeLinecap="round" />
      <text x="32" y="29" textAnchor="middle" fill="#38bdf8" fontSize="13"
        fontWeight="800" fontFamily="system-ui,sans-serif">87%</text>
      <text x="32" y="42" textAnchor="middle" fill="#94a3b8" fontSize="6.5"
        fontFamily="system-ui,sans-serif" letterSpacing="1.5">ATS MATCH</text>
    </g>

    {/* Mini kanban */}
    <g transform="translate(336, 100)">
      <rect x="0" y="0" width="34" height="62" rx="3" fill="#1e1b4b" opacity="0.7" />
      <rect x="38" y="0" width="34" height="62" rx="3" fill="#0c1a3a" opacity="0.7" />
      <rect x="76" y="0" width="34" height="62" rx="3" fill="#052e16" opacity="0.7" />
      <rect x="0" y="0" width="34" height="7" rx="3" fill="#7c3aed" opacity="0.9" />
      <rect x="38" y="0" width="34" height="7" rx="3" fill="#0e7490" opacity="0.9" />
      <rect x="76" y="0" width="34" height="7" rx="3" fill="#065f46" opacity="0.9" />
      {[11, 24, 37].map((y, i) => (
        <rect key={i} x="3" y={y} width="28" height="10" rx="2" fill="#4c1d95" opacity={0.8 - i * 0.2} />
      ))}
      {[11, 24].map((y, i) => (
        <rect key={i} x="41" y={y} width="28" height="10" rx="2" fill="#164e63" opacity={0.8 - i * 0.2} />
      ))}
      <rect x="79" y="11" width="28" height="10" rx="2" fill="#064e3b" opacity="0.9" />
    </g>

    {/* Offer checkmark */}
    <g transform="translate(340, 180)" filter="url(#h-glow)">
      <circle cx="22" cy="22" r="20" fill="#052e16" opacity="0.8" />
      <circle cx="22" cy="22" r="20" fill="none" stroke="#10b981" strokeWidth="2" opacity="0.9" />
      <path d="M11 22 L18 29 L33 14" stroke="#10b981" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" />
      <text x="22" y="40" textAnchor="middle" fill="#10b981" fontSize="6"
        fontFamily="system-ui,sans-serif" fontWeight="700">OFFER</text>
    </g>

    {/* Stream endpoint glows */}
    <circle cx="338" cy="52" r="3" fill="#38bdf8" opacity="0.8" filter="url(#h-glow)" />
    <circle cx="338" cy="98" r="3" fill="#a78bfa" opacity="0.8" filter="url(#h-glow)" />
    <circle cx="338" cy="125" r="3" fill="#38bdf8" opacity="0.7" filter="url(#h-glow)" />
    <circle cx="338" cy="155" r="3" fill="#e879f9" opacity="0.7" filter="url(#h-glow)" />
  </svg>
);

// ─── Feature panel illustrations ─────────────────────────────────────────────
const SearchIllustration = () => (
  <svg viewBox="0 0 320 210" fill="none" xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full" aria-hidden="true">
    <defs>
      <linearGradient id="si-bar" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#0891b2" stopOpacity="0.1" />
      </linearGradient>
    </defs>
    {/* Search bar */}
    <rect x="10" y="10" width="300" height="36" rx="18" fill="url(#si-bar)"
      stroke="#6366f1" strokeWidth="1" strokeOpacity="0.6" />
    <circle cx="34" cy="28" r="9" fill="none" stroke="#818cf8" strokeWidth="2" />
    <line x1="40" y1="34" x2="46" y2="40" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="58" y="24" width="140" height="8" rx="4" fill="#c4b5fd" opacity="0.25" />
    <rect x="202" y="23" width="2" height="10" rx="1" fill="#818cf8" opacity="0.8" />
    <rect x="240" y="21" width="34" height="14" rx="7" fill="#4f46e5" opacity="0.4" />
    <rect x="278" y="21" width="28" height="14" rx="7" fill="#0891b2" opacity="0.3" />
    {/* Card 1 */}
    <rect x="10" y="60" width="300" height="44" rx="8" fill="#1e1b4b" opacity="0.7"
      stroke="#4f46e5" strokeWidth="1" strokeOpacity="0.4" />
    <rect x="22" y="70" width="10" height="10" rx="2" fill="#818cf8" />
    <rect x="38" y="70" width="120" height="6" rx="3" fill="white" opacity="0.8" />
    <rect x="38" y="80" width="80" height="5" rx="2.5" fill="#94a3b8" opacity="0.55" />
    <rect x="238" y="71" width="60" height="8" rx="4" fill="#4f46e5" opacity="0.5" />
    <rect x="22" y="86" width="42" height="8" rx="4" fill="#2e1065" opacity="0.8" />
    <rect x="68" y="86" width="54" height="8" rx="4" fill="#2e1065" opacity="0.8" />
    {/* Card 2 */}
    <rect x="10" y="116" width="300" height="44" rx="8" fill="#0c1a2a" opacity="0.7"
      stroke="#0e7490" strokeWidth="1" strokeOpacity="0.4" />
    <rect x="22" y="126" width="10" height="10" rx="2" fill="#38bdf8" />
    <rect x="38" y="126" width="100" height="6" rx="3" fill="white" opacity="0.7" />
    <rect x="38" y="136" width="70" height="5" rx="2.5" fill="#94a3b8" opacity="0.5" />
    <rect x="238" y="127" width="60" height="8" rx="4" fill="#0e7490" opacity="0.5" />
    <rect x="22" y="142" width="50" height="8" rx="4" fill="#082032" opacity="0.9" />
    <rect x="76" y="142" width="42" height="8" rx="4" fill="#082032" opacity="0.9" />
    {/* Card 3 */}
    <rect x="10" y="172" width="300" height="30" rx="8" fill="#140a24" opacity="0.6"
      stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.3" />
    <rect x="22" y="181" width="10" height="10" rx="2" fill="#a78bfa" opacity="0.8" />
    <rect x="38" y="183" width="90" height="5" rx="2.5" fill="white" opacity="0.5" />
    <rect x="38" y="192" width="64" height="4" rx="2" fill="#94a3b8" opacity="0.4" />
  </svg>
);

const ATSIllustration = () => (
  <svg viewBox="0 0 320 210" fill="none" xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full" aria-hidden="true">
    <defs>
      <linearGradient id="ats-arc" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#a78bfa" />
      </linearGradient>
      <filter id="ats-glow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    {/* Score donut — circumference ≈ 440 → 82% = 361 */}
    <circle cx="100" cy="108" r="72" fill="none" stroke="#1e1b4b" strokeWidth="11" />
    <circle cx="100" cy="108" r="72" fill="none" stroke="url(#ats-arc)" strokeWidth="11"
      strokeDasharray="361 80" strokeDashoffset="110" strokeLinecap="round"
      filter="url(#ats-glow)" />
    <text x="100" y="101" textAnchor="middle" fill="#38bdf8" fontSize="30"
      fontWeight="800" fontFamily="system-ui,sans-serif">82%</text>
    <text x="100" y="118" textAnchor="middle" fill="#94a3b8" fontSize="10"
      fontFamily="system-ui,sans-serif" letterSpacing="2">ATS SCORE</text>
    <text x="100" y="133" textAnchor="middle" fill="#a78bfa" fontSize="9"
      fontFamily="system-ui,sans-serif">Strong Match</text>
    {/* Missing */}
    <text x="198" y="30" fill="#94a3b8" fontSize="8.5" fontFamily="system-ui"
      fontWeight="700" letterSpacing="1">MISSING</text>
    {[
      { y: 38, w: 74, label: "kubernetes" },
      { y: 62, w: 58, label: "terraform" },
      { y: 86, w: 50, label: "golang" },
    ].map((kw) => (
      <g key={kw.label}>
        <rect x="198" y={kw.y} width={kw.w} height="19" rx="9.5" fill="#7f1d1d" opacity="0.7" />
        <text x={198 + kw.w / 2} y={kw.y + 13} textAnchor="middle"
          fill="#fca5a5" fontSize="9" fontFamily="system-ui,sans-serif">{kw.label}</text>
      </g>
    ))}
    {/* Present */}
    <text x="198" y="128" fill="#94a3b8" fontSize="8.5" fontFamily="system-ui"
      fontWeight="700" letterSpacing="1">PRESENT</text>
    {[
      { x: 198, y: 136, w: 50, label: "python" },
      { x: 252, y: 136, w: 44, label: "react" },
      { x: 198, y: 161, w: 40, label: "sql" },
      { x: 242, y: 161, w: 56, label: "fastapi" },
      { x: 198, y: 186, w: 80, label: "machine-learning" },
    ].map((kw) => (
      <g key={kw.label}>
        <rect x={kw.x} y={kw.y} width={kw.w} height="19" rx="9.5" fill="#14532d" opacity="0.75" />
        <text x={kw.x + kw.w / 2} y={kw.y + 13} textAnchor="middle"
          fill="#86efac" fontSize="9" fontFamily="system-ui,sans-serif">{kw.label}</text>
      </g>
    ))}
  </svg>
);

const CVIllustration = () => (
  <svg viewBox="0 0 320 210" fill="none" xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full" aria-hidden="true">
    <defs>
      <linearGradient id="cv-after" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
        <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.12" />
      </linearGradient>
      <filter id="cv-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    {/* Before label */}
    <text x="65" y="15" textAnchor="middle" fill="#64748b" fontSize="8.5"
      fontFamily="system-ui" letterSpacing="1.5" fontWeight="700">BEFORE</text>
    {/* Before doc */}
    <rect x="10" y="20" width="110" height="182" rx="6" fill="#1e1b4b" opacity="0.7"
      stroke="#4c1d95" strokeWidth="1" />
    <rect x="20" y="33" width="90" height="7" rx="3" fill="#94a3b8" opacity="0.55" />
    <rect x="20" y="46" width="70" height="4" rx="2" fill="#94a3b8" opacity="0.32" />
    {[58, 67, 74, 81, 93, 102, 109, 121, 130, 137].map((y, i) => (
      <rect key={i} x="20" y={y} width={i % 3 === 0 ? 38 : i % 2 === 0 ? 90 : 72}
        height={i % 3 === 0 ? 5 : 3} rx={i % 3 === 0 ? 2 : 1.5}
        fill={i % 3 === 0 ? "#94a3b8" : "#64748b"}
        opacity={0.55 - i * 0.03} />
    ))}
    {/* Arrow + AI sparkle */}
    <g transform="translate(128, 88)">
      <path d="M0 18 L42 18" stroke="#a78bfa" strokeWidth="1.5"
        strokeDasharray="4 2" opacity="0.6" />
      <path d="M36 12 L44 18 L36 24" fill="none" stroke="#a78bfa"
        strokeWidth="2" strokeLinejoin="round" opacity="0.9" />
      <circle cx="21" cy="18" r="12" fill="#1e1b4b" opacity="0.9" />
      <path d="M21 10 L22.6 16.4 L29 18 L22.6 19.6 L21 26 L19.4 19.6 L13 18 L19.4 16.4 Z"
        fill="#e879f9" opacity="0.95" filter="url(#cv-glow)" />
    </g>
    {/* After label */}
    <text x="255" y="15" textAnchor="middle" fill="#38bdf8" fontSize="8.5"
      fontFamily="system-ui" letterSpacing="1.5" fontWeight="700">OPTIMISED</text>
    {/* After doc */}
    <rect x="200" y="20" width="110" height="182" rx="6" fill="url(#cv-after)"
      stroke="#38bdf8" strokeWidth="1.5" opacity="0.9" filter="url(#cv-glow)" />
    <rect x="210" y="33" width="90" height="7" rx="3" fill="#38bdf8" opacity="0.55" />
    <rect x="210" y="46" width="70" height="4" rx="2" fill="#a78bfa" opacity="0.45" />
    {[58, 67, 74, 81, 89, 98, 107, 114, 122, 134, 143, 150].map((y, i) => (
      <rect key={i} x="210" y={y}
        width={i % 3 === 0 ? 42 : i % 2 === 0 ? 90 : 78}
        height={i % 3 === 0 ? 5 : 3}
        rx={i % 3 === 0 ? 2 : 1.5}
        fill={i % 3 === 0 ? "#38bdf8" : "#e0f2fe"}
        opacity={i % 3 === 0 ? 0.65 : 0.45 - i * 0.02} />
    ))}
  </svg>
);

const CoverLetterIllustration = () => (
  <svg viewBox="0 0 320 210" fill="none" xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full" aria-hidden="true">
    <defs>
      <filter id="cl-glow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    {/* Letter document */}
    <rect x="44" y="8" width="232" height="196" rx="8" fill="#1e1b4b" opacity="0.8"
      stroke="#4c1d95" strokeWidth="1" />
    {/* Greeting */}
    <rect x="62" y="26" width="110" height="7" rx="3" fill="#c4b5fd" opacity="0.7" />
    {/* Para 1 — AI-written (violet highlight) */}
    {[46, 54, 62, 70].map((y) => (
      <rect key={y} x="62" y={y} width={y === 70 ? 140 : 196} height="4"
        rx="2" fill="#818cf8" opacity="0.42" />
    ))}
    {/* Para 2 */}
    {[86, 94, 102, 110].map((y) => (
      <rect key={y} x="62" y={y} width={y === 110 ? 120 : 196} height="4"
        rx="2" fill="#e0f2fe" opacity="0.3" />
    ))}
    {/* Para 3 */}
    {[126, 134, 142, 150].map((y) => (
      <rect key={y} x="62" y={y} width={y === 150 ? 108 : 196} height="4"
        rx="2" fill="#e0f2fe" opacity="0.26" />
    ))}
    {/* Closing */}
    <rect x="62" y="166" width="80" height="4" rx="2" fill="#c4b5fd" opacity="0.5" />
    <rect x="62" y="178" width="96" height="4" rx="2" fill="#c4b5fd" opacity="0.52" />
    <rect x="62" y="190" width="72" height="4" rx="2" fill="#c4b5fd" opacity="0.44" />
    {/* AI badge top-right */}
    <g transform="translate(228, 12)" filter="url(#cl-glow)">
      <circle cx="20" cy="20" r="20" fill="#1e0a3c" opacity="0.9" />
      <circle cx="20" cy="20" r="20" fill="none" stroke="#e879f9" strokeWidth="1" opacity="0.7" />
      <path d="M20 10 L21.8 17.2 L29 19 L21.8 20.8 L20 28 L18.2 20.8 L11 19 L18.2 17.2 Z"
        fill="#e879f9" opacity="0.95" />
      <text x="20" y="36" textAnchor="middle" fill="#e879f9" fontSize="5.5"
        fontFamily="system-ui,sans-serif" letterSpacing="0.5">AI</text>
    </g>
  </svg>
);

const KanbanIllustration = () => (
  <svg viewBox="0 0 320 210" fill="none" xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full" aria-hidden="true">
    {/* Column backgrounds */}
    {[
      { x: 4, fill: "#1e1b4b", hdr: "#7c3aed", lbl: "#c4b5fd", title: "SAVED" },
      { x: 82, fill: "#0c1a3a", hdr: "#164e63", lbl: "#67e8f9", title: "APPLIED" },
      { x: 160, fill: "#0d2233", hdr: "#1e3a5f", lbl: "#93c5fd", title: "ASSESS" },
      { x: 238, fill: "#052e16", hdr: "#14532d", lbl: "#86efac", title: "OFFER" },
    ].map((col) => (
      <g key={col.title}>
        <rect x={col.x} y="6" width="74" height="196" rx="6" fill={col.fill} opacity="0.6" />
        <rect x={col.x} y="6" width="74" height="26" rx="6" fill={col.hdr} opacity="0.9" />
        <text x={col.x + 37} y="23" textAnchor="middle" fill={col.lbl}
          fontSize="8" fontFamily="system-ui" fontWeight="700" letterSpacing="0.5">
          {col.title}
        </text>
      </g>
    ))}
    {/* Saved cards (4) */}
    {[36, 58, 80, 102].map((y, i) => (
      <g key={y}>
        <rect x="8" y={y} width="66" height="17" rx="3" fill="#3b0764" opacity={0.9 - i * 0.16} />
        <rect x="13" y={y + 5} width={30 + i * 4} height="3" rx="1.5"
          fill="#a78bfa" opacity={0.7 - i * 0.1} />
        <rect x="13" y={y + 11} width="22" height="2" rx="1"
          fill="#7c3aed" opacity={0.5 - i * 0.05} />
      </g>
    ))}
    {/* Applied cards (3) */}
    {[36, 58, 80].map((y, i) => (
      <g key={y}>
        <rect x="86" y={y} width="66" height="17" rx="3" fill="#0c2a3a" opacity={0.9 - i * 0.16} />
        <rect x="91" y={y + 5} width={28 + i * 5} height="3" rx="1.5"
          fill="#38bdf8" opacity={0.7 - i * 0.1} />
        <rect x="91" y={y + 11} width="20" height="2" rx="1"
          fill="#0e7490" opacity={0.5 - i * 0.06} />
      </g>
    ))}
    {/* Assessment cards (2) */}
    {[36, 58].map((y, i) => (
      <g key={y}>
        <rect x="164" y={y} width="66" height="17" rx="3" fill="#1e3a5f" opacity={0.9 - i * 0.2} />
        <rect x="169" y={y + 5} width={32 + i * 4} height="3" rx="1.5"
          fill="#93c5fd" opacity={0.7 - i * 0.12} />
        <rect x="169" y={y + 11} width="24" height="2" rx="1"
          fill="#1d4ed8" opacity={0.5 - i * 0.08} />
      </g>
    ))}
    {/* Offer card (1 — highlighted) */}
    <rect x="242" y="36" width="66" height="22" rx="4" fill="#064e3b" opacity="0.95"
      stroke="#10b981" strokeWidth="1.5" />
    <rect x="248" y="42" width="44" height="4" rx="2" fill="#86efac" opacity="0.9" />
    <rect x="248" y="50" width="32" height="3" rx="1.5" fill="#34d399" opacity="0.7" />
    <path d="M294 40 L295.4 45.2 L300.8 45.2 L296.5 48.2 L297.9 53.4 L294 50.2 L290.1 53.4 L291.5 48.2 L287.2 45.2 L292.6 45.2 Z"
      fill="#fbbf24" opacity="0.9" />
    {/* Flow arrows */}
    {[71, 149, 227].map((x) => (
      <path key={x} d={`M${x} 100 L${x + 10} 100`} stroke="#475569"
        strokeWidth="1.5" strokeDasharray="3 2" opacity="0.4" />
    ))}
  </svg>
);

// ─── Feature data ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    id: "search",
    label: "Job Search",
    icon: Search,
    accent: "#818cf8",
    activeClass: "border-violet-400/60 bg-violet-500/10 text-violet-200",
    title: "Find the right jobs, fast",
    description:
      "Search Swedish positions from Arbetsförmedlingen or international roles via LinkedIn and Indeed — all from one workspace. No more browser tabs.",
    bullets: [
      "Arbetsförmedlingen API for Swedish public sector & local roles",
      "LinkedIn & Indeed via JSearch for global positions",
      "Add any job manually — paste a URL and AI extracts title, company & description",
      "Filter by location, keyword, and language",
    ],
    illustration: <SearchIllustration />,
  },
  {
    id: "ats",
    label: "ATS Scoring",
    icon: Target,
    accent: "#38bdf8",
    activeClass: "border-cyan-400/60 bg-cyan-500/10 text-cyan-200",
    title: "Know your score before you apply",
    description:
      "Paste in a job description and get an ATS compatibility score in seconds — keyword coverage, soft skill detection, impact signals, and a tailored improvement plan.",
    bullets: [
      "Bilingual analysis — EN and SV CVs and job ads, cross-language handled",
      "Flags missing technical keywords and soft skills separately",
      "Score breakdown: similarity, keyword coverage, impact language",
      "Suggests specific rewrites and reprioritisations",
    ],
    illustration: <ATSIllustration />,
  },
  {
    id: "cv",
    label: "CV Rewrite",
    icon: Wand2,
    accent: "#e879f9",
    activeClass: "border-fuchsia-400/60 bg-fuchsia-500/10 text-fuchsia-200",
    title: "Your CV, tailored to every role",
    description:
      "One click rewrites your CV to match the job description — incorporating missing keywords truthfully, reprioritising experience, and outputting a professionally formatted Word file.",
    bullets: [
      "ATS-optimised structure: clear sections, standard headers, no fancy tables",
      "Truthful rewrite — never invents skills or fabricates experience",
      "Output in English or Swedish regardless of your original CV language",
      "Downloads as a polished Word doc with your photo and hyperlinks intact",
    ],
    illustration: <CVIllustration />,
  },
  {
    id: "cover",
    label: "Cover Letters",
    icon: FileText,
    accent: "#c4b5fd",
    activeClass: "border-purple-400/60 bg-purple-500/10 text-purple-200",
    title: "Cover letters that sound like you",
    description:
      "Generate personalised cover letters grounded in your resume and the specific role. Set your tone instructions once — applied to every letter from then on.",
    bullets: [
      "Grounded in your uploaded CV and resume text",
      "Custom instructions: set preferred tone, style, and values",
      "ATS-aware mode: incorporates missing keywords naturally",
      "Bilingual output — EN or SV matching the job ad's language",
    ],
    illustration: <CoverLetterIllustration />,
  },
  {
    id: "kanban",
    label: "Track",
    icon: Briefcase,
    accent: "#86efac",
    activeClass: "border-emerald-400/60 bg-emerald-500/10 text-emerald-200",
    title: "Every application, organised",
    description:
      "A drag-and-drop Kanban board moves applications through every stage — from saved through assessment to offer. Notes, cover letters, and ATS scores stored per card.",
    bullets: [
      "Pipeline: Saved → Applied → Assessment → Interview → Offer",
      "Drag cards between stages with a single gesture",
      "Per-application notes, cover letters, and ATS scores stored in the cloud",
      "Timeline view: saved date, applied date, and last updated — all on one screen",
    ],
    illustration: <KanbanIllustration />,
  },
];

const CYCLE_MS = 4800;

function FeatureShowcase() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  const goTo = useCallback((idx: number) => {
    setActive(idx);
    setProgress(0);
  }, []);

  useEffect(() => {
    setProgress(0);
    const start = Date.now();
    const tick = setInterval(() => {
      setProgress(Math.min(((Date.now() - start) / CYCLE_MS) * 100, 100));
    }, 50);
    const advance = setTimeout(() => {
      setActive((prev) => (prev + 1) % FEATURES.length);
    }, CYCLE_MS);
    return () => { clearInterval(tick); clearTimeout(advance); };
  }, [active]);

  const f = FEATURES[active];

  return (
    <div>
      {/* Tab breadcrumbs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FEATURES.map((feat, i) => {
          const Icon = feat.icon;
          const isActive = i === active;
          return (
            <button
              key={feat.id}
              onClick={() => goTo(i)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-300 overflow-hidden ${
                isActive
                  ? feat.activeClass
                  : "border-purple-500/20 bg-slate-900/40 text-purple-400 hover:border-purple-400/40 hover:text-purple-300"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{feat.label}</span>
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 h-0.5 bg-current transition-none rounded-full"
                  style={{ width: `${progress}%`, opacity: 0.75 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content panel — key forces remount for CSS animation */}
      <div
        key={active}
        className="feature-panel-enter grid md:grid-cols-2 gap-8 items-center px-8 py-10 rounded-2xl border border-purple-500/20 bg-slate-900/40 backdrop-blur min-h-[340px]"
      >
        {/* Left: description */}
        <div className="space-y-5">
          <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
            {f.title}
          </h2>
          <p className="text-purple-200 leading-relaxed text-[15px]">
            {f.description}
          </p>
          <ul className="space-y-2.5">
            {f.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-purple-300">
                <span
                  className="mt-0.5 h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: `${f.accent}22`, color: f.accent }}
                >
                  ✓
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        {/* Right: illustration */}
        <div className="h-52 md:h-60 flex items-center justify-center">
          {f.illustration}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {FEATURES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === active
                ? "w-6 bg-fuchsia-400"
                : "w-1.5 bg-purple-500/40 hover:bg-purple-400/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Upload your CV",
      desc: "Add your CV as a file (PDF or Word) and paste the text. Done once — reused for every application.",
      gradient: "from-violet-500 to-purple-500",
      shadow: "shadow-violet-500/25",
    },
    {
      n: "02",
      title: "Find & analyse",
      desc: "Search or paste a job URL. Get an ATS score, see what's missing, and let AI tailor your CV and cover letter to this role.",
      gradient: "from-cyan-500 to-blue-500",
      shadow: "shadow-cyan-500/25",
    },
    {
      n: "03",
      title: "Apply with confidence",
      desc: "Download your optimised Word CV, copy your cover letter, and move the card to Applied on the board.",
      gradient: "from-fuchsia-500 to-pink-500",
      shadow: "shadow-fuchsia-500/25",
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center tracking-tight">
        How it works
      </h2>
      <div className="grid md:grid-cols-3 gap-4">
        {steps.map((s, i) => (
          <div
            key={i}
            className="relative p-6 rounded-2xl border border-purple-500/20 bg-slate-900/40 backdrop-blur hover:-translate-y-1 transition-transform"
          >
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-white font-black text-sm mb-4 bg-gradient-to-r ${s.gradient} shadow-lg ${s.shadow}`}>
              {s.n}
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className="hidden md:block absolute -right-2.5 top-10 h-5 w-5 text-purple-500/60 z-10" />
            )}
            <h3 className="text-white font-semibold mb-2">{s.title}</h3>
            <p className="text-sm text-purple-300 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      getApplications().then((apps) => { setApplications(apps); setIsLoading(false); });
    } else {
      setApplications([]);
      setIsLoading(false);
    }
  }, [user, authLoading]);

  const counts = {
    saved:     applications.filter((a) => a.status === "saved").length,
    applied:   applications.filter((a) => a.status === "applied").length,
    interview: applications.filter((a) => ["phone_screen", "interview"].includes(a.status)).length,
    offer:     applications.filter((a) => a.status === "offer").length,
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-10">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-950 via-slate-900 to-indigo-950 p-8 md:p-12 text-white shadow-2xl border border-purple-500/20">
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "linear-gradient(rgba(139,92,246,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.6) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }} />
        {/* Glow orbs */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-12 w-96 h-96 bg-indigo-700/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-fuchsia-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Left */}
          <div className="flex-1 space-y-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-fuchsia-400" />
              <span className="text-fuchsia-300 text-sm font-medium tracking-wide">
                AI-powered job search assistant
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05]">
              <span className="bg-gradient-to-r from-white via-violet-100 to-fuchsia-200 bg-clip-text text-transparent">
                JobbaJobba
              </span>
            </h1>
            <p className="text-lg text-slate-300 max-w-lg leading-relaxed">
              From raw CV to tailored application — search, score, rewrite, and track every job in one streamlined workspace.
            </p>
            {!user && (
              <div className="space-y-3 pt-1">
                <div className="flex gap-3 flex-wrap">
                  <Link href="/login">
                    <Button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-semibold px-6 py-3 shadow-lg shadow-purple-500/30 hover:-translate-y-0.5 transition-all">
                      <Rocket className="h-4 w-4 mr-2" />
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/jobs">
                    <Button variant="outline" className="border-purple-400/40 text-purple-200 hover:bg-purple-500/10 hover:text-white px-6 py-3 transition-all">
                      Browse Jobs
                    </Button>
                  </Link>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                  * Access is by invitation only. The app runs on personal API infrastructure — operating costs prevent open public access.
                </p>
              </div>
            )}
          </div>
          {/* Right: illustration */}
          <div className="w-full md:w-[480px] h-56 md:h-64 flex-shrink-0">
            <HeroIllustration />
          </div>
        </div>
      </div>

      {/* ── Logged-in: stats + links + recent ── */}
      {user ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Saved",      count: counts.saved,     icon: Briefcase, gradient: "from-violet-500 to-purple-500",  glow: "hover:shadow-purple-500/10" },
              { label: "Applied",    count: counts.applied,   icon: FileText,  gradient: "from-fuchsia-500 to-pink-500",   glow: "hover:shadow-fuchsia-500/10" },
              { label: "Interviews", count: counts.interview, icon: Clock,     gradient: "from-cyan-500 to-blue-500",      glow: "hover:shadow-cyan-500/10" },
              { label: "Offers",     count: counts.offer,     icon: Trophy,    gradient: "from-emerald-500 to-teal-500",   glow: "hover:shadow-emerald-500/10" },
            ].map(({ label, count, icon: Icon, gradient, glow }) => (
              <Card key={label} className={`border border-purple-500/20 shadow-lg bg-slate-900/50 backdrop-blur hover:shadow-xl ${glow} transition-shadow`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-purple-300">{label}</CardTitle>
                  <div className={`p-2 bg-gradient-to-r ${gradient} rounded-xl shadow-md`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-black text-white">{count}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Link href="/jobs">
              <Card className="border border-purple-500/20 shadow-lg hover:shadow-xl hover:shadow-purple-500/10 transition-all cursor-pointer bg-slate-900/50 backdrop-blur hover:-translate-y-1 group">
                <CardHeader>
                  <div className="p-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl w-fit shadow-md group-hover:scale-110 transition-transform">
                    <Briefcase className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-white mt-2">Search Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-purple-200">
                    Search Swedish jobs from Arbetsförmedlingen and international positions via LinkedIn/Indeed.
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/applications">
              <Card className="border border-purple-500/20 shadow-lg hover:shadow-xl hover:shadow-fuchsia-500/10 transition-all cursor-pointer bg-slate-900/50 backdrop-blur hover:-translate-y-1 group">
                <CardHeader>
                  <div className="p-3 bg-gradient-to-r from-fuchsia-500 to-pink-500 rounded-xl w-fit shadow-md group-hover:scale-110 transition-transform">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-white mt-2">Track Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-purple-200">
                    Manage your application pipeline with drag-and-drop Kanban board.
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>

          {applications.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4 text-white">Recent Applications</h2>
              <div className="space-y-2">
                {applications.slice(0, 5).map((app) => (
                  <Link key={app.id} href={`/applications/${app.id}`}>
                    <Card className="hover:shadow-md hover:shadow-purple-500/10 transition-all border border-purple-500/20 bg-slate-900/50 backdrop-blur hover:-translate-x-1">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{app.job_title}</p>
                          <p className="text-sm text-purple-300">{app.company}</p>
                        </div>
                        <Badge variant="outline" className="capitalize font-medium border-purple-400/50 text-purple-200">
                          {app.status.replace("_", " ")}
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* ── Not logged in: feature showcase + how it works + CTA ── */
        <>
          <FeatureShowcase />
          <HowItWorks />
          <div className="text-center py-6 space-y-4">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Ready to streamline your job hunt?
            </h2>
            <p className="text-purple-300 max-w-md mx-auto">
              Request access and get your own invite.
            </p>
            <Link href="/login">
              <Button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-semibold px-8 py-3 shadow-lg shadow-purple-500/30 hover:-translate-y-0.5 transition-all">
                <Rocket className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </Link>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              * Access is by invitation only — the app runs on personal API infrastructure and isn&apos;t open to the public.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
