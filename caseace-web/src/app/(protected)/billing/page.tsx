'use client';

import React, { useState, useEffect } from 'react';
import RoleGuard from '@/components/RoleGuard';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { Add, Receipt, Payment, Visibility, Email, AutoAwesome } from '@mui/icons-material';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
  status: string;
  issueDate: string;
  dueDate: string;
  case: { caseName: string };
  client: { name: string };
}

interface TimeEntry {
  id: string;
  description: string;
  duration: number;
  rate: number;
  billable: boolean;
}

interface Case {
  id: string;
  caseName: string;
  client: { id: string; name: string };
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [openInvoiceDialog, setOpenInvoiceDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openViewInvoice, setOpenViewInvoice] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceDetails, setInvoiceDetails] = useState<any>(null);
  const [summary, setSummary] = useState({ totalInvoiced: 0, totalPaid: 0, outstanding: 0 });
  const [userRole, setUserRole] = useState<string>('CLIENT');
  
  const [invoiceForm, setInvoiceForm] = useState({
    caseId: '',
    dueDate: '',
    timeEntryIds: [] as string[],
    tax: 0,
    notes: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: 'CREDIT_CARD',
    reference: '',
    notes: '',
  });

  useEffect(() => {
    fetchUserProfile();
    fetchInvoices();
    fetchCases();
    fetchSummary();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      setUserRole(response.data.role);
    } catch (error) {
      console.error('Failed to fetch user profile');
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/billing/invoices');
      setInvoices(response.data);
    } catch (error) {
      toast.error('Failed to fetch invoices');
    }
  };

  const fetchCases = async () => {
    try {
      const response = await api.get('/cases');
      setCases(response.data);
    } catch (error) {
      console.error('Failed to fetch cases');
    }
  };

  const fetchTimeEntries = async (caseId: string) => {
    try {
      const response = await api.get(`/time-tracking?caseId=${caseId}&status=BILLABLE`);
      setTimeEntries(response.data);
    } catch (error) {
      console.error('Failed to fetch time entries');
    }
  };

  const fetchSummary = async () => {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);
      const endDate = new Date();
      
      const response = await api.get(`/billing/summary?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch summary');
    }
  };

  const handleCreateInvoice = async () => {
    try {
      const data = {
        ...invoiceForm,
        dueDate: new Date(invoiceForm.dueDate).toISOString(),
      };

      await api.post('/billing/invoices', data);
      toast.success('Invoice created successfully');
      setOpenInvoiceDialog(false);
      resetInvoiceForm();
      fetchInvoices();
      fetchSummary();
    } catch (error) {
      toast.error('Failed to create invoice');
    }
  };

  const handleCreatePayment = async () => {
    if (!selectedInvoice) return;

    try {
      const data = {
        invoiceId: selectedInvoice.id,
        ...paymentForm,
      };

      await api.post('/billing/payments', data);
      toast.success('Payment recorded successfully');
      setOpenPaymentDialog(false);
      setSelectedInvoice(null);
      resetPaymentForm();
      fetchInvoices();
      fetchSummary();
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  const resetInvoiceForm = () => {
    setInvoiceForm({
      caseId: '',
      dueDate: '',
      timeEntryIds: [],
      tax: 0,
      notes: '',
    });
    setTimeEntries([]);
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      amount: 0,
      method: 'CREDIT_CARD',
      reference: '',
      notes: '',
    });
  };

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      const response = await api.post(`/billing/invoices/${invoiceId}/send`);
      toast.success(response.data.message);
      fetchInvoices();
      fetchSummary();
    } catch (error) {
      toast.error('Failed to send invoice');
    }
  };

  const handleBulkDraftInvoices = async () => {
    try {
      const response = await api.post('/billing/bulk-draft-invoices', {
        period: 'monthly',
      });
      
      toast.success(`Created ${response.data.created} draft invoices`);
      fetchInvoices();
      fetchSummary();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create draft invoices');
    }
  };

  const handleViewInvoice = async (invoiceId: string) => {
    try {
      const response = await api.get(`/billing/invoices/${invoiceId}`);
      setInvoiceDetails(response.data);
      setOpenViewInvoice(true);
    } catch (error) {
      toast.error('Failed to load invoice details');
    }
  };

  const handleCaseChange = (caseId: string) => {
    setInvoiceForm({ ...invoiceForm, caseId });
    if (caseId) {
      fetchTimeEntries(caseId);
    } else {
      setTimeEntries([]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'success';
      case 'PARTIALLY_PAID': return 'warning';
      case 'OVERDUE': return 'error';
      default: return 'default';
    }
  };

  return (
    <RoleGuard allowedRoles={['CLIENT', 'PARTNER']}>
      <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Billing & Invoices</Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Total Invoiced</Typography>
              <Typography variant="h4" color="primary">
                ${summary.totalInvoiced.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Total Paid</Typography>
              <Typography variant="h4" color="success.main">
                ${summary.totalPaid.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Outstanding</Typography>
              <Typography variant="h4" color="warning.main">
                ${summary.outstanding.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">
          {userRole === 'CLIENT' ? 'My Invoices' : 'Invoices'}
        </Typography>
        {userRole === 'PARTNER' && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<AutoAwesome />}
              onClick={handleBulkDraftInvoices}
            >
              Generate Draft Invoices
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenInvoiceDialog(true)}
            >
              Create Invoice
            </Button>
          </Box>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice #</TableCell>
              <TableCell>Case</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>{invoice.invoiceNumber}</TableCell>
                <TableCell>{invoice.case.caseName}</TableCell>
                <TableCell>{invoice.client.name}</TableCell>
                <TableCell>${invoice.total.toLocaleString()}</TableCell>
                <TableCell>
                  <Chip
                    label={invoice.status}
                    color={getStatusColor(invoice.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(invoice.dueDate).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleViewInvoice(invoice.id)}
                    title="View Invoice"
                  >
                    <Visibility />
                  </IconButton>
                  {userRole === 'PARTNER' && (
                    <>
                      <IconButton
                        onClick={() => handleSendInvoice(invoice.id)}
                        title="Send Invoice"
                      >
                        <Email />
                      </IconButton>
                      <IconButton
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setPaymentForm({ ...paymentForm, amount: invoice.total });
                          setOpenPaymentDialog(true);
                        }}
                        title="Record Payment"
                      >
                        <Payment />
                      </IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Invoice Dialog */}
      <Dialog open={openInvoiceDialog} onClose={() => setOpenInvoiceDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Invoice</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Case"
              value={invoiceForm.caseId}
              onChange={(e) => handleCaseChange(e.target.value)}
              fullWidth
              required
            >
              {cases.map((case_) => (
                <MenuItem key={case_.id} value={case_.id}>
                  {case_.caseName} - {case_.client.name}
                </MenuItem>
              ))}
            </TextField>
            
            <TextField
              label="Due Date"
              type="date"
              value={invoiceForm.dueDate}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />

            {timeEntries.length > 0 && (
              <TextField
                select
                label="Time Entries"
                value={invoiceForm.timeEntryIds}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, timeEntryIds: e.target.value as string[] })}
                fullWidth
                SelectProps={{ multiple: true }}
              >
                {timeEntries.map((entry) => (
                  <MenuItem key={entry.id} value={entry.id}>
                    {entry.description} - {(entry.duration / 60).toFixed(1)}h @ ${entry.rate}/hr
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              label="Tax Amount"
              type="number"
              value={invoiceForm.tax}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, tax: Number(e.target.value) })}
              fullWidth
            />

            <TextField
              label="Notes"
              value={invoiceForm.notes}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInvoiceDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateInvoice} variant="contained">
            Create Invoice
          </Button>
        </DialogActions>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={openPaymentDialog} onClose={() => setOpenPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Amount"
              type="number"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
              fullWidth
              required
            />
            
            <TextField
              select
              label="Payment Method"
              value={paymentForm.method}
              onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
              fullWidth
            >
              <MenuItem value="CREDIT_CARD">Credit Card</MenuItem>
              <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
              <MenuItem value="CHECK">Check</MenuItem>
              <MenuItem value="CASH">Cash</MenuItem>
            </TextField>

            <TextField
              label="Reference"
              value={paymentForm.reference}
              onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
              fullWidth
            />

            <TextField
              label="Notes"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPaymentDialog(false)}>Cancel</Button>
          <Button onClick={handleCreatePayment} variant="contained">
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invoice View Modal */}
      <Dialog open={openViewInvoice} onClose={() => setOpenViewInvoice(false)} maxWidth="md" fullWidth>
        <DialogContent sx={{ p: 0 }}>
          {invoiceDetails && (
            <Box sx={{ p: 4, bgcolor: 'white', color: 'black', minHeight: '600px' }}>
              {/* Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, borderBottom: '2px solid #333', pb: 2 }}>
                <Box>
                  <img 
                    src="/logo.png" 
                    alt="Company Logo" 
                    style={{ height: '60px', marginBottom: '8px' }}
                  />
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>
                    Your Law Firm Name
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    123 Legal Street<br />
                    City, State 12345<br />
                    Phone: (555) 123-4567
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#ccc', letterSpacing: 2 }}>
                    INVOICE
                  </Typography>
                </Box>
              </Box>

              {/* Client & Invoice Info */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Bill To:
                  </Typography>
                  <Typography variant="body1">
                    {invoiceDetails.client?.name}<br />
                    {invoiceDetails.client?.email}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <table style={{ borderCollapse: 'collapse', border: '1px solid #333' }}>
                    <tbody>
                      <tr>
                        <td style={{ border: '1px solid #333', padding: '8px', backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>Invoice Date</td>
                        <td style={{ border: '1px solid #333', padding: '8px' }}>{new Date(invoiceDetails.issueDate).toLocaleDateString()}</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #333', padding: '8px', backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>Invoice Number</td>
                        <td style={{ border: '1px solid #333', padding: '8px' }}>{invoiceDetails.invoiceNumber}</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #333', padding: '8px', backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>Terms</td>
                        <td style={{ border: '1px solid #333', padding: '8px' }}>Net 30</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #333', padding: '8px', backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>Due Date</td>
                        <td style={{ border: '1px solid #333', padding: '8px' }}>{new Date(invoiceDetails.dueDate).toLocaleDateString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </Box>
              </Box>

              {/* Case Reference */}
              <Typography variant="body1" sx={{ mb: 3, fontWeight: 'bold' }}>
                In Reference To: {invoiceDetails.case?.caseName}
              </Typography>

              {/* Time Entries Table */}
              {invoiceDetails.timeEntries?.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #333', marginBottom: '20px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f5f5f5' }}>
                        <th style={{ border: '1px solid #333', padding: '8px', textAlign: 'left' }}>Date</th>
                        <th style={{ border: '1px solid #333', padding: '8px', textAlign: 'left' }}>By</th>
                        <th style={{ border: '1px solid #333', padding: '8px', textAlign: 'left' }}>Services</th>
                        <th style={{ border: '1px solid #333', padding: '8px', textAlign: 'right' }}>Hours</th>
                        <th style={{ border: '1px solid #333', padding: '8px', textAlign: 'right' }}>Rate</th>
                        <th style={{ border: '1px solid #333', padding: '8px', textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceDetails.timeEntries.map((entry: any) => (
                        <tr key={entry.id}>
                          <td style={{ border: '1px solid #333', padding: '8px' }}>
                            {new Date(entry.startTime).toLocaleDateString()}
                          </td>
                          <td style={{ border: '1px solid #333', padding: '8px' }}>
                            {entry.user?.name?.split(' ').map((n: string) => n[0]).join('') || 'N/A'}
                          </td>
                          <td style={{ border: '1px solid #333', padding: '8px' }}>
                            <strong>{entry.type ? entry.type.replace('_', ' ') : 'Service'}:</strong> {entry.description}
                          </td>
                          <td style={{ border: '1px solid #333', padding: '8px', textAlign: 'right' }}>
                            {entry.duration ? (entry.duration / 60).toFixed(2) : '0.00'}
                          </td>
                          <td style={{ border: '1px solid #333', padding: '8px', textAlign: 'right' }}>
                            ${entry.rate?.toFixed(2) || '0.00'}/hr
                          </td>
                          <td style={{ border: '1px solid #333', padding: '8px', textAlign: 'right' }}>
                            ${entry.billableAmount?.toFixed(2) || '0.00'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              )}

              {/* Expenses Table */}
              {invoiceDetails.expenses?.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body1" sx={{ mb: 1, fontWeight: 'bold' }}>
                    In Reference To: {invoiceDetails.case?.caseName} (Expenses)
                  </Typography>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #333', marginBottom: '20px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f5f5f5' }}>
                        <th style={{ border: '1px solid #333', padding: '8px', textAlign: 'left' }}>Date</th>
                        <th style={{ border: '1px solid #333', padding: '8px', textAlign: 'left' }}>By</th>
                        <th style={{ border: '1px solid #333', padding: '8px', textAlign: 'left' }}>Expenses</th>
                        <th style={{ border: '1px solid #333', padding: '8px', textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceDetails.expenses.map((expense: any) => (
                        <tr key={expense.id}>
                          <td style={{ border: '1px solid #333', padding: '8px' }}>
                            {new Date(expense.date).toLocaleDateString()}
                          </td>
                          <td style={{ border: '1px solid #333', padding: '8px' }}>
                            {expense.user?.name?.split(' ').map((n: string) => n[0]).join('') || 'N/A'}
                          </td>
                          <td style={{ border: '1px solid #333', padding: '8px' }}>
                            <strong>{expense.type ? expense.type.replace('_', ' ') : 'Expense'}:</strong> {expense.description}
                          </td>
                          <td style={{ border: '1px solid #333', padding: '8px', textAlign: 'right' }}>
                            ${expense.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              )}

              {/* Totals */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <table style={{ borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px 12px', textAlign: 'right', fontWeight: 'bold' }}>Total Hours</td>
                      <td style={{ padding: '4px 12px', textAlign: 'right', borderBottom: '1px solid #333' }}>
                        {invoiceDetails.timeEntries?.reduce((sum: number, entry: any) => sum + (entry.duration || 0), 0) / 60 || 0} hrs
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 12px', textAlign: 'right', fontWeight: 'bold' }}>Total Professional Services</td>
                      <td style={{ padding: '4px 12px', textAlign: 'right', borderBottom: '1px solid #333' }}>
                        ${invoiceDetails.subtotal?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                    {invoiceDetails.expenses?.length > 0 && (
                      <tr>
                        <td style={{ padding: '4px 12px', textAlign: 'right', fontWeight: 'bold' }}>Total Expenses</td>
                        <td style={{ padding: '4px 12px', textAlign: 'right', borderBottom: '1px solid #333' }}>
                          ${invoiceDetails.expenses.reduce((sum: number, exp: any) => sum + exp.amount, 0).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ padding: '4px 12px', textAlign: 'right', fontWeight: 'bold' }}>Total Invoice Amount</td>
                      <td style={{ padding: '4px 12px', textAlign: 'right', borderBottom: '3px double #333', fontWeight: 'bold' }}>
                        ${invoiceDetails.total?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 12px', textAlign: 'right', fontWeight: 'bold' }}>Previous Balance</td>
                      <td style={{ padding: '4px 12px', textAlign: 'right', borderBottom: '1px solid #333' }}>$0.00</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 12px', textAlign: 'right', fontWeight: 'bold', fontSize: '18px' }}>Balance (Amount Due)</td>
                      <td style={{ padding: '4px 12px', textAlign: 'right', borderBottom: '3px double #333', fontWeight: 'bold', fontSize: '18px' }}>
                        ${invoiceDetails.total?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewInvoice(false)}>Close</Button>
          <Button variant="contained" onClick={() => window.print()}>Print</Button>
        </DialogActions>
      </Dialog>
      </Box>
    </RoleGuard>
  );
}