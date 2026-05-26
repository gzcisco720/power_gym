import type { GatsbyConfig } from 'gatsby'

const config: GatsbyConfig = {
  siteMetadata: {
    title: 'Power Gym — Professional Gym Management Platform',
    description:
      'The all-in-one gym management platform for Australian gym owners. Training plans, nutrition tracking, analytics, and team management.',
    siteUrl: 'https://powergym.app',
  },
  plugins: ['gatsby-plugin-postcss'],
}

export default config
