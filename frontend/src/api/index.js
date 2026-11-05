import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
	baseURL: API_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

function clearTokens() {
	localStorage.removeItem("access_token");
	localStorage.removeItem("refresh_token");
}

// Единый общий промис обновления токена (дедупликация параллельных 401)
let refreshPromise = null;

async function refreshAccessToken() {
	const refresh_token = localStorage.getItem("refresh_token");
	if (!refresh_token) {
		clearTokens();
		if (window.location.pathname !== "/login") {
			window.location.href = "/login";
		}
		throw new Error("No refresh token");
	}
	const res = await axios.post(`${API_URL}/auth/refresh`, {
		refresh_token,
	});
	localStorage.setItem("access_token", res.data.access_token);
	localStorage.setItem("refresh_token", res.data.refresh_token);
	return res.data.access_token;
}

api.interceptors.request.use((config) => {
	const token = localStorage.getItem("access_token");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

api.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;

		if (error.response?.status === 401 && !originalRequest._retry) {
			originalRequest._retry = true;

			try {
				if (!refreshPromise) {
					refreshPromise = refreshAccessToken().finally(() => {
						refreshPromise = null;
					});
				}
				const accessToken = await refreshPromise;
				originalRequest.headers.Authorization = `Bearer ${accessToken}`;
				return api(originalRequest);
			} catch (refreshError) {
				clearTokens();
				if (window.location.pathname !== "/login") {
					window.location.href = "/login";
				}
				return Promise.reject(refreshError);
			}
		}

		return Promise.reject(error);
	},
);

export default api;
