/* eslint-disable import/no-anonymous-default-export */
import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        xs: '320px',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
    },
  },
  plugins: [typography],
}
/*
import { heroui } from "@heroui/theme"

/** @type {import('tailwindcss').Config} */

// const config = {
//   content: [
//    './components/**/*.{js,ts,jsx,tsx,mdx}',
//    './app/**/*.{js,ts,jsx,tsx,mdx}',
//    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
//  ],
//  theme: {
//    extend: {
//      fontFamily: {
//        sans: ['var(--font-sans)'],
//        mono: ['var(--font-mono)'],
//      },
//    },
//  },
//  darkMode: 'class',
//  plugins: [heroui()],
//}

//export default config
