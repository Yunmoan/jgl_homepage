import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api', // Using Vite proxy
  // Calendar source refreshes relay through the slow thonly.cc proxy and can legitimately
  // take a couple of minutes; the client must outlast the server's upstream deadline.
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor to add the auth token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Interceptor to handle token expiration
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    const isLoginRequest = error.config?.url === '/auth/login'
    if (error.response?.status === 401 && !isLoginRequest) {
      // Token expired or invalid
      localStorage.removeItem('token') // Clear the expired token
      // Redirect to login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?reason=session-expired'
      }
    }
    return Promise.reject(error)
  },
)

export default apiClient
