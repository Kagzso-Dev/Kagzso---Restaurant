import axios from "axios";

// Get API URL from environment (Netlify) or fallback to local
const baseURL = (
    import.meta.env.VITE_API_URL || "http://localhost:5005"
).replace(/\/+$/, "");

// Create axios instance
const api = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor (Token + Tenant)
api.interceptors.request.use(
    (config) => {
        try {
            const user = JSON.parse(localStorage.getItem("user"));
            const selectedTenantId = localStorage.getItem("selectedTenantId");

            // Add JWT token
            if (user?.token) {
                config.headers.Authorization = `Bearer ${user.token}`;
            }

            // Add Tenant ID header
            if (selectedTenantId) {
                config.headers["x-tenant-id"] = selectedTenantId;
            }
        } catch (error) {
            console.error("LocalStorage error:", error);
        }

        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
export { baseURL };