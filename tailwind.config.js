const tokens = require('./src/theme/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/app/**/*.{js,jsx,ts,tsx}', './src/components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        md: tokens.colors.light,
        'md-dark': tokens.colors.dark,
      },
      spacing: tokens.spacing,
      borderRadius: tokens.radii,
    },
  },
  plugins: [],
};
