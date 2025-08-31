'use client';

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Button, TextField,
  List, ListItem, ListItemText, Card, CardContent,
  Select, MenuItem, FormControl, InputLabel, Chip,
  Alert, CircularProgress, Grid
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import SearchIcon from '@mui/icons-material/Search';
import ChatIcon from '@mui/icons-material/Chat';
import StorageIcon from '@mui/icons-material/Storage';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import DeleteIcon from '@mui/icons-material/Delete';
import { ragflowService } from '@/lib/ragflow';
import RAGFlowQuotation from '@/components/RAGFlowQuotation';
import CitationBubble from '@/components/CitationBubble';

interface Dataset {
  id: string;
  name: string;
  created_at: string;
}

interface Document {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

interface ChatAssistant {
  id: string;
  name: string;
  dataset_ids: string[];
}

interface Agent {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface AgentSession {
  id: string;
  agent_id: string;
  user_id?: string;
  created_at: string;
  message: any[];
}

export default function LegalAssistantPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [chatAssistants, setChatAssistants] = useState<ChatAssistant[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedChatAssistant, setSelectedChatAssistant] = useState<string>('');
  const [chatSession, setChatSession] = useState<string>('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [agentSessions, setAgentSessions] = useState<AgentSession[]>([]);
  const [agentChatMessages, setAgentChatMessages] = useState<any[]>([]);
  const [agentCurrentMessage, setAgentCurrentMessage] = useState('');
  const [selectedAgentSession, setSelectedAgentSession] = useState<string>('');

  useEffect(() => {
    // RAGFlow API calls are working - re-enable full functionality
    if (process.env.NEXT_PUBLIC_RAGFLOW_API_KEY) {
      loadDatasets();
      loadChatAssistants();
      loadAgents();
    }
  }, []);

  const loadDatasets = async () => {
    try {
      const response = await ragflowService.listDatasets();
      const datasetList = response.data || [];
      setDatasets(datasetList);
      
      // Auto-select first dataset if none selected
      if (datasetList.length > 0 && !selectedDataset) {
        const firstDataset = datasetList[0].id;
        setSelectedDataset(firstDataset);
        await loadDocuments(firstDataset);
      }
    } catch (err) {
      console.warn('RAGFlow not available:', err);
      setError('RAGFlow service unavailable. Please check configuration.');
    }
  };

  const loadChatAssistants = async () => {
    try {
      const response = await ragflowService.listChatAssistants();
      setChatAssistants(response.data || []);
    } catch (err) {
      console.warn('RAGFlow chat assistants not available:', err);
    }
  };

  const loadAgents = async () => {
    try {
      const response = await ragflowService.listAgents();
      console.log('Agents response:', response);
      const agentsList = response.data || response || [];
      console.log('Setting agents:', agentsList);
      setAgents(Array.isArray(agentsList) ? agentsList : []);
    } catch (err) {
      console.error('RAGFlow agents error:', err);
      setError(`Failed to load agents: ${err.message}`);
    }
  };

  const loadAgentSessions = async (agentId: string) => {
    if (!agentId) return;
    try {
      const response = await ragflowService.listAgentSessions(agentId);
      setAgentSessions(response.data || []);
    } catch (err) {
      console.error('Failed to load agent sessions:', err);
      setError('Failed to load agent sessions');
    }
  };

  const createAgentSession = async (agentId: string) => {
    try {
      const response = await ragflowService.createAgentSession(agentId);
      const sessionId = response.data?.id;
      if (sessionId) {
        setSelectedAgentSession(sessionId);
        await loadAgentSessions(agentId);
      }
      return sessionId;
    } catch (err) {
      console.error('Failed to create agent session:', err);
      setError('Failed to create agent session');
      return null;
    }
  };

  const handleAgentMessage = async () => {
    if (!agentCurrentMessage || !selectedAgent) return;

    const userMessage = { role: 'user', content: agentCurrentMessage };
    setAgentChatMessages(prev => [...prev, userMessage]);
    setAgentCurrentMessage('');
    setLoading(true);

    try {
      let sessionId = selectedAgentSession;
      if (!sessionId) {
        sessionId = await createAgentSession(selectedAgent);
        if (!sessionId) return;
      }

      const response = await ragflowService.converseWithAgent(
        selectedAgent,
        agentCurrentMessage,
        sessionId
      );

      let content = 'No response received';
      if (response.code === 0 && response.data) {
        content = response.data.data?.outputs?.content || response.data.message?.[0]?.content || content;
      }

      const assistantMessage = {
        role: 'assistant',
        content: content
      };

      setAgentChatMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Agent chat error:', err);
      setError(`Agent chat error: ${err.message}`);
      setAgentChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const deleteAgentSession = async (agentId: string, sessionId: string) => {
    try {
      await ragflowService.deleteAgentSessions(agentId, [sessionId]);
      await loadAgentSessions(agentId);
      if (selectedAgentSession === sessionId) {
        setSelectedAgentSession('');
        setAgentChatMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      setError('Failed to delete session');
    }
  };

  const loadDocuments = async (datasetId: string) => {
    if (!datasetId) return;
    setLoading(true);
    try {
      console.log('Loading documents for dataset:', datasetId);
      const response = await ragflowService.listDocuments(datasetId);
      console.log('Full documents response:', JSON.stringify(response, null, 2));
      console.log('Response data field:', response.data);
      console.log('Response data type:', typeof response.data);
      console.log('Response data array check:', Array.isArray(response.data));
      
      const docs = response.data?.docs || [];
      console.log('Setting documents:', docs);
      setDocuments(docs);
      setError('');
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError(`Failed to load documents: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedDataset) return;

    setLoading(true);
    try {
      await ragflowService.uploadAndParseDocument(selectedDataset, file);
      await loadDocuments(selectedDataset);
      setError('');
    } catch (err) {
      setError('Failed to upload and parse document');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery || !selectedDataset) return;

    setLoading(true);
    try {
      const response = await ragflowService.searchDocuments(searchQuery, [selectedDataset]);
      setSearchResults(response.data?.chunks || []);
    } catch (err) {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const createCaseDataset = async () => {
    const caseName = prompt('Enter case name:');
    if (!caseName) return;

    setLoading(true);
    try {
      await ragflowService.createDataset(`Case_${caseName}`);
      await loadDatasets();
    } catch (err) {
      setError('Failed to create dataset');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage || !selectedChatAssistant) return;

    const userMessage = { role: 'user', content: currentMessage };
    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setLoading(true);

    try {
      // Create session if not exists
      let sessionId = chatSession;
      if (!sessionId) {
        console.log('Creating new session for assistant:', selectedChatAssistant);
        const sessionResponse = await ragflowService.createSession(selectedChatAssistant);
        sessionId = sessionResponse.data?.id || '';
        setChatSession(sessionId);
        console.log('Created session:', sessionId);
      }

      // Send message to RAGFlow
      console.log('Sending message to RAGFlow:', { messages: [...chatMessages, userMessage], chatId: selectedChatAssistant, sessionId });
      const response = await ragflowService.chatCompletion(
        [...chatMessages, userMessage],
        selectedChatAssistant,
        sessionId
      );
      
      console.log('RAGFlow response:', response);
      
      // Handle RAGFlow response format: {"code": 0, "data": {...}}
      let content = 'No response received';
      let references = [];
      
      if (response.code === 0 && response.data) {
        const data = response.data;
        content = data.answer || content;
        references = data.reference?.chunks || [];
      } else if (response.message && response.code) {
        content = `Error: ${response.message}`;
      }
      
      const assistantMessage = {
        role: 'assistant',
        content: content,
        references: references
      };
      
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error details:', err);
      setError(`Chat error: ${err.message}`);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${err.message}. Please check console for details.` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 100px)' }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Legal Assistant
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab icon={<ChatIcon />} label="Chat Assistant" />
        <Tab icon={<UploadIcon />} label="Document Management" />
        <Tab icon={<SearchIcon />} label="Legal Research" />
        <Tab icon={<StorageIcon />} label="Knowledge Bases" />
        <Tab icon={<SmartToyIcon />} label="Agents" />
      </Tabs>

      {activeTab === 0 && (
        <Paper sx={{ height: 'calc(100% - 120px)', display: 'flex', flexDirection: 'column' }}>
          {/* Chat Assistant Selection */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Select Chat Assistant</InputLabel>
              <Select
                value={selectedChatAssistant}
                onChange={(e) => setSelectedChatAssistant(e.target.value)}
                size="small"
              >
                {chatAssistants.map((assistant) => (
                  <MenuItem key={assistant.id} value={assistant.id}>
                    {assistant.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          {/* Chat Messages */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {chatMessages.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                Start a conversation with your legal assistant
              </Typography>
            ) : (
              chatMessages.map((msg, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color={msg.role === 'user' ? 'primary' : 'secondary'}>
                    {msg.role === 'user' ? 'You' : 'Assistant'}
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: msg.role === 'user' ? 'primary.light' : 'grey.100' }}>
                    <Typography>
                      {msg.role === 'assistant' && msg.references && msg.references.length > 0 ? (
                        // Parse citation markers ##0$$ and replace with [ID:1]
                        <span>
                          {msg.content.split(/(##\d+\$\$)/g).map((part, partIndex) => {
                            const match = part.match(/##(\d+)\$\$/);
                            if (match) {
                              const citationIndex = parseInt(match[1]);
                              return (
                                <span 
                                  key={partIndex}
                                  style={{ 
                                    color: '#1976d2', 
                                    cursor: 'pointer', 
                                    textDecoration: 'underline' 
                                  }}
                                  onClick={() => {
                                    const refElement = document.getElementById(`ref-${index}-${citationIndex}`);
                                    refElement?.scrollIntoView({ behavior: 'smooth' });
                                  }}
                                >
                                  [ID:{citationIndex + 1}]
                                </span>
                              );
                            }
                            return part;
                          })}
                        </span>
                      ) : (
                        msg.content
                      )}
                    </Typography>
                  </Paper>
                  
                  {/* Show citations for assistant messages */}
                  {msg.role === 'assistant' && msg.references && msg.references.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Sources:</Typography>
                      {msg.references.map((ref, refIndex) => (
                        <div key={refIndex} id={`ref-${index}-${refIndex}`}>
                          <RAGFlowQuotation
                            content={ref.content || ref.text || 'Reference content'}
                            score={ref.similarity || ref.score || 0.8}
                            documentName={ref.document_name || ref.doc_name || ref.filename || 'Document'}
                            metadata={{
                              created_at: ref.created_at,
                              chunk_index: ref.chunk_index,
                              page: ref.page
                            }}
                            maxLength={150}
                          />
                        </div>
                      ))}
                    </Box>
                  )}
                </Box>
              ))
            )}
          </Box>
          
          {/* Chat Input */}
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              placeholder="Ask your legal assistant..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={!selectedChatAssistant || loading}
            />
            <Button
              variant="contained"
              onClick={handleSendMessage}
              disabled={!currentMessage || !selectedChatAssistant || loading}
              startIcon={loading ? <CircularProgress size={20} /> : <ChatIcon />}
            >
              Send
            </Button>
          </Box>
        </Paper>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3} sx={{ height: 'calc(100% - 120px)' }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Upload Documents</Typography>
                {datasets.length === 0 ? (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    No datasets available. Create a case dataset first in the Knowledge Bases tab.
                  </Alert>
                ) : (
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Select Case Dataset</InputLabel>
                    <Select
                      value={selectedDataset}
                      onChange={(e) => {
                        setSelectedDataset(e.target.value);
                        loadDocuments(e.target.value);
                      }}
                    >
                      {datasets.map((dataset) => (
                        <MenuItem key={dataset.id} value={dataset.id}>
                          {dataset.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                <Button
                  variant="contained"
                  component="label"
                  fullWidth
                  disabled={!selectedDataset || loading || datasets.length === 0}
                  startIcon={loading ? <CircularProgress size={20} /> : <UploadIcon />}
                >
                  Upload Legal Document
                  <input type="file" hidden accept=".pdf,.doc,.docx,.txt" onChange={handleFileUpload} />
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={8}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Case Documents</Typography>
                <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {Array.isArray(documents) && documents.length > 0 ? (
                    documents.map((doc) => (
                      <ListItem key={doc.id}>
                        <ListItemText
                          primary={doc.name}
                          secondary={
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Chip
                                label={doc.status}
                                size="small"
                                color={doc.status === 'parsed' ? 'success' : 'warning'}
                              />
                              <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>{doc.created_at}</span>
                            </span>
                          }
                        />
                      </ListItem>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText primary="No documents found" secondary="Upload documents to see them here" />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Paper sx={{ p: 3, height: 'calc(100% - 120px)', overflow: 'auto' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Legal Research</Typography>
          
          {/* Dataset Selection */}
          {datasets.length > 0 && (
            <FormControl sx={{ mb: 2, minWidth: 200 }}>
              <InputLabel>Select Dataset</InputLabel>
              <Select
                value={selectedDataset}
                onChange={(e) => setSelectedDataset(e.target.value)}
                size="small"
              >
                {datasets.map((dataset) => (
                  <MenuItem key={dataset.id} value={dataset.id}>
                    {dataset.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          
          {/* Search Input */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Enter your legal research query..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              variant="outlined"
            />
            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={!searchQuery || !selectedDataset || loading || datasets.length === 0}
              startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
              sx={{ minWidth: 120 }}
            >
              Research
            </Button>
          </Box>
          
          {/* Results Count */}
          {searchResults.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Found {searchResults.length} relevant passages
            </Typography>
          )}
          <Box>
            {Array.isArray(searchResults) && searchResults.length > 0 ? (
              searchResults.map((result, index) => (
                <RAGFlowQuotation
                  key={index}
                  content={result.content}
                  score={result.score || 0}
                  documentName={result.document_name || result.doc_name || result.filename || 'Document'}
                  metadata={{
                    created_at: result.created_at,
                    chunk_index: result.chunk_index,
                    page: result.page
                  }}
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No search results found. Try a different query or ensure you have documents in your selected dataset.
              </Typography>
            )}
          </Box>
        </Paper>
      )}

      {activeTab === 3 && (
        <Paper sx={{ p: 3, height: 'calc(100% - 120px)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Case Knowledge Bases</Typography>
            <Button 
              variant="contained" 
              onClick={createCaseDataset}
              disabled={!process.env.NEXT_PUBLIC_RAGFLOW_API_KEY}
            >
              Create New Case Dataset
            </Button>
          </Box>
          {!process.env.NEXT_PUBLIC_RAGFLOW_API_KEY && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              RAGFlow API key not configured. Please add NEXT_PUBLIC_RAGFLOW_API_KEY to your environment variables.
            </Alert>
          )}
          <Grid container spacing={2}>
            {(!Array.isArray(datasets) || datasets.length === 0) && process.env.NEXT_PUBLIC_RAGFLOW_API_KEY && (
              <Grid item xs={12}>
                <Alert severity="info">
                  No case datasets found. Create your first case dataset to get started.
                </Alert>
              </Grid>
            )}
            {Array.isArray(datasets) && datasets.map((dataset) => (
              <Grid item xs={12} md={6} lg={4} key={dataset.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {dataset.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Created: {new Date(dataset.created_at).toLocaleDateString()}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Button
                        size="small"
                        onClick={() => {
                          setSelectedDataset(dataset.id);
                          loadDocuments(dataset.id);
                          setActiveTab(1);
                        }}
                      >
                        Manage Documents
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {activeTab === 4 && (
        <Grid container spacing={3} sx={{ height: 'calc(100% - 120px)' }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Available Agents</Typography>
                {agents.length === 0 ? (
                  <Alert severity="info">
                    No agents available. Please check your RAGFlow configuration.
                  </Alert>
                ) : (
                  <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {agents.map((agent) => (
                      <ListItem 
                        key={agent.id}
                        button
                        selected={selectedAgent === agent.id}
                        onClick={() => {
                          setSelectedAgent(agent.id);
                          loadAgentSessions(agent.id);
                          setAgentChatMessages([]);
                          setSelectedAgentSession('');
                        }}
                      >
                        <ListItemText
                          primary={agent.name || agent.title || agent.id}
                          secondary={agent.description || agent.desc || 'No description'}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Sessions</Typography>
                  {selectedAgent && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => createAgentSession(selectedAgent)}
                      disabled={loading}
                    >
                      New Session
                    </Button>
                  )}
                </Box>
                {!selectedAgent ? (
                  <Typography variant="body2" color="text.secondary">
                    Select an agent to view sessions
                  </Typography>
                ) : agentSessions.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No sessions found. Create a new session to start.
                  </Typography>
                ) : (
                  <List sx={{ maxHeight: 250, overflow: 'auto' }}>
                    {agentSessions.map((session) => (
                      <ListItem key={session.id}>
                        <ListItemText
                          primary={`Session ${session.id.slice(-8)}`}
                          secondary={new Date(session.created_at).toLocaleString()}
                        />
                        <Button
                          size="small"
                          onClick={() => {
                            setSelectedAgentSession(session.id);
                            setAgentChatMessages([]);
                          }}
                          disabled={selectedAgentSession === session.id}
                        >
                          {selectedAgentSession === session.id ? 'Active' : 'Select'}
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => deleteAgentSession(selectedAgent, session.id)}
                          sx={{ ml: 1 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </Button>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">
                  Agent Chat {selectedAgent && selectedAgentSession && `(${selectedAgent.slice(-8)})`}
                </Typography>
              </Box>
              
              <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                {!selectedAgent || !selectedAgentSession ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                    Select an agent and session to start chatting
                  </Typography>
                ) : agentChatMessages.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                    Start a conversation with the agent
                  </Typography>
                ) : (
                  agentChatMessages.map((msg, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color={msg.role === 'user' ? 'primary' : 'secondary'}>
                        {msg.role === 'user' ? 'You' : 'Agent'}
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: msg.role === 'user' ? 'primary.light' : 'grey.100' }}>
                        <Typography>{msg.content}</Typography>
                      </Paper>
                    </Box>
                  ))
                )}
              </Box>
              
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  placeholder="Message the agent..."
                  value={agentCurrentMessage}
                  onChange={(e) => setAgentCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAgentMessage()}
                  disabled={!selectedAgent || !selectedAgentSession || loading}
                />
                <Button
                  variant="contained"
                  onClick={handleAgentMessage}
                  disabled={!agentCurrentMessage || !selectedAgent || !selectedAgentSession || loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <SmartToyIcon />}
                >
                  Send
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}