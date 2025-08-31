// PASTE THIS ENTIRE BLOCK INTO src/app/(protected)/cases/[caseId]/page.tsx

'use client';

import React, { useState, useEffect } from 'react';

import {
  Box,
  Button,
  CircularProgress,
  Container,
  Typography,
  Alert,
  Paper,
  Divider,
  Tabs,
  Tab,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  MenuItem,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '@/lib/axios';
import { useParams } from 'next/navigation';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { Autocomplete, Grid } from '@mui/material';
import DocumentUploader from '@/components/DocumentUploader';
import toast from 'react-hot-toast';

// --- TYPE DEFINITIONS ---
interface CaseDetail {
  id: string;
  caseName: string;
  caseNumber: string | null;
  description: string | null;
  status: string;
  createdAt: string;
  client: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Task {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  assignedTo: {
    id: string;
    name: string | null;
  };
}

interface DocumentType {
  id: string;
  fileName: string;
  fileType: string;
  createdAt: string;
  uploadedBy: {
    id: string;
    name: string | null;
  };
}

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface TimeEntry {
  id: string;
  description: string;
  startTime: string;
  duration: number | null;
  rate: number | null;
  billableAmount: number | null;
  invoiceStatus: string;
  user: { name: string | null };
}

interface ActiveTimer {
  id: string;
  description: string;
  startTime: string;
}

// --- VIEW COMPONENTS ---

function TimeTrackingWidget({ caseId }: { caseId: string }) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [unbilledTotal, setUnbilledTotal] = useState(0);
  const [userRole, setUserRole] = useState<string>('CLIENT');
  const [openTimerDialog, setOpenTimerDialog] = useState(false);
  const [timerForm, setTimerForm] = useState({ description: '', type: 'OTHER', rate: 250 });

  useEffect(() => {
    fetchUserProfile();
    fetchCaseTimeEntries();
    fetchActiveTimer();
  }, [caseId]);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      setUserRole(response.data.role);
    } catch (error) {
      console.error('Failed to fetch user profile');
    }
  };

  const fetchCaseTimeEntries = async () => {
    try {
      const response = await api.get(`/time-tracking?caseId=${caseId}`);
      const entries = response.data.filter((entry: TimeEntry) => entry.invoiceStatus === 'UNBILLED');
      setTimeEntries(entries);
      const total = entries.reduce((sum: number, entry: TimeEntry) => sum + (entry.billableAmount || 0), 0);
      setUnbilledTotal(total);
    } catch (error) {
      console.error('Failed to fetch time entries');
    }
  };

  const fetchActiveTimer = async () => {
    try {
      const response = await api.get('/time-tracking/timer/active');
      if (response.data && response.data.caseId === caseId) {
        setActiveTimer(response.data);
      }
    } catch (error) {
      // No active timer
    }
  };

  const startTimer = async () => {
    try {
      await api.post('/time-tracking/timer/start', { ...timerForm, caseId });
      setOpenTimerDialog(false);
      setTimerForm({ description: '', type: 'OTHER', rate: 250 });
      fetchActiveTimer();
      toast.success('Timer started for this case');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start timer');
    }
  };

  const stopTimer = async () => {
    try {
      await api.post('/time-tracking/timer/stop', {});
      setActiveTimer(null);
      fetchCaseTimeEntries();
      toast.success('Timer stopped and time entry created');
    } catch (error) {
      toast.error('Failed to stop timer');
    }
  };

  const generateInvoice = async () => {
    try {
      const timeEntryIds = timeEntries.map(entry => entry.id);
      const response = await api.post('/billing/draft-from-time-entries', {
        caseId,
        timeEntryIds,
      });
      
      toast.success(`Draft invoice created: ${response.data.invoiceNumber}`);
      fetchCaseTimeEntries(); // Refresh to show updated status
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create invoice');
    }
  };

  if (userRole === 'CLIENT') return null;

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccessTimeIcon /> Time Tracking
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
            <Typography variant="subtitle2">Unbilled Time</Typography>
            <Typography variant="h4">${unbilledTotal.toFixed(2)}</Typography>
            <Typography variant="body2">{timeEntries.length} entries</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {activeTimer ? (
              <Button
                variant="contained"
                color="error"
                onClick={stopTimer}
                fullWidth
              >
                Stop Timer
              </Button>
            ) : (
              <Button
                variant="contained"
                color="success"
                startIcon={<PlayArrowIcon />}
                onClick={() => setOpenTimerDialog(true)}
                fullWidth
              >
                Start Timer
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<ReceiptIcon />}
              disabled={timeEntries.length === 0}
              onClick={generateInvoice}
              fullWidth
            >
              Generate Invoice
            </Button>
          </Box>
        </Grid>
      </Grid>

      {timeEntries.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Recent Unbilled Entries</Typography>
          {timeEntries.slice(0, 3).map((entry) => (
            <Box key={entry.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
              <Typography variant="body2">{entry.description}</Typography>
              <Typography variant="body2">${(entry.billableAmount || 0).toFixed(2)}</Typography>
            </Box>
          ))}
        </Box>
      )}

      <Dialog open={openTimerDialog} onClose={() => setOpenTimerDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start Timer for Case</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Description"
              value={timerForm.description}
              onChange={(e) => setTimerForm({ ...timerForm, description: e.target.value })}
              fullWidth
              required
            />
            <TextField
              select
              label="Type"
              value={timerForm.type}
              onChange={(e) => setTimerForm({ ...timerForm, type: e.target.value })}
              fullWidth
            >
              {['PHONE_CALL', 'MEETING', 'EMAIL', 'RESEARCH', 'DRAFTING', 'COURT_APPEARANCE', 'OTHER'].map((type) => (
                <MenuItem key={type} value={type}>{type.replace('_', ' ')}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Hourly Rate"
              type="number"
              value={timerForm.rate}
              onChange={(e) => setTimerForm({ ...timerForm, rate: Number(e.target.value) })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTimerDialog(false)}>Cancel</Button>
          <Button onClick={startTimer} variant="contained" color="success">
            Start Timer
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

function CaseDetailsView({ caseDetail }: { caseDetail: CaseDetail }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
      <Box sx={{ flex: '1 1 45%' }}><Typography variant="overline" color="text.secondary">Client Name</Typography><Typography>{caseDetail.client.name}</Typography></Box>
      <Box sx={{ flex: '1 1 45%' }}><Typography variant="overline" color="text.secondary">Client Email</Typography><Typography>{caseDetail.client.email}</Typography></Box>
      <Box sx={{ flex: '1 1 45%' }}><Typography variant="overline" color="text.secondary">Status</Typography><Typography>{caseDetail.status}</Typography></Box>
      <Box sx={{ flex: '1 1 45%' }}><Typography variant="overline" color="text.secondary">Date Opened</Typography><Typography>{new Date(caseDetail.createdAt).toLocaleDateString()}</Typography></Box>
      <Box sx={{ flex: '1 1 100%' }}><Typography variant="overline" color="text.secondary">Description</Typography><Typography>{caseDetail.description || 'No description provided.'}</Typography></Box>
    </Box>
  );
}

function TasksView({ caseId }: { caseId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userRole, setUserRole] = useState<string>('CLIENT');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [form, setForm] = useState({ 
    title: '', 
    description: '', 
    deadline: '', 
    assignedToId: '' 
  });

  useEffect(() => {
    if (!caseId) return;
    fetchUserProfile();
  }, [caseId]);

  useEffect(() => {
    if (userRole && userRole !== 'CLIENT') {
      fetchTasks();
      fetchUsers();
    } else if (userRole === 'CLIENT') {
      setLoading(false);
    }
  }, [userRole, caseId]);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      setUserRole(response.data.role);
    } catch (error) {
      console.error('Failed to fetch user profile');
    }
  };

  const fetchTasks = async () => {
    try {
      setError(''); setLoading(true);
      const response = await api.get(`/cases/${caseId}/tasks`);
      setTasks(response.data);
    } catch (err) { setError('Failed to fetch tasks.'); } finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      const staffUsers = response.data.filter((user: User) => 
        ['PARTNER', 'ASSOCIATE', 'PARALEGAL'].includes(user.role)
      );
      setUsers(staffUsers);
    } catch (error) {
      console.error('Failed to fetch users');
    }
  };





  const handleOpenCreate = () => setOpenCreate(true);
  const handleCloseCreate = () => {
    if (!creating) {
      setOpenCreate(false);
      setForm({ title: '', description: '', deadline: '', assignedToId: '' });
      setSelectedUser(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateTask = async () => {
    if (!form.title.trim() || !selectedUser) {
      toast.error('Title and Assignee are required');
      return;
    }
    try {
      setCreating(true);
      // Format the deadline to ISO string if it exists
      const deadline = form.deadline ? new Date(form.deadline).toISOString() : null;
      
      await api.post(`/cases/${caseId}/tasks`, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        deadline: deadline,
        assignedToId: selectedUser.id,
        caseId: caseId,
      });
      toast.success('Task created');
      handleCloseCreate();
      await fetchTasks();
    } catch (err: any) {
      console.error(err);
      const message = err?.response?.data?.message || 'Failed to create task';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{mt: 2}}>{error}</Alert>;

  // Don't show tasks to clients
  if (userRole === 'CLIENT') {
    return (
      <Box sx={{ mt: 2, textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          Task information is not available to clients
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Your legal team manages tasks internally to handle your case efficiently
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" onClick={handleOpenCreate}>Add Task</Button>
      </Box>
      {tasks.length === 0 ? <Typography>No tasks found for this case.</Typography> : (
        <TableContainer component={Paper}><Table size="small"><TableHead><TableRow><TableCell>Title</TableCell><TableCell>Assigned To</TableCell><TableCell>Status</TableCell><TableCell>Deadline</TableCell></TableRow></TableHead><TableBody>{tasks.map((task) => (<TableRow key={task.id} hover><TableCell>{task.title}</TableCell><TableCell>{task.assignedTo?.name || 'N/A'}</TableCell><TableCell>{task.status}</TableCell><TableCell>{task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'}</TableCell></TableRow>))}</TableBody></Table></TableContainer>
      )}

      {/* Create Task Modal */}
      <Dialog open={openCreate} onClose={handleCloseCreate} fullWidth maxWidth="sm">
        <DialogTitle>Add New Task</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              name="title"
              label="Task Title"
              type="text"
              fullWidth
              variant="outlined"
              value={form.title}
              onChange={handleChange}
              required
            />
            <Autocomplete
              options={users}
              getOptionLabel={(option) => `${option.name} (${option.role}) - ${option.email}`}
              value={selectedUser}
              onChange={(event, newValue) => setSelectedUser(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Assign To"
                  required
                  helperText="Search and select a staff member"
                />
              )}
              fullWidth
            />
            <TextField
              margin="dense"
              name="description"
              label="Description"
              type="text"
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={form.description}
              onChange={handleChange}
            />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                label="Deadline"
                value={form.deadline ? new Date(form.deadline) : null}
                onChange={(newValue) => setForm({ ...form, deadline: newValue ? newValue.toISOString() : '' })}
                slotProps={{ textField: { fullWidth: true, variant: 'outlined', margin: 'dense' } }}
              />
            </LocalizationProvider>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreate} disabled={creating}>Cancel</Button>
          <Button onClick={handleCreateTask} variant="contained" disabled={creating}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function DocumentsView({ caseId }: { caseId: string }) {
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewDoc, setPreviewDoc] = useState<DocumentType | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const fetchDocuments = async () => {
    try {
      setError(''); setLoading(true);
      const response = await api.get(`/cases/${caseId}/documents`);
      setDocuments(response.data);
    } catch (err) { setError('Failed to fetch documents.'); } finally { setLoading(false); }
  };

  const handleDownload = async (documentId: string, filename: string) => {
    try {
      const response = await api.get(`/documents/${documentId}/download`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const handlePreview = async (doc: DocumentType) => {
    // For non-previewable files, just show the modal without loading content
    if (!canPreview(doc.fileType)) {
      setPreviewDoc(doc);
      setPreviewUrl('');
      return;
    }
    
    try {
      const response = await api.get(`/documents/${doc.id}/download`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: doc.fileType }));
      setPreviewUrl(url);
      setPreviewDoc(doc);
    } catch (error) {
      toast.error('Failed to preview file');
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    setPreviewDoc(null);
  };

  const canPreview = (fileType: string) => {
    return fileType.startsWith('image/') || 
           fileType === 'application/pdf' || 
           fileType.startsWith('text/');
  };

  useEffect(() => { if (caseId) { fetchDocuments(); } }, [caseId]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{mt: 2}}>{error}</Alert>;

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <DocumentUploader caseId={caseId} onUploadSuccess={fetchDocuments} />
      </Box>
      {documents.length === 0 ? <Typography>No documents found for this case.</Typography> : (
        <TableContainer component={Paper}><Table size="small"><TableHead><TableRow><TableCell>File Name</TableCell><TableCell>Uploaded By</TableCell><TableCell>Date Uploaded</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead><TableBody>{documents.map((doc) => (<TableRow key={doc.id} hover><TableCell>
                  <Box 
                    component="span" 
                    sx={{ 
                      cursor: 'pointer', 
                      color: 'primary.main',
                      '&:hover': { textDecoration: 'underline' }
                    }}
                    onClick={() => handlePreview(doc)}
                  >
                    {doc.name}
                  </Box>
                </TableCell><TableCell>{doc.uploadedBy?.name || 'N/A'}</TableCell><TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell><TableCell align="right"><IconButton size="small" onClick={() => handleDownload(doc.id, doc.name)}><DownloadIcon /></IconButton><IconButton size="small"><DeleteIcon /></IconButton></TableCell></TableRow>))}</TableBody></Table></TableContainer>
      )}
      
      {/* Document Preview Modal */}
      <Dialog 
        open={!!previewDoc} 
        onClose={closePreview} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{previewDoc?.name}</Typography>
          <Box>
            <Button 
              onClick={() => previewDoc && handleDownload(previewDoc.id, previewDoc.name)}
              startIcon={<DownloadIcon />}
              sx={{ mr: 1 }}
            >
              Download
            </Button>
            <Button onClick={closePreview}>Close</Button>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '100%' }}>
          {previewDoc && (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {previewDoc.fileType === 'application/pdf' ? (
                <iframe
                  src={previewUrl}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title={previewDoc.name}
                />
              ) : previewDoc.fileType.startsWith('image/') ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 2 }}>
                  <img 
                    src={previewUrl} 
                    alt={previewDoc.name}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                </Box>
              ) : previewDoc.fileType.startsWith('text/') ? (
                <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                  <iframe
                    src={previewUrl}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title={previewDoc.name}
                  />
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 4, textAlign: 'center' }}>
                  <Box sx={{ fontSize: '4rem', mb: 2 }}>📄</Box>
                  <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>Cannot Preview This File</Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 1, maxWidth: 400 }}>
                    {previewDoc.fileType.includes('word') || previewDoc.name.toLowerCase().includes('.docx') || previewDoc.name.toLowerCase().includes('.doc') 
                      ? 'Microsoft Word documents cannot be previewed in the browser.' 
                      : 'This file type cannot be previewed in the browser.'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 400 }}>
                    Please download the file to view it with the appropriate application.
                  </Typography>
                  <Button 
                    variant="contained" 
                    size="large"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownload(previewDoc.id, previewDoc.name)}
                    sx={{ px: 4, py: 1.5 }}
                  >
                    Download File
                  </Button>
                </Box>
              )}}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function CommunicationsView({ caseId }: { caseId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [documentRequests, setDocumentRequests] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>('CLIENT');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [newRequest, setNewRequest] = useState({ title: '', description: '' });
  const [openRequestDialog, setOpenRequestDialog] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (caseId) {
      fetchUserProfile();
      fetchMessages();
      fetchDocumentRequests();
    }
  }, [caseId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      setUserRole(response.data.role);
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile');
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await api.get(`/cases/${caseId}/communications/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages');
    }
  };

  const fetchDocumentRequests = async () => {
    try {
      const response = await api.get(`/cases/${caseId}/communications/document-requests`);
      setDocumentRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch document requests');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setIsTyping(true);
    try {
      await api.post(`/cases/${caseId}/communications/messages`, { content: newMessage });
      setNewMessage('');
      fetchMessages();
      toast.success('Message sent');
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsTyping(false);
    }
  };

  const createDocumentRequest = async () => {
    if (!newRequest.title.trim() || !newRequest.description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    try {
      await api.post(`/cases/${caseId}/communications/document-requests`, newRequest);
      setNewRequest({ title: '', description: '' });
      setOpenRequestDialog(false);
      fetchDocumentRequests();
      toast.success('Document request created');
    } catch (error) {
      toast.error('Failed to create document request');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'PARTNER': return '#1976d2';
      case 'ASSOCIATE': return '#388e3c';
      case 'PARALEGAL': return '#f57c00';
      case 'CLIENT': return '#7b1fa2';
      default: return '#616161';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'PARTNER': return '👔';
      case 'ASSOCIATE': return '⚖️';
      case 'PARALEGAL': return '📋';
      case 'CLIENT': return '👤';
      default: return '💼';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <Box sx={{ mt: 2, height: '70vh', display: 'flex', flexDirection: 'column' }}>
      <Grid container spacing={3} sx={{ flex: 1, overflow: 'hidden' }}>
        {/* Enhanced Message Board */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <Box sx={{ 
              p: 2, 
              borderBottom: 1, 
              borderColor: 'divider',
              bgcolor: 'primary.main',
              color: 'white'
            }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'white' }}>
                💬 Case Communications
                <Box sx={{ 
                  ml: 'auto', 
                  px: 1.5, 
                  py: 0.5, 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  borderRadius: 2,
                  fontSize: '0.75rem',
                  color: 'white'
                }}>
                  {messages.length} messages
                </Box>
              </Typography>
            </Box>
            
            {/* Messages Area */}
            <Box sx={{ 
              flex: 1, 
              overflow: 'auto', 
              p: 1,
              bgcolor: 'grey.50'
            }}>
              {messages.length === 0 ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%',
                  color: '#666666'
                }}>
                  <Typography variant="h6" sx={{ mb: 1, color: '#666666' }}>💭</Typography>
                  <Typography variant="body1" sx={{ color: '#333333', fontWeight: 500 }}>No messages yet</Typography>
                  <Typography variant="body2" sx={{ color: '#666666' }}>Start the conversation!</Typography>
                </Box>
              ) : (
                messages.map((message, index) => {
                  const isCurrentUser = message.sender.id === (currentUser?.userId || currentUser?.sub);
                  const showAvatar = index === 0 || messages[index - 1].sender.id !== message.sender.id;
                  
                  return (
                    <Box key={message.id} sx={{ 
                      display: 'flex', 
                      justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                      mb: showAvatar ? 2 : 0.5,
                      alignItems: 'flex-end'
                    }}>
                      {!isCurrentUser && showAvatar && (
                        <Box sx={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: '50%', 
                          bgcolor: getRoleColor(message.sender.role),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '1.2rem',
                          mr: 1,
                          boxShadow: 2
                        }}>
                          {getRoleIcon(message.sender.role)}
                        </Box>
                      )}
                      
                      <Box sx={{ 
                        maxWidth: '70%',
                        ml: !isCurrentUser && !showAvatar ? 6 : 0
                      }}>
                        {showAvatar && (
                          <Typography variant="caption" sx={{ 
                            display: 'block',
                            mb: 0.5,
                            ml: isCurrentUser ? 0 : 1,
                            color: getRoleColor(message.sender.role),
                            fontWeight: 600
                          }}>
                            {message.sender.name} • {message.sender.role}
                          </Typography>
                        )}
                        
                        <Paper sx={{
                          p: 1.5,
                          bgcolor: isCurrentUser ? '#1976d2' : 'white',
                          color: isCurrentUser ? 'white' : 'text.primary',
                          borderRadius: isCurrentUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          boxShadow: isCurrentUser ? '0 2px 8px rgba(25,118,210,0.3)' : 1,
                          border: isCurrentUser ? 'none' : '1px solid #e0e0e0'
                        }}>
                          <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                            {message.content}
                          </Typography>
                        </Paper>
                        
                        <Typography variant="caption" sx={{ 
                          display: 'block',
                          mt: 0.5,
                          textAlign: isCurrentUser ? 'right' : 'left',
                          color: 'text.secondary',
                          ml: isCurrentUser ? 0 : 1
                        }}>
                          {formatTime(message.createdAt)}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </Box>
            
            {/* Message Input */}
            <Box sx={{ 
              p: 2, 
              borderTop: 1, 
              borderColor: 'divider',
              bgcolor: 'white'
            }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={3}
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={isTyping}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      bgcolor: 'white',
                      border: '1px solid #e0e0e0',
                      '& fieldset': {
                        borderColor: '#e0e0e0'
                      },
                      '&:hover fieldset': {
                        borderColor: '#bdbdbd'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'primary.main'
                      },
                      '& input': {
                        color: '#333333 !important'
                      },
                      '& textarea': {
                        color: '#333333 !important'
                      }
                    },
                    '& .MuiInputBase-input::placeholder': {
                      color: '#757575',
                      opacity: 1
                    }
                  }}
                />
                <Button 
                  onClick={sendMessage} 
                  variant="contained" 
                  disabled={!newMessage.trim() || isTyping}
                  sx={{ 
                    borderRadius: 3,
                    px: 3,
                    py: 1.5
                  }}
                >
                  {isTyping ? '⏳' : '📤'}
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Press Enter to send, Shift+Enter for new line
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        {/* Enhanced Document Requests */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ 
              p: 2, 
              borderBottom: 1, 
              borderColor: 'divider',
              bgcolor: 'secondary.main',
              color: 'white'
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">📋 Document Requests</Typography>
                {userRole !== 'CLIENT' && (
                  <Button 
                    size="small" 
                    onClick={() => setOpenRequestDialog(true)}
                    sx={{ 
                      color: 'white', 
                      borderColor: 'rgba(255,255,255,0.5)',
                      '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                    }}
                    variant="outlined"
                  >
                    + Request
                  </Button>
                )}
              </Box>
            </Box>
            
            <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
              {documentRequests.length === 0 ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%',
                  color: 'text.secondary'
                }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>📄</Typography>
                  <Typography variant="body2">No document requests</Typography>
                </Box>
              ) : (
                documentRequests.map((request) => (
                  <Paper key={request.id} sx={{ 
                    mb: 2, 
                    p: 2, 
                    border: 1, 
                    borderColor: request.status === 'PENDING' ? 'warning.main' : 'success.main',
                    borderRadius: 2,
                    position: 'relative',
                    '&:hover': { boxShadow: 3 }
                  }}>
                    <Box sx={{ 
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: request.status === 'PENDING' ? 'warning.light' : 'success.light',
                      color: request.status === 'PENDING' ? 'warning.dark' : 'success.dark',
                      fontSize: '0.7rem',
                      fontWeight: 600
                    }}>
                      {request.status}
                    </Box>
                    
                    <Typography variant="subtitle2" sx={{ mb: 1, pr: 8 }}>
                      {request.title}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                      {request.description}
                    </Typography>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      mb: request.response ? 1 : 0
                    }}>
                      <Box sx={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: '50%', 
                        bgcolor: getRoleColor(request.requestedBy.role || 'CLIENT'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem'
                      }}>
                        {getRoleIcon(request.requestedBy.role || 'CLIENT')}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {request.requestedBy.name}
                      </Typography>
                    </Box>
                    
                    {request.response && (
                      <Box sx={{ 
                        mt: 1, 
                        p: 1.5, 
                        bgcolor: 'success.light', 
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'success.main'
                      }}>
                        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                          📝 Response: {request.response}
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                ))
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Enhanced Document Request Dialog */}
      <Dialog 
        open={openRequestDialog} 
        onClose={() => setOpenRequestDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: 'secondary.main',
          color: 'white',
          textAlign: 'center'
        }}>
          📋 Request Document
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Document Title"
            value={newRequest.title}
            onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
            sx={{ mb: 2 }}
            variant="outlined"
          />
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Description"
            value={newRequest.description}
            onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
            variant="outlined"
            placeholder="Please describe what document you need and why..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenRequestDialog(false)} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button 
            onClick={createDocumentRequest} 
            variant="contained" 
            color="secondary"
            sx={{ 
              borderRadius: 2
            }}
          >
            Create Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// --- MAIN PAGE COMPONENT ---
export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.caseId as string;
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => { setActiveTab(newValue); };
  useEffect(() => {
    if (!caseId) return;
    const fetchCaseDetail = async () => {
      try {
        setError(''); setLoading(true);
        console.log('Fetching case details for caseId:', caseId);
        
        // First, test backend connectivity
        try {
          const profileResponse = await api.get('/auth/profile');
          console.log('Backend is reachable, user profile:', profileResponse.data);
        } catch (healthErr: any) {
          console.error('Backend health check failed:', healthErr);
          if (!healthErr.response) {
            throw new Error('Backend server is not running or not reachable');
          }
          if (healthErr.response?.status === 401) {
            throw new Error('User is not authenticated');
          }
        }
        
        const response = await api.get(`/cases/${caseId}`);
        console.log('Case details response:', response.data);
        setCaseDetail(response.data);
      } catch (err: any) { 
        console.error('Error fetching case details:', err);
        console.error('Error response:', err.response?.data);
        console.error('Error status:', err.response?.status);
        
        let errorMessage = 'Failed to fetch case details.';
        if (err.message === 'Backend server is not running or not reachable') {
          errorMessage = 'Backend server is not running. Please start the backend server on port 3000.';
        } else if (err.message === 'User is not authenticated') {
          errorMessage = 'You are not logged in. Please log in again.';
          // Redirect to login page
          window.location.href = '/login';
          return;
        } else if (err.response?.status === 401) {
          errorMessage = 'You are not authorized to view this case. Please log in again.';
          window.location.href = '/login';
          return;
        } else if (err.response?.status === 404) {
          errorMessage = 'Case not found or you do not have access to it.';
        } else if (err.response?.status === 403) {
          errorMessage = 'You do not have permission to view this case.';
        } else if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.code === 'NETWORK_ERROR' || !err.response) {
          errorMessage = 'Network error. Please check if the backend server is running on port 3000.';
        }
        
        setError(errorMessage); 
      } finally { setLoading(false); }
    };
    fetchCaseDetail();
  }, [caseId]);
  if (loading) return <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Container>;
  if (error) return <Container><Alert severity="error" sx={{ mt: 2 }}>{error}<br/><small>Case ID: {caseId}</small></Alert></Container>;
  if (!caseDetail) return <Container><Alert severity="info">Case not found.</Alert></Container>;
  return (
    <Container>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>{caseDetail.caseName}</Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>Case Number: {caseDetail.caseNumber || 'N/A'}</Typography>
        <Divider sx={{ my: 2 }} />
        <TimeTrackingWidget caseId={caseId} />
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}><Tab label="Details" /><Tab label="Tasks" /><Tab label="Documents" /><Tab label="Communications" /></Tabs>
        </Box>
        {activeTab === 0 && <CaseDetailsView caseDetail={caseDetail} />}
        {activeTab === 1 && <TasksView caseId={caseId} />}
        {activeTab === 2 && <DocumentsView caseId={caseId} />}
        {activeTab === 3 && <CommunicationsView caseId={caseId} />}
      </Paper>
    </Container>
  );
}