import type { Metadata } from 'next'

import type { CSSProperties } from 'react'

export const metadata: Metadata = { robots: { index: false, follow: false } }

const SAND = '#faf7f2'
const TEAL = '#0f766e'

/** Grain, as an inline SVG so it costs no request and scales to any size. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")"

type Option = {
  id: string
  name: string
  note: string
  style: CSSProperties
}

const OPTIONS: Option[] = [
  {
    id: '1',
    name: '1 — Flat sand (dagens)',
    note: 'What you have now. Here for comparison.',
    style: { background: SAND },
  },
  {
    id: '2',
    name: '2 — Myk vertikal gradient',
    note: 'Warm at the top, near-white at the bottom. Barely there.',
    style: { background: `linear-gradient(180deg, #f6f0e6 0%, ${SAND} 45%, #ffffff 100%)` },
  },
  {
    id: '3',
    name: '3 — Teal-glød',
    note: 'A soft wash of the brand colour from the top left.',
    style: {
      background: `radial-gradient(900px 520px at 12% -8%, rgba(15,118,110,0.14), transparent 60%), ${SAND}`,
    },
  },
  {
    id: '4',
    name: '4 — Mesh',
    note: 'Two coloured pools blended into the sand. Modern, still calm.',
    style: {
      background: `radial-gradient(700px 460px at 8% 0%, rgba(15,118,110,0.16), transparent 62%), radial-gradient(620px 420px at 96% 12%, rgba(217,164,102,0.16), transparent 60%), ${SAND}`,
    },
  },
  {
    id: '5',
    name: '5 — Prikkerutenett',
    note: 'A faint dot grid. Reads as a work surface.',
    style: {
      background: `radial-gradient(rgba(15,118,110,0.16) 1px, transparent 1px) 0 0 / 22px 22px, ${SAND}`,
    },
  },
  {
    id: '6',
    name: '6 — Rutenett',
    note: 'Graph paper. Quietly technical.',
    style: {
      backgroundImage: `linear-gradient(rgba(15,118,110,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(15,118,110,0.09) 1px, transparent 1px)`,
      backgroundSize: '28px 28px',
      backgroundColor: SAND,
    },
  },
  {
    id: '7',
    name: '7 — Diagonale striper',
    note: 'Fine 45° lines. More texture than pattern.',
    style: {
      backgroundImage: `repeating-linear-gradient(45deg, rgba(15,118,110,0.055) 0 1px, transparent 1px 11px)`,
      backgroundColor: SAND,
    },
  },
  {
    id: '8',
    name: '8 — Korn',
    note: 'Paper grain over the sand. Tactile, print-like.',
    style: { backgroundImage: GRAIN, backgroundColor: SAND },
  },
  {
    id: '9',
    name: '9 — Korn + glød',
    note: 'The teal wash with grain on top. Warmest of the set.',
    style: {
      backgroundImage: `${GRAIN}, radial-gradient(900px 520px at 12% -8%, rgba(15,118,110,0.16), transparent 60%)`,
      backgroundColor: SAND,
    },
  },
]

function Sample({ option }: { option: Option }) {
  return (
    <figure className="flex flex-col gap-2">
      <div
        className="relative overflow-hidden rounded-2xl border border-[#e8e2d8]"
        style={{ height: 300, ...option.style }}
      >
        {/* A slice of real chrome so the background is judged in context. */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[13px] font-extrabold tracking-tight" style={{ color: TEAL }}>
            CVApp
          </span>
          <span
            className="rounded-full px-3 py-1 text-[11px] font-bold text-white"
            style={{ background: TEAL }}
          >
            Last ned PDF
          </span>
        </div>

        <div className="flex gap-3 px-4">
          <div className="flex w-1/3 flex-col gap-1.5">
            {['Om meg', 'Arbeidserfaring', 'Utdanning'].map((row, index) => (
              <div
                className="rounded-lg px-2 py-1.5 text-[11px]"
                key={row}
                style={
                  index === 0
                    ? { background: '#e2efec', color: '#0d5f59', fontWeight: 600 }
                    : { color: '#6b6862' }
                }
              >
                {row}
              </div>
            ))}
          </div>

          {/* The paper: always white, whatever sits behind it. */}
          <div
            className="flex-1 rounded-sm bg-white p-3"
            style={{ boxShadow: '0 14px 40px -14px rgb(0 0 0 / 0.35)' }}
          >
            <div className="h-2.5 w-2/3 rounded-full bg-[#1c2422]" />
            <div className="mt-1.5 h-1.5 w-1/2 rounded-full" style={{ background: TEAL }} />
            <div className="mt-3 space-y-1">
              {[100, 92, 96, 70].map((width, index) => (
                <div
                  className="h-1 rounded-full bg-[#e8e2d8]"
                  key={index}
                  style={{ width: `${width}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <figcaption>
        <div className="text-sm font-bold">{option.name}</div>
        <div className="text-xs text-[#6b6862]">{option.note}</div>
      </figcaption>
    </figure>
  )
}

export default function BackgroundsPage() {
  return (
    <main className="mx-auto max-w-[1500px] px-8 py-10">
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Bakgrunnsforslag</h1>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {OPTIONS.map((option) => (
          <Sample key={option.id} option={option} />
        ))}
      </div>
    </main>
  )
}
