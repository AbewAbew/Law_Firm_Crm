// src/app/login/page.tsx
'use client';

import React, { useState } from 'react';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
} from '@mui/material';
import Image from 'next/image';
import api from '@/lib/axios';


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // const router = useRouter(); // <-- We don't need this anymore

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      // Get user role from response to redirect appropriately
      const userRole = response.data.user?.role;
      
      // Role-based redirect
      if (userRole === 'PARTNER') {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/cases';
      }

    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || 'Login failed. Please try again.';
      setError(errorMessage);
      console.error('Login error:', err.response);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Image
          src="/logo.png"
          alt="Company Logo"
          width={200}
          height={23}
          style={{ marginBottom: '16px' }}
        />
        <Typography component="h1" variant="h5">
          TBEST Sign In
        </Typography>
        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{ mt: 1 }}
        >
          {/* ... The rest of the JSX for the form remains exactly the same ... */}
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Sign In
          </Button>
        </Box>
      </Box>
    </Container>
  );
}