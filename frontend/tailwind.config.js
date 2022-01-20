module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      width: {
        128: "32rem",
        132: "36rem",
      },
      height: {
        128: "32rem",
      },
      backgroundSize: {
        200: "200%",
      },
      animation: {
        "custom-pulse": "gradient-animation 4s linear infinite",
        "bounce-slow": "bounce 4s ease infinite",
        "spin-slow": "spin 3s linear infinite",
      },
      colors: {
        "kyogre-blue-light": "rgb(0, 119, 188)",
        "kyogre-blue-dark": "rgb(6, 90, 156)",
        "kyogre-red": "rgb(230, 69, 86)",
        "kyogre-gray": "rgb(194, 213, 228)",
        "swap-yellow-dark": "rgba(255,189,3,255)",
        "swap-yellow-light": "rgba(255,227,130,255)",
      },
    },
  },
  plugins: [],
};
