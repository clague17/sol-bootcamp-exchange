module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundSize: {
        200: "200%",
      },
      animation: {
        "custom-pulse": "gradient-animation 4s linear infinite",
        "bounce-slow": "bounce 4s ease infinite",
      },
      colors: {
        "kyogre-blue-light": "rgb(0, 119, 188)",
        "kyogre-blue-dark": "rgb(6, 90, 156)",
        "kyogre-red": "rgb(230, 69, 86)",
        "kyogre-gray": "rgb(194, 213, 228)",
      },
    },
  },
  plugins: [],
};
