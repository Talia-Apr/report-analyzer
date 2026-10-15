/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        floor: "#ECEEE9",   // latar, abu lantai pabrik
        sheet: "#FAFAF7",   // kertas laporan
        ink: "#1A2428",     // teks utama
        mute: "#5E6B70",    // teks sekunder
        rule: "#C9D0CB",    // garis
        steel: "#0F5E5C",   // aksen utama (tombol)
        amber: "#B86E00",   // peringatan
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
