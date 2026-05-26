import React, { useEffect, useState } from 'react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-black/60 backdrop-blur-xl border-b border-white/10'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-sm select-none">
            P
          </div>
          <span className="text-white font-bold tracking-wider text-sm uppercase">
            Power Gym
          </span>
        </div>

        {/* Links */}
        <div className="hidden md:flex items-center gap-8">
          <a
            href="#features"
            className="text-white/65 hover:text-white text-sm transition-colors duration-200"
          >
            Features
          </a>
          <a
            href="#pricing"
            className="text-white/65 hover:text-white text-sm transition-colors duration-200"
          >
            Pricing
          </a>
          <a
            href="#"
            className="text-white/65 hover:text-white text-sm transition-colors duration-200"
          >
            Sign In
          </a>
          <a
            href="#"
            className="bg-indigo-gradient text-white text-sm font-semibold px-5 py-2 rounded-full glow-indigo-sm hover:opacity-90 transition-opacity"
          >
            Get Started
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-white/65 hover:text-white p-2"
          aria-label="Open menu"
        >
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </nav>
  )
}
