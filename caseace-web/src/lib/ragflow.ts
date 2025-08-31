const RAGFLOW_API_URL = process.env.NEXT_PUBLIC_RAGFLOW_API_URL || 'http://localhost:9380';
const RAGFLOW_API_KEY = process.env.NEXT_PUBLIC_RAGFLOW_API_KEY || '';

export class RAGFlowService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || RAGFLOW_API_KEY;
    this.baseUrl = baseUrl || RAGFLOW_API_URL;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`RAGFlow API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Dataset Management
  async createDataset(name: string, chunkMethod: string = 'naive') {
    return this.request('/api/v1/datasets', {
      method: 'POST',
      body: JSON.stringify({ name, chunk_method: chunkMethod }),
    });
  }

  async listDatasets() {
    return this.request('/api/v1/datasets');
  }

  async deleteDataset(datasetId: string) {
    return this.request(`/api/v1/datasets/${datasetId}`, {
      method: 'DELETE',
    });
  }

  // Document Management
  async uploadDocument(datasetId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return fetch(`${this.baseUrl}/api/v1/datasets/${datasetId}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    }).then(res => res.json());
  }

  async listDocuments(datasetId: string) {
    return this.request(`/api/v1/datasets/${datasetId}/documents?page=1&page_size=30`);
  }

  async parseDocuments(datasetId: string, documentIds: string[]) {
    return this.request(`/api/v1/datasets/${datasetId}/documents/parse`, {
      method: 'POST',
      body: JSON.stringify({ document_ids: documentIds }),
    });
  }

  // Chat Assistant Management
  async createChatAssistant(name: string, datasetIds: string[]) {
    return this.request('/api/v1/chats', {
      method: 'POST',
      body: JSON.stringify({
        name,
        dataset_ids: datasetIds,
        llm: {
          model_name: 'gpt-4',
          temperature: 0.1,
        },
      }),
    });
  }

  async listChatAssistants() {
    return this.request('/api/v1/chats');
  }

  // Retrieval
  async searchDocuments(question: string, datasetIds: string[], documentIds?: string[]) {
    return this.request('/api/v1/retrieval', {
      method: 'POST',
      body: JSON.stringify({
        question,
        dataset_ids: datasetIds,
        document_ids: documentIds,
        page: 1,
        page_size: 10,
      }),
    });
  }

  // Chat Session Management
  async createSession(chatId: string) {
    return this.request(`/api/v1/chats/${chatId}/sessions`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // Chat Completion - using correct RAGFlow endpoint
  async chatCompletion(messages: any[], chatId: string, sessionId: string) {
    const lastMessage = messages[messages.length - 1];
    return this.request(`/api/v1/chats/${chatId}/completions`, {
      method: 'POST',
      body: JSON.stringify({
        question: lastMessage.content,
        stream: false,
        session_id: sessionId,
      }),
    });
  }

  // Agent Management
  async listAgents() {
    return this.request('/api/v1/agents');
  }

  async createAgentSession(agentId: string, userId?: string) {
    const params = userId ? `?user_id=${userId}` : '';
    return this.request(`/api/v1/agents/${agentId}/sessions${params}`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async converseWithAgent(agentId: string, question: string, sessionId?: string, inputs?: any) {
    return this.request(`/api/v1/agents/${agentId}/completions`, {
      method: 'POST',
      body: JSON.stringify({
        question,
        stream: false,
        session_id: sessionId,
        inputs,
      }),
    });
  }

  async listAgentSessions(agentId: string, page = 1, pageSize = 30) {
    return this.request(`/api/v1/agents/${agentId}/sessions?page=${page}&page_size=${pageSize}`);
  }

  async deleteAgentSessions(agentId: string, sessionIds?: string[]) {
    return this.request(`/api/v1/agents/${agentId}/sessions`, {
      method: 'DELETE',
      body: JSON.stringify({ ids: sessionIds }),
    });
  }

  // Complete workflow
  async uploadAndParseDocument(datasetId: string, file: File) {
    const uploadResult = await this.uploadDocument(datasetId, file);
    const documentId = uploadResult.data?.id;
    
    if (!documentId) throw new Error('Upload failed');
    
    await this.parseDocuments(datasetId, [documentId]);
    return { documentId, status: 'parsing' };
  }
}

export const ragflowService = new RAGFlowService();