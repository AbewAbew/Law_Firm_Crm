// src/app/(protected)/cases/page.tsx
'use client';

import React, { useState, useEffect } from 'react';

import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Autocomplete, IconButton } from '@mui/material';
// We don't need the Link component here anymore
import api from '@/lib/axios';
import { useRouter } from 'next/navigation'; // <-- Import useRouter
import toast from 'react-hot-toast';

interface Case {
  id: string;
  caseName: string;
  caseNumber: string | null;
  status: string;
  client: {
    id: string;
    name: string | null;
  };
}

interface Client {
  id: string;
  name: string;
  email: string;
}

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string>('CLIENT');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const router = useRouter(); // <-- Initialize the router

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  // Create Case modal state
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ caseName: '', description: '' });
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [createNewClient, setCreateNewClient] = useState(false);
  const [enableClientAccess, setEnableClientAccess] = useState(false);
  const [sendCredentialsEmail, setSendCredentialsEmail] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', email: '', phone: '', address: '', password: '' });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchCases();
      // Only partners can fetch clients for case creation
      if (userRole === 'PARTNER') {
        fetchClients();
      }
    }
  }, [userRole, currentUserId]);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      console.log('User profile in cases page:', response.data);
      setUserRole(response.data.role);
      setCurrentUserId(response.data.userId || response.data.sub);
    } catch (error) {
      console.error('Failed to fetch user profile');
    }
  };

  const fetchCases = async () => {
    console.log('fetchCases called for user role:', userRole, 'user ID:', currentUserId);
    try {
      setError('');
      setLoading(true);
      const response = await api.get('/cases');
      const casesData = response.data;
      console.log('Cases data from backend:', casesData);
      
      // Backend now handles filtering, so we just use the data as-is
      setCases(casesData);
      setFilteredCases(casesData);
    } catch (err: any) {
      setError('Failed to fetch cases. Please try again.');
      console.error('Error fetching cases:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await api.get('/users');
      const clientUsers = response.data.filter((user: any) => user.role === 'CLIENT');
      setClients(clientUsers);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      // Don't show error to user as this is expected for non-privileged roles
    }
  };

  // --- NEW HANDLER FUNCTION ---
  const handleRowClick = (caseId: string) => {
    console.log('Navigating to case:', caseId);
    router.push(`/cases/${caseId}`);
  };

  const handleOpenCreate = () => setOpenCreate(true);
  const handleCloseCreate = () => {
    if (!creating) {
      setOpenCreate(false);
      setForm({ caseName: '', description: '' });
      setSelectedClient(null);
      setCreateNewClient(false);
      setEnableClientAccess(false);
      setSendCredentialsEmail(false);
      setClientForm({ name: '', email: '', phone: '', address: '', password: '' });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleClientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setClientForm((prev) => ({ ...prev, [name]: value }));
  };

  const refreshCases = async () => {
    try {
      setError('');
      setLoading(true);
      const response = await api.get('/cases');
      const casesData = response.data;
      
      // Backend now handles filtering, so we just use the data as-is
      setCases(casesData);
      setFilteredCases(casesData);
    } catch (err: any) {
      setError('Failed to fetch cases. Please try again.');
      console.error('Error refreshing cases:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter cases based on search term, status, and client
  useEffect(() => {
    let filtered = cases;

    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.caseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.caseNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    if (clientFilter) {
      filtered = filtered.filter(c => c.client?.id === clientFilter);
    }

    setFilteredCases(filtered);
  }, [cases, searchTerm, statusFilter, clientFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setClientFilter('');
  };

  const uniqueStatuses = [...new Set(cases.map(c => c.status))];

  const handleCreateCase = async () => {
    try {
      if (!form.caseName.trim()) {
        toast.error('Case name is required');
        return;
      }
      
      if (createNewClient) {
        if (!clientForm.name.trim() || !clientForm.email.trim()) {
          toast.error('Client name and email are required');
          return;
        }
      } else if (!selectedClient) {
        toast.error('Please select a client');
        return;
      }
      
      setCreating(true);
      
      const payload: any = {
        caseName: form.caseName.trim(),
        description: form.description.trim() || null,
      };
      
      if (createNewClient) {
        payload.clientName = clientForm.name.trim();
        payload.clientEmail = clientForm.email.trim();
        if (clientForm.phone.trim()) payload.clientPhone = clientForm.phone.trim();
        if (clientForm.address.trim()) payload.clientAddress = clientForm.address.trim();
        if (enableClientAccess && clientForm.password.trim()) {
          payload.clientPassword = clientForm.password.trim();
          payload.sendCredentialsEmail = sendCredentialsEmail;
        }
      } else {
        payload.clientId = selectedClient.id;
      }
      
      const response = await api.post('/cases', payload);
      
      if (response.data.clientLoginInfo) {
        if (sendCredentialsEmail) {
          toast.success('Case created! Login credentials sent to client via email.');
        } else {
          toast.success(`Case created! Client can login with: ${response.data.clientLoginInfo.email}`);
        }
      } else {
        toast.success('Case created successfully');
      }
      setOpenCreate(false);
      setForm({ caseName: '', description: '' });
      setSelectedClient(null);
      setCreateNewClient(false);
      setEnableClientAccess(false);
      setSendCredentialsEmail(false);
      setClientForm({ name: '', email: '', phone: '', address: '', password: '' });
      await refreshCases();
    } catch (err: any) {
      console.error(err);
      const message = err?.response?.data?.message || 'Failed to create case';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCase = async (caseId: string, caseName: string) => {
    if (window.confirm(`Are you sure you want to delete "${caseName}"? This will permanently delete the case and ALL related data including tasks, time entries, documents, appointments, and invoices. This action cannot be undone.`)) {
      try {
        await api.delete(`/cases/${caseId}`);
        toast.success('Case and all related data deleted successfully');
        await refreshCases();
      } catch (err: any) {
        console.error(err);
        const message = err?.response?.data?.message || 'Failed to delete case';
        toast.error(Array.isArray(message) ? message.join(', ') : message);
      }
    }
  };

  return (
    <Box sx={{ p: 3, minHeight: 'calc(100vh - 64px)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {userRole === 'CLIENT' ? 'My Cases' : 
           (userRole === 'ASSOCIATE' || userRole === 'PARALEGAL') ? 'Assigned Cases' : 'Cases'}
        </Typography>
        {userRole === 'PARTNER' && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            Create Case
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Search cases"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, number, or client"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {uniqueStatuses.map(status => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {userRole === 'PARTNER' && (
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Client</InputLabel>
                <Select
                  value={clientFilter}
                  label="Client"
                  onChange={(e) => setClientFilter(e.target.value)}
                >
                  <MenuItem value="">All Clients</MenuItem>
                  {clients.map(client => (
                    <MenuItem key={client.id} value={client.id}>{client.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          <Grid item xs={12} sm={2}>
            <Button onClick={clearFilters} variant="outlined" fullWidth>
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* ... Loading and Error JSX is the same ... */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell>Case Name</TableCell>
                <TableCell>Case Number</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Status</TableCell>
                {userRole === 'PARTNER' && <TableCell>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCases.map((caseItem) => (
                <TableRow key={caseItem.id} hover>
                  <TableCell 
                    component="th" 
                    scope="row"
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleRowClick(caseItem.id)}
                  >
                    {caseItem.caseName}
                  </TableCell>
                  <TableCell 
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleRowClick(caseItem.id)}
                  >
                    {caseItem.caseNumber || 'N/A'}
                  </TableCell>
                  <TableCell 
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleRowClick(caseItem.id)}
                  >
                    {caseItem.client?.name || 'N/A'}
                  </TableCell>
                  <TableCell 
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleRowClick(caseItem.id)}
                  >
                    {caseItem.status}
                  </TableCell>
                  {userRole === 'PARTNER' && (
                    <TableCell>
                      <IconButton
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCase(caseItem.id, caseItem.caseName);
                        }}
                        title="Delete Case"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Case Modal */}
      <Dialog open={openCreate} onClose={handleCloseCreate} fullWidth maxWidth="sm">
        <DialogTitle>Create Case</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Case Name"
              name="caseName"
              value={form.caseName}
              onChange={handleChange}
              required
              fullWidth
            />
            <TextField
              label="Description (optional)"
              name="description"
              value={form.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={createNewClient}
                  onChange={(e) => setCreateNewClient(e.target.checked)}
                />
              }
              label="Create new client"
            />
            
            {createNewClient ? (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  New Client Information
                </Typography>
                <TextField
                  label="Client Name"
                  name="name"
                  value={clientForm.name}
                  onChange={handleClientChange}
                  required
                  fullWidth
                />
                <TextField
                  label="Client Email"
                  name="email"
                  type="email"
                  value={clientForm.email}
                  onChange={handleClientChange}
                  required
                  fullWidth
                />
                <TextField
                  label="Phone (optional)"
                  name="phone"
                  value={clientForm.phone}
                  onChange={handleClientChange}
                  fullWidth
                />
                <TextField
                  label="Address (optional)"
                  name="address"
                  value={clientForm.address}
                  onChange={handleClientChange}
                  fullWidth
                  multiline
                  rows={2}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableClientAccess}
                      onChange={(e) => setEnableClientAccess(e.target.checked)}
                    />
                  }
                  label="Enable platform access for client"
                />
                {enableClientAccess && (
                  <>
                    <TextField
                      label="Client Password"
                      name="password"
                      type="password"
                      value={clientForm.password}
                      onChange={handleClientChange}
                      fullWidth
                      required
                      helperText="Client will use this password to login and view their cases"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={sendCredentialsEmail}
                          onChange={(e) => setSendCredentialsEmail(e.target.checked)}
                        />
                      }
                      label="Send login credentials via email"
                    />
                  </>
                )}
              </>
            ) : (
              <Autocomplete
                options={clients}
                getOptionLabel={(option) => `${option.name} (${option.email})`}
                value={selectedClient}
                onChange={(event, newValue) => setSelectedClient(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Client"
                    required
                    helperText="Search and select a client"
                  />
                )}
                fullWidth
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreate} disabled={creating}>Cancel</Button>
          <Button onClick={handleCreateCase} variant="contained" disabled={creating}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}