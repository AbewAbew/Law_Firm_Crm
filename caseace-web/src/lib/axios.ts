// src/lib/axios.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000', // The base URL of our NestJS backend
  withCredentials: true, // <-- This is CRUCIAL!
});

export default api;