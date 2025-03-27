import axios from "axios";

// Create an Axios instance with a base URL
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // 15 seconds timeout
});

// Add a request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    console.error("Axios request error:", error);
    return Promise.reject(error);
  }
);

// Add a response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("API Response Error:", error.response.status, error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("API Request Error (No Response):", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("API Error:", error.message);
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
