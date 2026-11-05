/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			colors: {
				primary: {
					DEFAULT: "#2563eb",
					dark: "#1d4ed8",
					light: "#3b82f6",
				},
				secondary: "#0f172a",
				accent: "#f59e0b",
				success: "#10b981",
				danger: "#ef4444",
			},
			fontFamily: {
				sans: ["Inter", "system-ui", "sans-serif"],
			},
		},
	},
	plugins: [],
};
