import React from 'react'

export default function Footer() {
  return (
    <footer className="border-t border-white/10 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo + tagline */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                P
              </div>
              <span className="text-white font-bold tracking-wider text-sm uppercase">
                Power Gym
              </span>
            </div>
            <p className="text-white/35 text-xs">专业健身房管理平台</p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-6">
            {[
              { label: 'Features', href: '#features' },
              { label: 'Pricing', href: '#pricing' },
              { label: 'Sign In', href: '#' },
              { label: 'Privacy', href: '#' },
              { label: 'Terms', href: '#' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-white/40 hover:text-white/70 text-sm transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-white/30 text-xs text-center md:text-right">
            © 2026 Power Gym. All rights reserved.
            <br />
            ABN 00 000 000 000
          </p>
        </div>
      </div>
    </footer>
  )
}
