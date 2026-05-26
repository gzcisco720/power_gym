import React from 'react'
import '../styles/global.css'
import CtaBanner from '../components/CtaBanner'
import FeaturesGrid from '../components/FeaturesGrid'
import Footer from '../components/Footer'
import Hero from '../components/Hero'
import HowItWorks from '../components/HowItWorks'
import Navbar from '../components/Navbar'
import Pricing from '../components/Pricing'
import ProductShowcase from '../components/ProductShowcase'
import Testimonials from '../components/Testimonials'

export default function IndexPage() {
  return (
    <main className="bg-[#0a0a14] overflow-x-hidden">
      <Navbar />
      <Hero />
      <FeaturesGrid />
      <HowItWorks />
      <ProductShowcase />
      <Pricing />
      <Testimonials />
      <CtaBanner />
      <Footer />
    </main>
  )
}

export function Head() {
  return (
    <>
      <title>Power Gym — Professional Gym Management Platform</title>
      <meta
        name="description"
        content="The all-in-one gym management platform for Australian gym owners. Training plans, nutrition tracking, analytics, and team management."
      />
      <meta property="og:title" content="Power Gym — Professional Gym Management Platform" />
      <meta
        property="og:description"
        content="Training plans, nutrition tracking, body composition testing, and performance analytics. Built for serious Australian gym businesses."
      />
      <link
        rel="icon"
        href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%236366f1'/><text y='.9em' font-size='80' x='10'>P</text></svg>"
      />
    </>
  )
}
