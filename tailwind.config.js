/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // Warna dibaca dari variabel CSS di globals.css (berbeda untuk tema terang/gelap).
      // Format <alpha-value> menjaga utilitas seperti bg-steel/10 tetap berfungsi.
      colors: {
        floor: "rgb(var(--floor) / <alpha-value>)",     // latar halaman
        sheet: "rgb(var(--sheet) / <alpha-value>)",     // permukaan kartu
        ink: "rgb(var(--ink) / <alpha-value>)",         // teks utama
        mute: "rgb(var(--mute) / <alpha-value>)",       // teks sekunder
        rule: "rgb(var(--rule) / <alpha-value>)",       // garis
        steel: "rgb(var(--steel) / <alpha-value>)",     // aksen utama
        onsteel: "rgb(var(--onsteel) / <alpha-value>)", // teks di atas tombol aksen
        amber: "rgb(var(--amber) / <alpha-value>)",     // peringatan
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};