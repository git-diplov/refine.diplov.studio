import React, { useState, useEffect, useMemo } from 'react';
import { FileInput, Library, Settings, Copy, Check, Trash2, Download, ChevronDown, Cpu, Brain, Zap, X, Search, FileText, Clock, Moon, Sun, Layers, Server, Plus, Star, Eye, EyeOff, Key, PenLine, RefreshCw, ArrowRight, Edit2, Globe, AlertCircle, Loader2, GitBranch, GitCompare, RotateCcw, CopyPlus, Hash, Save, Undo2, Shield, FolderOpen, FolderPlus, Folder, ChevronRight, Tag as TagIcon, Palette, PanelLeftClose, PanelLeft, Filter, ArrowUpDown, SlidersHorizontal, Calendar, Upload, Lock, Package, FileDown, FileUp } from 'lucide-react';
import { getNextVersionNumber, getVersionChain, computeLineDiff, repairChainAfterDeletion, computeSHA256 } from './lib/version-utils';
import type { LibraryItem, DiffSegment, ChronicleEntry, ChronicleSnapshot, Collection, Tag as TagType, PRBBundle } from './lib/types';
import { createBundle, parseBundle, downloadBundle, readFileAsText } from './lib/bundle';
import type { BundlePayload } from './lib/bundle';

// Polyfill for window.storage if not available (for standard browser testing)
if (typeof window !== 'undefined' && !(window as any).storage) {
  (window as any).storage = {
    get: async (key: string) => {
      const val = localStorage.getItem(key);
      return val ? { value: val } : null;
    },
    set: async (key: string, value: string) => {
      localStorage.setItem(key, value);
    },
    delete: async (key: string) => {
      localStorage.removeItem(key);
    }
  };
}

const DEFAULT_PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    icon: 'Brain',
    models: [
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', description: 'Balance of intelligence, speed, and cost' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', description: 'Fastest, near-frontier intelligence' },
      { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', description: 'Maximum intelligence' },
    ],
    modes: [
      { id: 'standard', name: 'Standard', description: 'Direct response', config: {} },
      { id: 'thinking', name: 'Extended Thinking', description: '8K thinking budget', config: { thinking: { type: 'enabled', budget_tokens: 8000 } } },
      { id: 'extended', name: 'Deep Thinking', description: '16K thinking budget', config: { thinking: { type: 'enabled', budget_tokens: 16000 } } },
    ],
    docsUrl: 'https://docs.anthropic.com/en/docs/about-claude/models'
  },
  google: {
    name: 'Google',
    icon: 'Zap',
    models: [
      { id: 'gemini-2.5-pro-preview-06-05', name: 'Gemini 2.5 Pro', description: 'Complex reasoning (code, math, STEM)' },
      { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash', description: 'Fast, efficient processing' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Low-latency, high volume' },
    ],
    modes: [
      { id: 'standard', name: 'Standard', description: 'Direct response', config: {} },
      { id: 'thinking', name: 'Thinking', description: 'With reasoning', config: { thinkingConfig: { thinkingBudget: 8192 } } },
    ],
    docsUrl: 'https://ai.google.dev/gemini-api/docs/models'
  },
  openai: {
    name: 'OpenAI',
    icon: 'Cpu',
    models: [
      { id: 'gpt-4.1-2025-04-14', name: 'GPT-4.1', description: 'Low latency, no reasoning step' },
      { id: 'o3-mini-2025-01-31', name: 'o3-mini', description: 'Fast reasoning model' },
      { id: 'o1-2024-12-17', name: 'o1', description: 'Deep reasoning model' },
    ],
    modes: [
      { id: 'none', name: 'None', description: 'No reasoning (default)', config: {} },
      { id: 'low', name: 'Low', description: 'Minimal reasoning', config: { reasoning_effort: 'low' } },
      { id: 'medium', name: 'Medium', description: 'Balanced reasoning', config: { reasoning_effort: 'medium' } },
      { id: 'high', name: 'High', description: 'Deep reasoning', config: { reasoning_effort: 'high' } },
    ],
    docsUrl: 'https://platform.openai.com/docs/models'
  },
  azure: {
    name: 'Azure AI Foundry',
    icon: 'Server',
    models: [],
    modes: [
      { id: 'standard', name: 'Standard', description: 'Direct response', config: {} },
      { id: 'low', name: 'Low', description: 'Minimal reasoning', config: { reasoning_effort: 'low' } },
      { id: 'medium', name: 'Medium', description: 'Balanced reasoning', config: { reasoning_effort: 'medium' } },
      { id: 'high', name: 'High', description: 'Deep reasoning', config: { reasoning_effort: 'high' } },
    ],
    docsUrl: 'https://azure.microsoft.com/en-us/products/ai-foundry/models',
    configurable: true
  }
};

const PROVIDER_ICONS = { Brain, Zap, Cpu, Server };

const DEFAULT_STORAGE_CONFIG = { type: 'browser', bucket: '', endpoint: '', apiKey: '' };
const DEFAULT_PROVIDER_KEYS = {
  anthropic: { apiKey: '' },
  google: { apiKey: '' },
  openai: { apiKey: '', orgId: '' },
  azure: { endpoint: '', apiKey: '', apiVersion: '2024-12-01-preview' }
};

const generateMetadata = (analysis) => ({
  title: analysis.title || '',
  alternativeTitles: analysis.alternativeTitles || [],
  category: analysis.category || 'General',
  complexity: analysis.complexity || 'Moderate',
  targetModel: analysis.targetModel || 'Claude',
  tags: analysis.tags || [],
  tone: analysis.tone || 'Technical',
  tokenEstimate: analysis.tokenEstimate || 0,
  createdAt: new Date().toISOString(),
  version: '1.0'
});

// ============================================================================
// MULTI-PROVIDER API INTEGRATION
// ============================================================================

// Anthropic API call - works natively in Claude.ai artifacts
const callAnthropicAPI = async (systemPrompt, modelId, modeConfig, maxTokens) => {
  const requestBody = {
    model: modelId,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: systemPrompt }],
    ...modeConfig
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message || 'Anthropic API error');
  }

  let text = '';
  if (data.content) {
    for (const block of data.content) {
      if (block.type === 'text') text = block.text;
    }
  }
  
  return text;
};

// Google Gemini API call
const callGoogleAPI = async (systemPrompt, modelId, modeConfig, apiKey) => {
  if (!apiKey) {
    throw new Error('Google API key required. Configure in Settings > API Keys.');
  }

  const requestBody = {
    contents: [{ 
      role: 'user', 
      parts: [{ text: systemPrompt }] 
    }],
    generationConfig: {
      maxOutputTokens: 16384,
      temperature: 0.7,
      ...(modeConfig.thinkingConfig && { thinkingConfig: modeConfig.thinkingConfig })
    }
  };

  const endpoint = modeConfig.thinkingConfig 
    ? `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`
    : `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;

  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Google API error');
  }

  let text = '';
  if (data.candidates?.[0]?.content?.parts) {
    for (const part of data.candidates[0].content.parts) {
      if (part.text) text += part.text;
    }
  }

  if (!text) {
    throw new Error('No content in Google API response');
  }

  return text;
};

// OpenAI API call
const callOpenAIAPI = async (systemPrompt, modelId, modeConfig, apiKey, orgId) => {
  if (!apiKey) {
    throw new Error('OpenAI API key required. Configure in Settings > API Keys.');
  }

  const isReasoningModel = modelId.startsWith('o1') || modelId.startsWith('o3');
  
  const requestBody = {
    model: modelId,
    max_completion_tokens: 16384,
  };

  if (isReasoningModel) {
    requestBody.messages = [
      { role: 'developer', content: 'You are a Prompt Refinery AI. Return only valid JSON.' },
      { role: 'user', content: systemPrompt }
    ];
    if (modeConfig.reasoning_effort) {
      requestBody.reasoning_effort = modeConfig.reasoning_effort;
    }
  } else {
    requestBody.messages = [
      { role: 'system', content: 'You are a Prompt Refinery AI. Return only valid JSON.' },
      { role: 'user', content: systemPrompt }
    ];
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };
  
  if (orgId) {
    headers['OpenAI-Organization'] = orgId;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody)
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'OpenAI API error');
  }

  const text = data.choices?.[0]?.message?.content;
  
  if (!text) {
    throw new Error('No content in OpenAI API response');
  }

  return text;
};

// Azure OpenAI API call
const callAzureAPI = async (systemPrompt, deploymentId, modeConfig, endpoint, apiKey, apiVersion) => {
  if (!endpoint || !apiKey) {
    throw new Error('Azure endpoint and API key required. Configure in Settings > API Keys.');
  }

  const requestBody = {
    messages: [
      { role: 'system', content: 'You are a Prompt Refinery AI. Return only valid JSON.' },
      { role: 'user', content: systemPrompt }
    ],
    max_tokens: 16384,
    temperature: 0.7
  };

  if (modeConfig.reasoning_effort) {
    requestBody.reasoning_effort = modeConfig.reasoning_effort;
  }

  const cleanEndpoint = endpoint.replace(/\/$/, '');
  const url = `${cleanEndpoint}/openai/deployments/${deploymentId}/chat/completions?api-version=${apiVersion}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify(requestBody)
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Azure API error');
  }

  const text = data.choices?.[0]?.message?.content;
  
  if (!text) {
    throw new Error('No content in Azure API response');
  }

  return text;
};

// Unified API dispatcher
const callProviderAPI = async (providerId, systemPrompt, model, modeConfig, providerKeys, maxTokens = 16000) => {
  switch (providerId) {
    case 'anthropic':
      return callAnthropicAPI(systemPrompt, model.id, modeConfig, maxTokens);
    
    case 'google':
      return callGoogleAPI(systemPrompt, model.id, modeConfig, providerKeys.google?.apiKey);
    
    case 'openai':
      return callOpenAIAPI(systemPrompt, model.id, modeConfig, providerKeys.openai?.apiKey, providerKeys.openai?.orgId);
    
    case 'azure':
      return callAzureAPI(
        systemPrompt, 
        model.id, 
        modeConfig, 
        providerKeys.azure?.endpoint,
        providerKeys.azure?.apiKey,
        providerKeys.azure?.apiVersion || '2024-12-01-preview'
      );
    
    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PromptRefinery() {
  const [view, setView] = useState('refine');
  const [mode, setMode] = useState('refine');
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(0);
  const [result, setResult] = useState(null);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [library, setLibrary] = useState([]);
  const [storageConfig, setStorageConfig] = useState(DEFAULT_STORAGE_CONFIG);
  const [providerKeys, setProviderKeys] = useState(DEFAULT_PROVIDER_KEYS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isUltrawide, setIsUltrawide] = useState(false);
  
  const [providers, setProviders] = useState(DEFAULT_PROVIDERS);
  
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [selectedModel, setSelectedModel] = useState(DEFAULT_PROVIDERS.anthropic.models[0]);
  const [selectedMode, setSelectedMode] = useState(DEFAULT_PROVIDERS.anthropic.modes[0]);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  
  const [azureDeployments, setAzureDeployments] = useState([]);
  const [newDeployment, setNewDeployment] = useState({ name: '', id: '' });
  const [favorites, setFavorites] = useState(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState({});
  const [savedTitles, setSavedTitles] = useState(new Set());
  
  const [lastSynced, setLastSynced] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [editingModel, setEditingModel] = useState(null);
  const [newModel, setNewModel] = useState({ id: '', name: '', description: '' });
  const [showModelEditor, setShowModelEditor] = useState(null);

  // -- Version chain state --
  const [reimportSourceId, setReimportSourceId] = useState<string | null>(null);
  const [showDiffView, setShowDiffView] = useState(false);
  const [diffVersions, setDiffVersions] = useState<[any, any] | null>(null);

  // -- Chronicle state --
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [commitNote, setCommitNote] = useState('');
  const [commitTargetId, setCommitTargetId] = useState<string | null>(null);

  // -- Collections & Tags state --
  const [collections, setCollections] = useState<Collection[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [showCollectionSidebar, setShowCollectionSidebar] = useState(true);
  const [showTagManager, setShowTagManager] = useState(false);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());

  // -- Search, Sort & Filter state --
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'complexity'>('date');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterProvider, setFilterProvider] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<string | null>(null);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [filterHasVersions, setFilterHasVersions] = useState(false);
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // -- Export/Import (.prb) state --
  const [exportEncrypt, setExportEncrypt] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [showImportPassword, setShowImportPassword] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);

  const getProviderIcon = (providerId) => {
    const iconName = providers[providerId]?.icon || DEFAULT_PROVIDERS[providerId]?.icon;
    return PROVIDER_ICONS[iconName] || Brain;
  };

  useEffect(() => {
    const checkUltrawide = () => setIsUltrawide(window.innerWidth / window.innerHeight >= 2.5);
    checkUltrawide();
    window.addEventListener('resize', checkUltrawide);
    return () => window.removeEventListener('resize', checkUltrawide);
  }, []);

  useEffect(() => { loadLibrary(); loadSettings(); loadCollectionsAndTags(); }, []);

  const toggleProviderDropdown = () => {
    setShowModelDropdown(false);
    setShowModeDropdown(false);
    setShowProviderDropdown(!showProviderDropdown);
  };

  const toggleModelDropdown = () => {
    setShowProviderDropdown(false);
    setShowModeDropdown(false);
    setShowModelDropdown(!showModelDropdown);
  };

  const toggleModeDropdown = () => {
    setShowProviderDropdown(false);
    setShowModelDropdown(false);
    setShowModeDropdown(!showModeDropdown);
  };

  const closeAllDropdowns = () => {
    setShowProviderDropdown(false);
    setShowModelDropdown(false);
    setShowModeDropdown(false);
  };

  const loadLibrary = async () => {
    try {
      const data = await window.storage.get('prompt-library-v3');
      if (data?.value) setLibrary(JSON.parse(data.value));
    } catch (e) { console.log('No existing library'); }
  };

  const loadSettings = async () => {
    try {
      const data = await window.storage.get('prompt-refinery-settings');
      if (data?.value) {
        const s = JSON.parse(data.value);
        if (s.darkMode !== undefined) setDarkMode(s.darkMode);
        if (s.providerKeys) setProviderKeys({ ...DEFAULT_PROVIDER_KEYS, ...s.providerKeys });
        if (s.azureDeployments) setAzureDeployments(s.azureDeployments);
        if (s.favorites) setFavorites(new Set(s.favorites));
        if (s.providers) setProviders({ ...DEFAULT_PROVIDERS, ...s.providers });
        if (s.lastSynced) setLastSynced(s.lastSynced);
      }
    } catch (e) {}
  };

  const saveSettings = async (updates = {}) => {
    const settings = { darkMode, providerKeys, azureDeployments, favorites: Array.from(favorites), providers, lastSynced, ...updates };
    await window.storage.set('prompt-refinery-settings', JSON.stringify(settings));
  };

  // -- Collections & Tags persistence --
  const loadCollectionsAndTags = async () => {
    try {
      const cData = await (window as any).storage.get('prompt-chronicle-collections');
      if (cData?.value) setCollections(JSON.parse(cData.value));
      const tData = await (window as any).storage.get('prompt-chronicle-tags');
      if (tData?.value) setTags(JSON.parse(tData.value));
    } catch (e) { console.log('No existing collections/tags'); }
  };

  const saveCollections = async (updated: Collection[]) => {
    setCollections(updated);
    await (window as any).storage.set('prompt-chronicle-collections', JSON.stringify(updated));
  };

  const saveTags = async (updated: TagType[]) => {
    setTags(updated);
    await (window as any).storage.set('prompt-chronicle-tags', JSON.stringify(updated));
  };

  const createCollection = async (name: string, parentId?: string, color?: string, icon?: string) => {
    const id = `col-${Date.now()}-${name.toLowerCase().replace(/\s+/g, '-').slice(0, 20)}`;
    const newCol: Collection = { id, name, parentId, color: color || '#6366f1', icon: icon || '📁', createdAt: new Date().toISOString() };
    await saveCollections([...collections, newCol]);
    return newCol;
  };

  const updateCollection = async (id: string, updates: Partial<Collection>) => {
    await saveCollections(collections.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCollection = async (id: string) => {
    // Re-parent children to deleted collection's parent
    const deleted = collections.find(c => c.id === id);
    const updated = collections
      .filter(c => c.id !== id)
      .map(c => c.parentId === id ? { ...c, parentId: deleted?.parentId } : c);
    await saveCollections(updated);
    // Remove collectionId from items in this collection
    const updatedLib = library.map(item =>
      item.collectionId === id ? { ...item, collectionId: undefined } : item
    );
    setLibrary(updatedLib);
    await (window as any).storage.set('prompt-library-v3', JSON.stringify(updatedLib));
    if (selectedCollectionId === id) setSelectedCollectionId(null);
  };

  // -- Export/Import (.prb) handlers --
  const handleExportBundle = async () => {
    try {
      setExportStatus('Preparing bundle…');
      const payload: BundlePayload = { items: library, collections, tags };
      const opts = { compress: true, encrypt: exportEncrypt, password: exportEncrypt ? exportPassword : undefined };
      const bundleJson = await createBundle(payload, opts);
      const date = new Date().toISOString().slice(0, 10);
      downloadBundle(bundleJson, `prompt-chronicle-${date}.prb`);
      setExportStatus(`Exported ${library.length} items successfully.`);
      setExportPassword('');
      setTimeout(() => setExportStatus(null), 4000);
    } catch (e: any) {
      setExportStatus(`Export failed: ${e.message}`);
    }
  };

  const handleImportBundle = async (file: File, password?: string) => {
    try {
      setImportStatus('Reading file…');
      const text = await readFileAsText(file);
      const { payload, bundle } = await parseBundle(text, password);

      // Check if encrypted and we don't have password yet
      if (bundle.encrypted && !password) {
        setPendingImportFile(file);
        setShowImportPassword(true);
        setImportStatus('This bundle is encrypted. Enter the password below.');
        return;
      }

      // Merge items: skip duplicates by id, add new ones
      const existingIds = new Set(library.map(i => i.id));
      const newItems = payload.items.filter(i => !existingIds.has(i.id));
      const mergedLibrary = [...library, ...newItems];

      // Merge collections
      const existingColIds = new Set(collections.map(c => c.id));
      const newCols = payload.collections.filter(c => !existingColIds.has(c.id));
      const mergedCollections = [...collections, ...newCols];

      // Merge tags
      const existingTagIds = new Set(tags.map(t => t.id));
      const newTags = payload.tags.filter(t => !existingTagIds.has(t.id));
      const mergedTags = [...tags, ...newTags];

      // Persist
      setLibrary(mergedLibrary);
      await (window as any).storage.set('prompt-library-v3', JSON.stringify(mergedLibrary));
      await saveCollections(mergedCollections);
      await saveTags(mergedTags);

      const added = newItems.length;
      const skipped = payload.items.length - added;
      setImportStatus(`Imported ${added} items${skipped > 0 ? ` (${skipped} duplicates skipped)` : ''}. ${newCols.length} collections, ${newTags.length} tags added.`);
      setPendingImportFile(null);
      setShowImportPassword(false);
      setImportPassword('');
      setTimeout(() => setImportStatus(null), 5000);
    } catch (e: any) {
      if (e.message.includes('encrypted') || e.message.includes('password')) {
        setPendingImportFile(file);
        setShowImportPassword(true);
        setImportStatus(e.message);
      } else {
        setImportStatus(`Import failed: ${e.message}`);
      }
    }
  };

  const createTag = async (name: string, color: string) => {
    const id = `tag-${Date.now()}-${name.toLowerCase().replace(/\s+/g, '-').slice(0, 20)}`;
    const newTag: TagType = { id, name, color };
    await saveTags([...tags, newTag]);
    return newTag;
  };

  const updateTag = async (id: string, updates: Partial<TagType>) => {
    await saveTags(tags.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTag = async (id: string) => {
    await saveTags(tags.filter(t => t.id !== id));
    // Remove tagId from all items
    const updatedLib = library.map(item =>
      item.tagIds?.includes(id) ? { ...item, tagIds: item.tagIds.filter(tid => tid !== id) } : item
    );
    setLibrary(updatedLib);
    await (window as any).storage.set('prompt-library-v3', JSON.stringify(updatedLib));
  };

  const assignCollection = async (itemId: string, collectionId: string | undefined) => {
    const updatedLib = library.map(item =>
      item.id === itemId ? { ...item, collectionId } : item
    );
    setLibrary(updatedLib);
    await (window as any).storage.set('prompt-library-v3', JSON.stringify(updatedLib));
    if (selectedPrompt?.id === itemId) setSelectedPrompt({ ...selectedPrompt, collectionId });
  };

  const toggleItemTag = async (itemId: string, tagId: string) => {
    const item = library.find(i => i.id === itemId);
    if (!item) return;
    const current = item.tagIds || [];
    const updated = current.includes(tagId) ? current.filter(t => t !== tagId) : [...current, tagId];
    const updatedLib = library.map(i => i.id === itemId ? { ...i, tagIds: updated } : i);
    setLibrary(updatedLib);
    await (window as any).storage.set('prompt-library-v3', JSON.stringify(updatedLib));
    if (selectedPrompt?.id === itemId) setSelectedPrompt({ ...selectedPrompt, tagIds: updated });
  };

  const toggleCollectionExpanded = (id: string) => {
    setExpandedCollections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getCollectionChildren = (parentId: string | undefined): Collection[] => {
    return collections.filter(c => c.parentId === parentId);
  };

  const getItemCountForCollection = (colId: string): number => {
    return library.filter(item => item.collectionId === colId).length;
  };

  const syncModels = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 8000,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{
            role: 'user',
            content: `Search for the latest AI model information from these providers and return ONLY valid JSON (no markdown, no explanation):

1. Anthropic Claude models - search "Anthropic Claude models documentation site:docs.anthropic.com"
2. OpenAI GPT models - search "OpenAI models documentation site:platform.openai.com"  
3. Google Gemini models - search "Google Gemini API models site:ai.google.dev"

For each provider, find:
- Current model IDs (the exact API identifiers like "claude-sonnet-4-5-20250929")
- Model names (display names)
- Brief descriptions
- Any reasoning/thinking mode support

Return this exact JSON structure:
{
  "anthropic": {
    "models": [
      {"id": "exact-model-id", "name": "Display Name", "description": "Brief description"}
    ],
    "modes": [
      {"id": "mode-id", "name": "Mode Name", "description": "Description", "config": {}}
    ]
  },
  "google": {
    "models": [...],
    "modes": [...]
  },
  "openai": {
    "models": [...],
    "modes": [...]
  },
  "lastChecked": "ISO date string",
  "sources": ["list of URLs consulted"]
}`
          }]
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      let text = '';
      if (data.content) {
        for (const block of data.content) {
          if (block.type === 'text') text = block.text;
        }
      }

      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
      const updates = JSON.parse(cleaned);
      
      const newProviders = { ...providers };
      let changesCount = 0;
      
      ['anthropic', 'google', 'openai'].forEach(key => {
        if (updates[key]?.models?.length > 0) {
          const oldIds = new Set(newProviders[key].models.map(m => m.id));
          const newIds = new Set(updates[key].models.map(m => m.id));
          
          updates[key].models.forEach(m => {
            if (!oldIds.has(m.id)) changesCount++;
          });
          
          newProviders[key] = {
            ...newProviders[key],
            models: updates[key].models,
            ...(updates[key].modes?.length > 0 && { modes: updates[key].modes })
          };
        }
      });

      const syncTime = new Date().toISOString();
      setProviders(newProviders);
      setLastSynced(syncTime);
      await saveSettings({ providers: newProviders, lastSynced: syncTime });
      
      setSyncResult({
        success: true,
        message: `Sync complete. ${changesCount} new model(s) found.`,
        sources: updates.sources || []
      });

    } catch (error) {
      console.error('Sync error:', error);
      setSyncResult({
        success: false,
        message: error.message || 'Failed to sync models'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const addModelToProvider = async (providerId, model) => {
    const newProviders = { ...providers };
    newProviders[providerId].models = [...newProviders[providerId].models, model];
    setProviders(newProviders);
    await saveSettings({ providers: newProviders });
    setNewModel({ id: '', name: '', description: '' });
  };

  const removeModelFromProvider = async (providerId, modelId) => {
    const newProviders = { ...providers };
    newProviders[providerId].models = newProviders[providerId].models.filter(m => m.id !== modelId);
    setProviders(newProviders);
    await saveSettings({ providers: newProviders });
  };

  const updateModelInProvider = async (providerId, modelId, updates) => {
    const newProviders = { ...providers };
    newProviders[providerId].models = newProviders[providerId].models.map(m => 
      m.id === modelId ? { ...m, ...updates } : m
    );
    setProviders(newProviders);
    await saveSettings({ providers: newProviders });
    setEditingModel(null);
  };

  const resetToDefaults = async () => {
    setProviders(DEFAULT_PROVIDERS);
    setLastSynced(null);
    await saveSettings({ providers: DEFAULT_PROVIDERS, lastSynced: null });
  };

  const toggleFavorite = async (id) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) newFavorites.delete(id);
    else newFavorites.add(id);
    setFavorites(newFavorites);
    await saveSettings({ favorites: Array.from(newFavorites) });
  };

  const saveToLibrary = async (item) => {
    const updated = [item, ...library];
    setLibrary(updated);
    await window.storage.set('prompt-library-v3', JSON.stringify(updated));
  };

  const saveResultWithTitle = async (title, sourceResult, isGenerated) => {
    const itemId = `${Date.now()}-${title.substring(0, 20).replace(/\s/g, '-')}`;

    const item: any = {
      id: itemId,
      title: title,
      originalPrompt: isGenerated ? sourceResult.originalIdea : sourceResult.originalPrompt,
      refactoredPrompt: isGenerated ? sourceResult.generatedPrompt : sourceResult.refactoredPrompt,
      category: sourceResult.category,
      complexity: sourceResult.complexity,
      tags: sourceResult.tags,
      createdAt: new Date().toISOString(),
      version: '1.0',
      processedWith: sourceResult.processedWith,
      isGenerated: isGenerated
    };

    // Version chain: link to parent when re-importing
    if (reimportSourceId) {
      const parent = library.find(p => p.id === reimportSourceId);
      if (parent) {
        item.parentId = parent.id;
        item.rootId = parent.rootId || parent.id;
        item.versionNumber = getNextVersionNumber(parent.versionNumber || '1.0');
      }
      setReimportSourceId(null);
    } else {
      item.versionNumber = '1.0';
    }

    await saveToLibrary(item);
    setSavedTitles(prev => new Set([...prev, title]));
    return item;
  };

  const deleteFromLibrary = async (id) => {
    const item = library.find(p => p.id === id);
    if (!item) return;
    const updated = repairChainAfterDeletion(item as any, library as any);
    setLibrary(updated);
    await window.storage.set('prompt-library-v3', JSON.stringify(updated));
    if (selectedPrompt?.id === id) setSelectedPrompt(null);
  };

  const handleReimport = (item) => {
    if (!item.refactoredPrompt) return;
    setPrompt(item.refactoredPrompt);
    setReimportSourceId(item.id);
    setView('refine');
    setMode('refine');
  };

  const handleDuplicate = async (item) => {
    const itemId = `${Date.now()}-${item.title.substring(0, 20).replace(/\s/g, '-')}-copy`;
    const dup = {
      ...item,
      id: itemId,
      title: `Copy of ${item.title}`,
      createdAt: new Date().toISOString(),
      versionNumber: '1.0',
      parentId: undefined,
      rootId: undefined,
    };
    await saveToLibrary(dup);
  };

  const handleCompareVersions = (a, b) => {
    setDiffVersions([a, b]);
    setShowDiffView(true);
  };

  // -- Chronicle handlers --

  const openCommitDialog = (itemId: string) => {
    setCommitTargetId(itemId);
    setCommitNote('');
    setShowCommitDialog(true);
  };

  const handleCommitChronicle = async (item: any, note?: string) => {
    const snapshot: ChronicleSnapshot = {
      originalPrompt: item.originalPrompt,
      refactoredPrompt: item.refactoredPrompt,
      tags: [...(item.tags || [])],
      category: item.category || '',
    };

    const existing: ChronicleEntry[] = item.chronicle || [];
    const parentHash = existing.length > 0 ? existing[existing.length - 1].hash : undefined;

    const hashInput = JSON.stringify({ ...snapshot, parentHash: parentHash || '' });
    const hash = await computeSHA256(hashInput);

    const entry: ChronicleEntry = {
      hash,
      timestamp: new Date().toISOString(),
      note: note || undefined,
      parentHash,
      snapshot,
    };

    const updatedItem = {
      ...item,
      chronicle: [...existing, entry],
      stagedChanges: undefined,
    };

    const updatedLibrary = library.map(p => p.id === item.id ? updatedItem : p);
    setLibrary(updatedLibrary);
    await (window as any).storage.set('prompt-library-v3', JSON.stringify(updatedLibrary));
    setSelectedPrompt(updatedItem);
    setShowCommitDialog(false);
    setCommitNote('');
    setCommitTargetId(null);
  };

  const handleRollback = async (item: any, entry: ChronicleEntry) => {
    const updatedItem = {
      ...item,
      originalPrompt: entry.snapshot.originalPrompt,
      refactoredPrompt: entry.snapshot.refactoredPrompt,
      tags: [...entry.snapshot.tags],
      category: entry.snapshot.category,
    };

    const updatedLibrary = library.map(p => p.id === item.id ? updatedItem : p);
    setLibrary(updatedLibrary);
    await (window as any).storage.set('prompt-library-v3', JSON.stringify(updatedLibrary));
    setSelectedPrompt(updatedItem);
  };

  const copyToClipboard = async (text, field) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleProviderChange = (providerId) => {
    setSelectedProvider(providerId);
    const provider = providers[providerId];
    const models = providerId === 'azure' ? azureDeployments : provider.models;
    if (models.length > 0) setSelectedModel(models[0]);
    else setSelectedModel(null);
    setSelectedMode(provider.modes[0]);
  };

  const handleModelChange = (model) => {
    setSelectedModel(model);
    if (selectedProvider === 'openai') {
      const isReasoningModel = model.id.startsWith('o1') || model.id.startsWith('o3');
      if (!isReasoningModel) {
        setSelectedMode(providers.openai.modes.find(m => m.id === 'none') || providers.openai.modes[0]);
      } else {
        setSelectedMode(providers.openai.modes.find(m => m.id === 'medium') || providers.openai.modes[0]);
      }
    }
  };

  const getAvailableModels = () => selectedProvider === 'azure' ? azureDeployments : providers[selectedProvider]?.models || [];

  const getAvailableModes = () => {
    const provider = providers[selectedProvider];
    if (!provider) return [];
    
    if (selectedProvider === 'openai' && selectedModel) {
      const isReasoningModel = selectedModel.id.startsWith('o1') || selectedModel.id.startsWith('o3');
      if (!isReasoningModel) {
        return provider.modes.filter(m => m.id === 'none');
      }
      return provider.modes.filter(m => m.id !== 'none');
    }
    
    return provider.modes;
  };

  const hasRequiredAPIKey = () => {
    switch (selectedProvider) {
      case 'anthropic':
        return true;
      case 'google':
        return !!providerKeys.google?.apiKey;
      case 'openai':
        return !!providerKeys.openai?.apiKey;
      case 'azure':
        return !!providerKeys.azure?.endpoint && !!providerKeys.azure?.apiKey;
      default:
        return false;
    }
  };

  // EXPAND MODE: Transform brief idea into comprehensive prompt
  const generatePrompt = async () => {
    if (!prompt.trim()) return;
    
    if (!hasRequiredAPIKey()) {
      setGeneratedResult({ error: `API key required for ${providers[selectedProvider].name}. Configure in Settings > API Keys.` });
      return;
    }
    
    setIsProcessing(true);
    setProcessStep(1);
    setSavedTitles(new Set());

    const systemPrompt = `You are an elite Prompt Engineer at Twindevs. Your task is to transform a user's brief, informal idea into a comprehensive, production-grade prompt that would extract the maximum value from an AI assistant.

USER'S BRIEF IDEA:
"""
${prompt}
"""

Analyze the user's intent deeply. Consider:
- What are they really trying to achieve?
- What domain expertise would be needed?
- What deliverables would be most valuable?
- What constraints and requirements should be explicit?
- What format and structure would best serve the goal?

Create a comprehensive, detailed prompt that:
1. Defines clear roles, context, and objectives
2. Specifies explicit deliverables with format requirements
3. Includes relevant constraints (technical, business, quality)
4. Adds helpful structure (sections, numbering, YAML frontmatter if applicable)
5. Incorporates best practices for the domain
6. Includes example snippets, templates, or schemas where helpful
7. Specifies output format requirements
8. Adds quality gates and validation criteria

Return ONLY valid JSON (no markdown, no backticks):
{
  "title": "A comprehensive, descriptive title for this prompt",
  "titleRationale": "2-3 sentences explaining why this title captures the essence",
  "alternativeTitles": [
    {"title": "Alternative 1", "emphasis": "What aspect this emphasizes"},
    {"title": "Alternative 2", "emphasis": "What aspect this emphasizes"},
    {"title": "Alternative 3", "emphasis": "What aspect this emphasizes"}
  ],
  "category": "One of: Coding, Writing, Analysis, Creative, Research, System, DevOps, Data, Design, Architecture",
  "complexity": "One of: Simple, Moderate, Complex, Expert",
  "estimatedTokens": 2500,
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "generatedPrompt": "THE FULL COMPREHENSIVE PROMPT TEXT HERE - this should be extensive, well-structured, and production-ready. Include YAML frontmatter if applicable, clear sections, explicit requirements, deliverable specs, constraints, examples, and output format requirements. This is the main deliverable.",
  "keyEnhancements": [
    "Brief description of enhancement 1 you added",
    "Brief description of enhancement 2 you added",
    "Brief description of enhancement 3 you added"
  ],
  "usageNotes": "Brief notes on how to best use this prompt, any variables to customize, etc."
}`;

    try {
      const thinkingConfig = selectedProvider === 'anthropic' 
        ? { thinking: { type: 'enabled', budget_tokens: 10000 } }
        : selectedProvider === 'google'
        ? { thinkingConfig: { thinkingBudget: 8192 } }
        : selectedMode.config || {};
      
      const maxTokens = selectedProvider === 'anthropic' ? 18000 : 16000;
      
      const text = await callProviderAPI(
        selectedProvider,
        systemPrompt,
        selectedModel,
        thinkingConfig,
        providerKeys,
        maxTokens
      );

      setProcessStep(2);
      
      setProcessStep(3);
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
      const analysis = JSON.parse(cleaned);
      
      setGeneratedResult({
        id: Date.now().toString(),
        originalIdea: prompt,
        ...analysis,
        processedWith: { provider: providers[selectedProvider].name, model: selectedModel.name, mode: 'Extended Thinking' }
      });
      setProcessStep(4);
    } catch (error) {
      console.error('Processing error:', error);
      setGeneratedResult({ error: error.message || 'Failed to process. Check console for details.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // TEMPLATIZE MODE: Process existing detailed prompt
  const processPrompt = async () => {
    if (!prompt.trim() || !selectedModel) return;
    
    if (!hasRequiredAPIKey()) {
      setResult({ error: `API key required for ${providers[selectedProvider].name}. Configure in Settings > API Keys.` });
      return;
    }
    
    setIsProcessing(true);
    setProcessStep(1);
    setSavedTitles(new Set());

    const systemPrompt = `You are a Prompt Refinery AI. Analyze the following prompt and return ONLY valid JSON (no markdown, no backticks, no explanation).

PROMPT TO ANALYZE:
"""
${prompt}
"""

Return this exact JSON structure:
{
  "title": "A clear, descriptive title for this prompt",
  "alternativeTitles": [
    {"title": "Alternative 1", "bestFor": "What this emphasizes", "reasoning": "Why this works"},
    {"title": "Alternative 2", "bestFor": "What this emphasizes", "reasoning": "Why this works"},
    {"title": "Alternative 3", "bestFor": "What this emphasizes", "reasoning": "Why this works"}
  ],
  "recommendedReasoning": "Why the main title is recommended",
  "category": "One of: Coding, Writing, Analysis, Creative, Research, System, DevOps, Data, Design",
  "complexity": "One of: Simple, Moderate, Complex",
  "targetModel": "Best AI model for this prompt",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "tone": "One of: Formal, Technical, Casual, Instructional, Analytical",
  "tokenEstimate": 1500,
  "refactoredPrompt": "A generalized, templatized version of the prompt with $VARIABLE_NAME placeholders for project-specific details. Include a variables section at the top listing all variables with descriptions. Make it reusable across different projects while retaining the structure and comprehensiveness."
}`;

    try {
      const thinkingBudget = selectedMode.config?.thinking?.budget_tokens || 0;
      const maxTokens = thinkingBudget > 0 ? thinkingBudget + 8000 : 16000;
      
      const text = await callProviderAPI(
        selectedProvider,
        systemPrompt,
        selectedModel,
        selectedMode.config || {},
        providerKeys,
        maxTokens
      );

      setProcessStep(2);
      
      setProcessStep(3);
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
      const analysis = JSON.parse(cleaned);
      
      setResult({
        id: Date.now().toString(),
        originalPrompt: prompt,
        ...generateMetadata(analysis),
        refactoredPrompt: analysis.refactoredPrompt,
        alternativeTitles: analysis.alternativeTitles,
        recommendedReasoning: analysis.recommendedReasoning,
        processedWith: { provider: providers[selectedProvider].name, model: selectedModel.name, mode: selectedMode.name }
      });
      setProcessStep(4);
    } catch (error) {
      console.error('Processing error:', error);
      setResult({ error: error.message || 'Failed to process. Check console for details.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================================================
  // ENTERPRISE THEME - Solid colors, no glassmorphism, small radii
  // ============================================================================
  const theme = {
    bg: darkMode ? '#0a0a0a' : '#fafafa',
    card: darkMode ? '#141414' : '#ffffff',
    cardBorder: darkMode ? '#262626' : '#e5e5e5',
    cardSelected: darkMode ? '#1f1f1f' : '#f5f5f5',
    text: darkMode ? '#f5f5f5' : '#171717',
    textSecondary: darkMode ? '#a3a3a3' : '#525252',
    textMuted: darkMode ? '#737373' : '#a3a3a3',
    input: darkMode ? '#171717' : '#ffffff',
    inputBorder: darkMode ? '#262626' : '#d4d4d4',
    buttonPrimary: darkMode ? '#f5f5f5' : '#171717',
    buttonPrimaryText: darkMode ? '#171717' : '#f5f5f5',
    buttonSecondary: darkMode ? '#262626' : '#f5f5f5',
    tag: darkMode ? '#262626' : '#f5f5f5',
    codeBlock: darkMode ? '#171717' : '#fafafa',
    accent: darkMode ? '#a3a3a3' : '#525252',
    accentBg: darkMode ? '#1f1f1f' : '#f5f5f5',
    warning: darkMode ? '#422006' : '#fef3c7',
    warningBorder: darkMode ? '#713f12' : '#fcd34d',
    warningText: darkMode ? '#fbbf24' : '#92400e',
  };

  // ============================================================================
  // UI COMPONENTS - Enterprise style with solid backgrounds and small radii
  // ============================================================================

  const Card = ({ children, className = '', onClick, selected, padding = true }) => (
    <div onClick={onClick} className={`border transition-colors duration-150 ${onClick ? 'cursor-pointer hover:border-current' : ''} ${padding ? 'p-4' : ''} ${className}`}
      style={{
        background: selected ? theme.cardSelected : theme.card,
        borderColor: selected ? theme.text : theme.cardBorder,
        borderRadius: '6px'
      }}>
      {children}
    </div>
  );

  const Button = ({ children, onClick, variant = 'primary', size = 'md', disabled, className = '', icon: Icon }) => {
    const base = "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed";
    const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5' };
    const variants = {
      primary: { background: theme.buttonPrimary, color: theme.buttonPrimaryText, border: 'none' },
      secondary: { background: theme.buttonSecondary, color: theme.text, border: `1px solid ${theme.cardBorder}` },
      ghost: { background: 'transparent', color: theme.textSecondary, border: 'none' }
    };
    return (
      <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} hover:opacity-80 ${className}`} 
        style={{ ...variants[variant], borderRadius: '4px' }}>
        {Icon && <Icon size={size === 'sm' ? 14 : 15} />}
        {children}
      </button>
    );
  };

  const Tag = ({ children }) => (
    <span className="px-2 py-0.5 text-xs font-medium" 
      style={{ background: theme.tag, color: theme.textSecondary, borderRadius: '3px' }}>
      {children}
    </span>
  );

  const CopyButton = ({ text, field }) => (
    <button onClick={() => copyToClipboard(text, field)} 
      className="p-1.5 transition-colors duration-150 hover:opacity-70"
      style={{ color: copiedField === field ? '#22c55e' : theme.textMuted, borderRadius: '3px' }}>
      {copiedField === field ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );

  const SaveableTitle = ({ title, sourceResult, isGenerated, variant = 'primary' }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [justSaved, setJustSaved] = useState(false);
    const isSaved = savedTitles.has(title);
    
    const handleSave = async (e) => {
      e.stopPropagation();
      if (isSaved) return;
      
      await saveResultWithTitle(title, sourceResult, isGenerated);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    };
    
    const isPrimary = variant === 'primary';
    
    return (
      <div 
        className="group relative flex items-start gap-2 transition-colors duration-150 cursor-pointer p-2"
        style={{ 
          background: isHovered ? theme.cardSelected : (isPrimary ? 'transparent' : theme.codeBlock),
          borderRadius: '4px'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleSave}
      >
        <span 
          className={`flex-1 ${isPrimary ? 'text-sm font-semibold' : 'text-sm'}`}
          style={{ color: theme.text }}
        >
          {title}
        </span>
        
        <span 
          className="flex items-center gap-1 text-xs transition-opacity duration-150"
          style={{ 
            opacity: isHovered || isSaved || justSaved ? 1 : 0,
            color: isSaved || justSaved ? '#22c55e' : theme.textMuted 
          }}
        >
          {isSaved || justSaved ? (
            <>
              <Check size={12} />
              <span>Saved</span>
            </>
          ) : (
            <>
              <Library size={12} />
              <span>Save</span>
            </>
          )}
        </span>
      </div>
    );
  };

  const Dropdown = ({ show, onToggle, onClose, icon: Icon, label, sublabel, children }) => {
    const dropdownRef = React.useRef(null);
    
    useEffect(() => {
      if (!show) return;
      
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          onClose();
        }
      };
      
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 10);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [show, onClose]);

    return (
      <div className="relative" ref={dropdownRef}>
        <button 
          type="button"
          onClick={(e) => { e.preventDefault(); onToggle(); }}
          className="flex items-center gap-2 px-3 py-2 border transition-colors hover:opacity-80"
          style={{ background: theme.input, borderColor: theme.inputBorder, borderRadius: '4px' }}>
          {Icon && <Icon size={14} style={{ color: theme.textMuted }} />}
          <div className="text-left">
            <span className="text-sm" style={{ color: theme.text }}>{label}</span>
            {sublabel && <span className="text-xs ml-1" style={{ color: theme.textMuted }}>{sublabel}</span>}
          </div>
          <ChevronDown size={14} className={`transition-transform ${show ? 'rotate-180' : ''}`} style={{ color: theme.textMuted }} />
        </button>
        {show && (
          <div className="absolute top-full left-0 mt-1 w-64 border shadow-lg z-50 overflow-hidden"
            style={{ background: theme.card, borderColor: theme.cardBorder, borderRadius: '4px' }}>
            {children}
          </div>
        )}
      </div>
    );
  };

  const ProgressIndicator = ({ step, isExpand }) => {
    const steps = isExpand ? ['Parsing input', 'Analyzing structure', 'Building output', 'Complete'] : ['Analyzing', 'Extracting metadata', 'Formatting', 'Complete'];
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-2" style={{ borderColor: theme.inputBorder, borderRadius: '50%' }} />
          <div className="absolute inset-0 border-2 border-t-transparent animate-spin" style={{ borderColor: theme.text, borderTopColor: 'transparent', borderRadius: '50%' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            {isExpand ? <FileText size={18} style={{ color: theme.textSecondary }} /> : <Cpu size={18} style={{ color: theme.textSecondary }} />}
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: theme.text }}>{steps[step - 1] || steps[0]}</p>
          <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
            {isExpand 
              ? `${providers[selectedProvider]?.name || 'Provider'} - Extended processing` 
              : `${providers[selectedProvider]?.name || 'Provider'} - ${selectedModel?.name || 'Model'}${selectedMode?.config?.thinking ? ' - Thinking' : ''}`}
          </p>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-1.5 h-1.5 transition-colors duration-300" 
              style={{ background: i <= step ? theme.text : theme.inputBorder, borderRadius: '50%' }} />
          ))}
        </div>
      </div>
    );
  };

  const APIKeyWarning = () => {
    if (selectedProvider === 'anthropic' || hasRequiredAPIKey()) return null;
    
    return (
      <div className="flex items-center gap-3 px-3 py-2 mb-4" 
        style={{ background: theme.warning, border: `1px solid ${theme.warningBorder}`, borderRadius: '4px' }}>
        <AlertCircle size={14} style={{ color: theme.warningText }} />
        <p className="text-sm" style={{ color: theme.warningText }}>
          {providers[selectedProvider].name} API key required. <button onClick={() => setView('settings')} className="underline font-medium">Configure in Settings</button>
        </p>
      </div>
    );
  };

  const ModeToggle = () => (
    <div className="flex p-1 mb-4" style={{ background: theme.codeBlock, borderRadius: '4px' }}>
      <button onClick={() => { setMode('refine'); setResult(null); setGeneratedResult(null); setSavedTitles(new Set()); }}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 transition-colors"
        style={{ background: mode === 'refine' ? theme.buttonPrimary : 'transparent', color: mode === 'refine' ? theme.buttonPrimaryText : theme.textSecondary, borderRadius: '3px' }}>
        <RefreshCw size={14} />
        <span className="font-medium text-sm">Templatize</span>
      </button>
      <button onClick={() => { setMode('generate'); setResult(null); setGeneratedResult(null); setSavedTitles(new Set()); }}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 transition-colors"
        style={{ background: mode === 'generate' ? theme.buttonPrimary : 'transparent', color: mode === 'generate' ? theme.buttonPrimaryText : theme.textSecondary, borderRadius: '3px' }}>
        <FileText size={14} />
        <span className="font-medium text-sm">Expand</span>
      </button>
    </div>
  );

  const ProviderModelSelector = () => {
    const provider = providers[selectedProvider];
    const ProviderIcon = getProviderIcon(selectedProvider);

    return (
      <div className="flex flex-wrap gap-2 mb-4">
        <Dropdown show={showProviderDropdown} onToggle={toggleProviderDropdown} onClose={() => setShowProviderDropdown(false)} icon={ProviderIcon} label={provider.name}>
          <div className="px-3 py-2 border-b" style={{ borderColor: theme.inputBorder }}>
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: theme.textMuted }}>Provider</span>
          </div>
          {Object.entries(providers).map(([id, p]) => {
            const PIcon = getProviderIcon(id);
            const hasKey = id === 'anthropic' || (id === 'google' && providerKeys.google?.apiKey) || (id === 'openai' && providerKeys.openai?.apiKey) || (id === 'azure' && providerKeys.azure?.endpoint && providerKeys.azure?.apiKey);
            return (
              <button key={id} onClick={() => { handleProviderChange(id); setShowProviderDropdown(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left hover:opacity-80"
                style={{ background: selectedProvider === id ? theme.cardSelected : 'transparent' }}>
                <PIcon size={14} style={{ color: theme.textMuted }} />
                <div className="flex-1">
                  <div className="text-sm font-medium flex items-center gap-2" style={{ color: theme.text }}>
                    {p.name}
                    {!hasKey && id !== 'anthropic' && <span className="text-xs px-1.5 py-0.5" style={{ background: theme.warning, color: theme.warningText, borderRadius: '2px' }}>No key</span>}
                  </div>
                  <div className="text-xs" style={{ color: theme.textMuted }}>
                    {id === 'azure' ? `${azureDeployments.length} deployments` : `${p.models.length} models`}
                  </div>
                </div>
              </button>
            );
          })}
        </Dropdown>

        <Dropdown show={showModelDropdown} onToggle={toggleModelDropdown} onClose={() => setShowModelDropdown(false)} icon={Layers} label={selectedModel?.name || 'Select Model'}>
          <div className="px-3 py-2 border-b" style={{ borderColor: theme.inputBorder }}>
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: theme.textMuted }}>Model</span>
          </div>
          {getAvailableModels().length === 0 ? (
            <div className="px-3 py-4 text-center" style={{ color: theme.textMuted }}>
              <p className="text-sm">No models configured</p>
            </div>
          ) : getAvailableModels().map((m) => (
            <button key={m.id} onClick={() => { handleModelChange(m); setShowModelDropdown(false); }}
              className="w-full flex items-start gap-3 px-3 py-2.5 transition-colors text-left hover:opacity-80"
              style={{ background: selectedModel?.id === m.id ? theme.cardSelected : 'transparent' }}>
              <div>
                <div className="text-sm font-medium" style={{ color: theme.text }}>{m.name}</div>
                <div className="text-xs" style={{ color: theme.textMuted }}>{m.description}</div>
              </div>
            </button>
          ))}
        </Dropdown>

        {mode === 'refine' && (
          <Dropdown show={showModeDropdown} onToggle={toggleModeDropdown} onClose={() => setShowModeDropdown(false)} icon={Zap} label={selectedMode.name}>
            <div className="px-3 py-2 border-b" style={{ borderColor: theme.inputBorder }}>
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: theme.textMuted }}>Mode</span>
            </div>
            {getAvailableModes().map((m) => (
              <button key={m.id} onClick={() => { setSelectedMode(m); setShowModeDropdown(false); }}
                className="w-full flex items-start gap-3 px-3 py-2.5 transition-colors text-left hover:opacity-80"
                style={{ background: selectedMode.id === m.id ? theme.cardSelected : 'transparent' }}>
                <div>
                  <div className="text-sm font-medium" style={{ color: theme.text }}>{m.name}</div>
                  <div className="text-xs" style={{ color: theme.textMuted }}>{m.description}</div>
                </div>
              </button>
            ))}
          </Dropdown>
        )}

        {mode === 'generate' && (
          <div className="flex items-center gap-2 px-3 py-2" style={{ background: theme.codeBlock, border: `1px solid ${theme.inputBorder}`, borderRadius: '4px' }}>
            <Brain size={14} style={{ color: theme.textSecondary }} />
            <span className="text-sm" style={{ color: theme.textSecondary }}>Extended processing</span>
          </div>
        )}

        <button onClick={() => { setDarkMode(!darkMode); saveSettings({ darkMode: !darkMode }); }}
          className="ml-auto p-2 border transition-colors hover:opacity-80"
          style={{ background: theme.input, borderColor: theme.inputBorder, borderRadius: '4px' }}>
          {darkMode ? <Sun size={14} style={{ color: theme.text }} /> : <Moon size={14} style={{ color: theme.text }} />}
        </button>
      </div>
    );
  };

  // ============================================================================
  // VIEWS
  // ============================================================================

  const RefineView = () => (
    <div className={`flex ${isUltrawide ? 'flex-row gap-6' : 'flex-col gap-4'} max-w-7xl mx-auto`}>
      <div className={isUltrawide ? 'w-1/3 flex flex-col gap-4' : 'w-full'}>
        {!isUltrawide && (
          <div className="mb-2">
            <h1 className="text-xl font-semibold" style={{ color: theme.text }}>
              Prompt Refinery <span className="font-normal text-sm" style={{ color: theme.textMuted }}>Twindevs</span>
            </h1>
            <p className="text-sm mt-1" style={{ color: theme.textMuted }}>
              {mode === 'generate' ? 'Expand brief input into structured prompt specification' : 'Convert prompt into reusable template format'}
            </p>
          </div>
        )}

        <Card>
          {isUltrawide && <h2 className="text-base font-semibold mb-4" style={{ color: theme.text }}>Input <span className="font-normal text-sm" style={{ color: theme.textMuted }}>Twindevs</span></h2>}
          
          <ModeToggle />
          <ProviderModelSelector />
          <APIKeyWarning />
          
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} 
            placeholder={mode === 'generate' 
              ? "Enter brief task description..." 
              : "Paste prompt to convert into template..."}
            className="w-full h-48 md:h-56 resize-none bg-transparent outline-none text-sm leading-relaxed"
            style={{ color: theme.text }} />
          
          <div className="flex flex-wrap justify-between items-center gap-3 mt-4 pt-4 border-t" style={{ borderColor: theme.inputBorder }}>
            <span className="text-xs" style={{ color: theme.textMuted }}>{prompt.length.toLocaleString()} characters</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPrompt('')} icon={X}>Clear</Button>
              {mode === 'generate' ? (
                <Button onClick={generatePrompt} disabled={!prompt.trim() || isProcessing || !hasRequiredAPIKey()} icon={ArrowRight}>
                  {isProcessing ? 'Processing...' : 'Run'}
                </Button>
              ) : (
                <Button onClick={processPrompt} disabled={!prompt.trim() || isProcessing || !selectedModel || !hasRequiredAPIKey()} icon={ArrowRight}>
                  {isProcessing ? 'Processing...' : 'Run'}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {isProcessing && !isUltrawide && <Card><ProgressIndicator step={processStep} isExpand={mode === 'generate'} /></Card>}
      </div>

      {(isUltrawide || result || generatedResult) && (
        <div className={isUltrawide ? 'w-2/3 flex flex-col gap-4 overflow-auto max-h-[85vh]' : 'w-full flex flex-col gap-4'}>
          {isUltrawide && <h2 className="text-base font-semibold" style={{ color: theme.text }}>Output</h2>}
          
          {isProcessing && isUltrawide && <Card><ProgressIndicator step={processStep} isExpand={mode === 'generate'} /></Card>}

          {/* EXPAND MODE RESULTS */}
          {generatedResult && !generatedResult.error && (
            <>
              <Card>
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <FileText size={14} style={{ color: theme.textSecondary }} />
                      <h2 className="text-sm font-semibold" style={{ color: theme.text }}>Expanded Prompt</h2>
                    </div>
                    <p className="text-xs" style={{ color: theme.textMuted }}>
                      {generatedResult.processedWith?.provider} - Extended processing
                    </p>
                  </div>
                  <Tag>{generatedResult.complexity}</Tag>
                </div>

                <div className="mb-4">
                  <p className="text-xs mb-2" style={{ color: theme.textMuted }}>Click title to save to library</p>
                  <SaveableTitle 
                    title={generatedResult.title} 
                    sourceResult={generatedResult} 
                    isGenerated={true} 
                    variant="primary" 
                  />
                  <p className="text-sm p-3 mt-3" style={{ background: theme.codeBlock, color: theme.textSecondary, borderRadius: '4px' }}>
                    {generatedResult.titleRationale}
                  </p>
                </div>

                {generatedResult.alternativeTitles?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: theme.textMuted }}>Alternative Titles</p>
                    <div className="space-y-1">
                      {generatedResult.alternativeTitles.map((alt, i) => (
                        <div key={i}>
                          <SaveableTitle 
                            title={alt.title} 
                            sourceResult={generatedResult} 
                            isGenerated={true} 
                            variant="secondary" 
                          />
                          {alt.emphasis && (
                            <p className="text-xs mt-1 ml-2" style={{ color: theme.textMuted }}>Emphasis: {alt.emphasis}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {generatedResult.tags?.map(tag => <Tag key={tag}>{tag}</Tag>)}
                </div>

                {generatedResult.keyEnhancements?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: theme.textMuted }}>Additions</p>
                    <ul className="space-y-1">
                      {generatedResult.keyEnhancements.map((e, i) => (
                        <li key={i} className="text-sm flex items-start gap-2" style={{ color: theme.textSecondary }}>
                          <span className="mt-1.5 w-1 h-1 flex-shrink-0" style={{ background: theme.textMuted, borderRadius: '50%' }} />
                          {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {generatedResult.usageNotes && (
                  <p className="text-sm p-3" style={{ background: theme.codeBlock, color: theme.textSecondary, borderRadius: '4px' }}>
                    <strong>Notes:</strong> {generatedResult.usageNotes}
                  </p>
                )}
              </Card>

              <Card>
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div>
                    <h2 className="text-sm font-semibold" style={{ color: theme.text }}>Full Output</h2>
                    <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>~{generatedResult.estimatedTokens?.toLocaleString()} tokens</p>
                  </div>
                  <CopyButton text={generatedResult.generatedPrompt} field="generated" />
                </div>
                <pre className="whitespace-pre-wrap text-sm p-4 overflow-auto max-h-[500px] leading-relaxed font-mono"
                  style={{ background: theme.codeBlock, color: theme.textSecondary, borderRadius: '4px' }}>
                  {generatedResult.generatedPrompt}
                </pre>
              </Card>

              <div className="flex justify-center gap-3">
                <Button variant="secondary" onClick={() => { setGeneratedResult(null); setPrompt(''); setSavedTitles(new Set()); }}>Reset</Button>
                <Button variant="secondary" onClick={() => { 
                  setPrompt(generatedResult.generatedPrompt); 
                  setMode('refine'); 
                  setGeneratedResult(null);
                  setSavedTitles(new Set());
                }} icon={RefreshCw}>Templatize Output</Button>
                <Button onClick={() => { 
                  saveToLibrary({
                    id: generatedResult.id,
                    title: generatedResult.title,
                    originalPrompt: generatedResult.originalIdea,
                    refactoredPrompt: generatedResult.generatedPrompt,
                    category: generatedResult.category,
                    complexity: generatedResult.complexity,
                    tags: generatedResult.tags,
                    createdAt: new Date().toISOString(),
                    version: '1.0',
                    processedWith: generatedResult.processedWith,
                    isGenerated: true
                  });
                  setSavedTitles(prev => new Set([...prev, generatedResult.title]));
                  setView('library'); 
                }} icon={Library}>Save to Library</Button>
              </div>
            </>
          )}

          {/* TEMPLATIZE MODE RESULTS */}
          {result && !result.error && (
            <>
              <Card>
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div className="flex-1">
                    <h2 className="text-sm font-semibold" style={{ color: theme.text }}>Extracted Title</h2>
                    <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                      {result.processedWith?.provider} - {result.processedWith?.model} - {result.processedWith?.mode}
                    </p>
                  </div>
                  <CopyButton text={result.title} field="title" />
                </div>
                
                <p className="text-xs mb-2" style={{ color: theme.textMuted }}>Click title to save to library</p>
                <SaveableTitle 
                  title={result.title} 
                  sourceResult={result} 
                  isGenerated={false} 
                  variant="primary" 
                />
                
                {result.recommendedReasoning && (
                  <p className="text-sm mt-3 p-3" style={{ background: theme.codeBlock, color: theme.textSecondary, borderRadius: '4px' }}>
                    <span className="font-medium">Rationale:</span> {result.recommendedReasoning}
                  </p>
                )}
                {result.alternativeTitles?.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide" style={{ color: theme.textMuted }}>Alternatives</p>
                    {result.alternativeTitles.map((alt, i) => (
                      <div key={i}>
                        <SaveableTitle 
                          title={alt.title} 
                          sourceResult={result} 
                          isGenerated={false} 
                          variant="secondary" 
                        />
                        <p className="text-xs mt-1 ml-2" style={{ color: theme.textMuted }}>Use case: {alt.bestFor}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <div className="flex justify-between items-start gap-4 mb-4">
                  <h2 className="text-sm font-semibold" style={{ color: theme.text }}>Metadata</h2>
                  <CopyButton text={JSON.stringify(generateMetadata(result), null, 2)} field="metadata" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Category', value: result.category },
                    { label: 'Complexity', value: result.complexity },
                    { label: 'Target Model', value: result.targetModel },
                    { label: 'Tone', value: result.tone },
                    { label: 'Est. Tokens', value: `~${result.tokenEstimate?.toLocaleString()}` },
                    { label: 'Version', value: result.version }
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3" style={{ background: theme.codeBlock, borderRadius: '4px' }}>
                      <p className="text-xs mb-0.5" style={{ color: theme.textMuted }}>{label}</p>
                      <p className="font-medium text-sm" style={{ color: theme.text }}>{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <p className="text-xs mb-2" style={{ color: theme.textMuted }}>Tags</p>
                  <div className="flex flex-wrap gap-1.5">{result.tags?.map(tag => <Tag key={tag}>{tag}</Tag>)}</div>
                </div>
              </Card>

              <Card>
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div>
                    <h2 className="text-sm font-semibold" style={{ color: theme.text }}>Template Output</h2>
                    <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>Parameterized for reuse</p>
                  </div>
                  <CopyButton text={result.refactoredPrompt} field="refactored" />
                </div>
                <pre className="whitespace-pre-wrap text-sm p-4 overflow-auto max-h-80 leading-relaxed font-mono"
                  style={{ background: theme.codeBlock, color: theme.textSecondary, borderRadius: '4px' }}>
                  {result.refactoredPrompt}
                </pre>
              </Card>

              <div className="flex justify-center gap-3">
                <Button variant="secondary" onClick={() => { setResult(null); setPrompt(''); setSavedTitles(new Set()); }}>Reset</Button>
                <Button onClick={() => { 
                  saveToLibrary(result); 
                  setSavedTitles(prev => new Set([...prev, result.title]));
                  setView('library'); 
                }} icon={Library}>Save to Library</Button>
              </div>
            </>
          )}

          {(result?.error || generatedResult?.error) && (
            <Card>
              <div className="flex items-start gap-3 text-red-500">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Error</p>
                  <p className="text-sm mt-1">{result?.error || generatedResult?.error}</p>
                </div>
              </div>
              <div className="flex justify-center mt-4 gap-3">
                <Button variant="secondary" onClick={() => { setResult(null); setGeneratedResult(null); }}>Retry</Button>
                {(result?.error || generatedResult?.error)?.includes('API key') && (
                  <Button onClick={() => setView('settings')} icon={Settings}>Configure Keys</Button>
                )}
              </div>
            </Card>
          )}

          {!result && !generatedResult && isUltrawide && (
            <Card className="flex-1 flex items-center justify-center min-h-64">
              <div className="text-center">
                {mode === 'generate' ? <FileText size={24} style={{ color: theme.textMuted }} className="mx-auto mb-3" /> : <FileInput size={24} style={{ color: theme.textMuted }} className="mx-auto mb-3" />}
                <p className="text-sm" style={{ color: theme.textMuted }}>Output will appear here</p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );

  // ============================================================================
  // VERSION UI COMPONENTS
  // ============================================================================

  const VersionBadge = ({ item }) => {
    const chain = getVersionChain(item.id, library as any);
    const vNum = item.versionNumber || '1.0';
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs px-1.5 py-0.5 font-mono" style={{ background: theme.tag, color: theme.textSecondary, borderRadius: '3px' }}>
          v{vNum}
        </span>
        {chain.length > 1 && (
          <span className="text-xs flex items-center gap-0.5" style={{ color: theme.textMuted }}>
            <GitBranch size={10} /> {chain.length}
          </span>
        )}
      </div>
    );
  };

  const VersionTimeline = ({ item }) => {
    const chain = getVersionChain(item.id, library as any);
    if (chain.length <= 1) return null;
    const [selectedForDiff, setSelectedForDiff] = useState<string[]>([]);

    const toggleDiffSelection = (id: string) => {
      setSelectedForDiff(prev => {
        if (prev.includes(id)) return prev.filter(x => x !== id);
        if (prev.length >= 2) return [prev[1], id];
        return [...prev, id];
      });
    };

    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium flex items-center gap-1.5" style={{ color: theme.textSecondary }}>
            <GitBranch size={13} /> Version History
          </h3>
          {selectedForDiff.length === 2 && (
            <button
              onClick={() => {
                const a = chain.find(c => c.id === selectedForDiff[0]);
                const b = chain.find(c => c.id === selectedForDiff[1]);
                if (a && b) handleCompareVersions(a, b);
              }}
              className="text-xs px-2 py-1 flex items-center gap-1 border transition-colors hover:opacity-80"
              style={{ borderColor: theme.inputBorder, color: theme.textSecondary, borderRadius: '3px' }}
            >
              <GitCompare size={11} /> Compare
            </button>
          )}
        </div>
        <div className="space-y-1">
          {chain.map((v, i) => (
            <div key={v.id}
              className="flex items-center gap-2 p-2 text-xs cursor-pointer transition-colors"
              style={{
                background: v.id === item.id ? theme.cardSelected : 'transparent',
                borderRadius: '3px',
                border: selectedForDiff.includes(v.id) ? `1px solid ${theme.accent}` : '1px solid transparent'
              }}
              onClick={() => setSelectedPrompt(v)}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: v.id === item.id ? theme.text : theme.textMuted }} />
              <div className="flex-1 min-w-0">
                <span className="font-mono" style={{ color: theme.textSecondary }}>v{v.versionNumber || '1.0'}</span>
                <span className="ml-2 truncate" style={{ color: theme.textMuted }}>{v.title}</span>
              </div>
              <span style={{ color: theme.textMuted }}>{new Date(v.createdAt).toLocaleDateString()}</span>
              <button
                onClick={(e) => { e.stopPropagation(); toggleDiffSelection(v.id); }}
                className="p-0.5 transition-colors hover:opacity-80"
                style={{ color: selectedForDiff.includes(v.id) ? theme.text : theme.textMuted }}
                title="Select for comparison"
              >
                <GitCompare size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const DiffView = () => {
    if (!showDiffView || !diffVersions) return null;
    const [older, newer] = diffVersions[0].createdAt <= diffVersions[1].createdAt ? diffVersions : [diffVersions[1], diffVersions[0]];
    const segments = computeLineDiff(older.refactoredPrompt || '', newer.refactoredPrompt || '');

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowDiffView(false)}>
        <div className="w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col" style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '6px' }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme.cardBorder }}>
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: theme.text }}>
              <GitCompare size={15} />
              v{older.versionNumber || '1.0'} &rarr; v{newer.versionNumber || '1.0'}
            </h2>
            <button onClick={() => setShowDiffView(false)} className="p-1 hover:opacity-80" style={{ color: theme.textMuted }}>
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <pre className="text-sm font-mono whitespace-pre-wrap" style={{ color: theme.textSecondary }}>
              {segments.map((seg, i) => (
                <span key={i} style={{
                  background: seg.type === 'added' ? (darkMode ? '#052e16' : '#dcfce7') :
                              seg.type === 'removed' ? (darkMode ? '#450a0a' : '#fee2e2') : 'transparent',
                  color: seg.type === 'added' ? (darkMode ? '#4ade80' : '#166534') :
                         seg.type === 'removed' ? (darkMode ? '#f87171' : '#991b1b') : theme.textSecondary,
                  textDecoration: seg.type === 'removed' ? 'line-through' : 'none'
                }}>{seg.text}</span>
              ))}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // CHRONICLE UI COMPONENTS
  // ============================================================================

  const ChroniclePanel = ({ item }) => {
    const entries: ChronicleEntry[] = item.chronicle || [];

    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium flex items-center gap-1.5" style={{ color: theme.textSecondary }}>
            <Shield size={13} /> Chronicle {entries.length > 0 && `(${entries.length})`}
          </h3>
          <button
            onClick={() => openCommitDialog(item.id)}
            className="text-xs px-2 py-1 flex items-center gap-1 border transition-colors hover:opacity-80"
            style={{ borderColor: theme.inputBorder, color: theme.textSecondary, borderRadius: '3px' }}
          >
            <Save size={11} /> Commit Snapshot
          </button>
        </div>
        {entries.length === 0 ? (
          <p className="text-xs" style={{ color: theme.textMuted }}>No chronicle entries yet. Commit a snapshot to start tracking changes.</p>
        ) : (
          <div className="space-y-1">
            {[...entries].reverse().map((entry, i) => (
              <div key={entry.hash} className="p-2 text-xs" style={{ background: i === 0 ? theme.cardSelected : 'transparent', borderRadius: '3px' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Hash size={10} className="flex-shrink-0" style={{ color: theme.textMuted }} />
                    <span className="font-mono flex-shrink-0" style={{ color: theme.textMuted }}>{entry.hash.substring(0, 8)}</span>
                    <span className="truncate" style={{ color: theme.textMuted }}>{new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => handleRollback(item, entry)}
                    className="p-0.5 transition-colors hover:opacity-80 flex-shrink-0"
                    style={{ color: theme.textMuted }}
                    title="Rollback to this snapshot"
                  >
                    <Undo2 size={11} />
                  </button>
                </div>
                {entry.note && (
                  <p className="mt-1 ml-5 truncate" style={{ color: theme.textSecondary }}>{entry.note}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const CommitDialog = () => {
    if (!showCommitDialog || !commitTargetId) return null;
    const item = library.find(p => p.id === commitTargetId);
    if (!item) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowCommitDialog(false)}>
        <div className="w-full max-w-md" style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '6px' }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme.cardBorder }}>
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: theme.text }}>
              <Shield size={15} /> Commit Chronicle Snapshot
            </h2>
            <button onClick={() => setShowCommitDialog(false)} className="p-1 hover:opacity-80" style={{ color: theme.textMuted }}>
              <X size={16} />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: theme.textSecondary }}>Version Note (optional)</label>
              <input
                type="text"
                value={commitNote}
                onChange={e => setCommitNote(e.target.value)}
                placeholder="Describe what changed..."
                className="w-full px-3 py-2 border outline-none text-sm"
                style={{ background: theme.input, borderColor: theme.inputBorder, color: theme.text, borderRadius: '4px' }}
                onKeyDown={e => { if (e.key === 'Enter') handleCommitChronicle(item, commitNote); }}
                autoFocus
              />
            </div>
            <div className="text-xs space-y-1" style={{ color: theme.textMuted }}>
              <p>This will create an immutable SHA-256 snapshot of:</p>
              <ul className="ml-3 list-disc">
                <li>Source prompt</li>
                <li>Template output</li>
                <li>Tags & category</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCommitDialog(false)}
                className="px-3 py-1.5 text-sm border transition-colors hover:opacity-80"
                style={{ borderColor: theme.inputBorder, color: theme.textSecondary, borderRadius: '4px' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleCommitChronicle(item, commitNote)}
                className="px-3 py-1.5 text-sm transition-colors hover:opacity-90 flex items-center gap-1.5"
                style={{ background: theme.text, color: theme.bg, borderRadius: '4px' }}
              >
                <Shield size={12} /> Commit
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // CollectionSidebar — collapsible left panel with collection tree
  // --------------------------------------------------------------------------
  const CollectionSidebar = () => {
    const [newColName, setNewColName] = useState('');
    const [creatingUnder, setCreatingUnder] = useState<string | undefined>(undefined);

    const handleCreate = async () => {
      const name = newColName.trim();
      if (!name) return;
      await createCollection(name, creatingUnder);
      setNewColName('');
      setCreatingUnder(undefined);
    };

    const renderTree = (parentId: string | undefined, depth: number) => {
      const children = getCollectionChildren(parentId);
      if (children.length === 0) return null;
      return (
        <div style={{ paddingLeft: depth > 0 ? 12 : 0 }}>
          {children.map(col => {
            const hasChildren = getCollectionChildren(col.id).length > 0;
            const isExpanded = expandedCollections.has(col.id);
            const isSelected = selectedCollectionId === col.id;
            const count = getItemCountForCollection(col.id);
            return (
              <div key={col.id}>
                <div
                  className="flex items-center gap-1.5 py-1.5 px-2 cursor-pointer transition-colors text-sm group"
                  style={{
                    background: isSelected ? theme.cardSelected : 'transparent',
                    color: isSelected ? theme.text : theme.textSecondary,
                    borderRadius: '4px',
                  }}
                  onClick={() => setSelectedCollectionId(isSelected ? null : col.id)}
                >
                  {hasChildren ? (
                    <button onClick={(e) => { e.stopPropagation(); toggleCollectionExpanded(col.id); }} className="p-0.5">
                      <ChevronRight size={12} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', color: theme.textMuted }} />
                    </button>
                  ) : <span style={{ width: 16 }} />}
                  <span style={{ fontSize: 13 }}>{col.icon || '📁'}</span>
                  <span className="flex-1 truncate">{col.name}</span>
                  <span className="text-xs opacity-60">{count}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCreatingUnder(col.id); }}
                    className="opacity-0 group-hover:opacity-60 hover:opacity-100 p-0.5 transition-opacity"
                    title="Add sub-collection"
                  >
                    <FolderPlus size={11} style={{ color: theme.textMuted }} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${col.name}"?`)) deleteCollection(col.id); }}
                    className="opacity-0 group-hover:opacity-60 hover:opacity-100 p-0.5 transition-opacity"
                    title="Delete collection"
                  >
                    <Trash2 size={11} style={{ color: theme.textMuted }} />
                  </button>
                </div>
                {hasChildren && isExpanded && renderTree(col.id, depth + 1)}
              </div>
            );
          })}
        </div>
      );
    };

    const allCount = library.length;
    const untaggedCount = library.filter(i => !i.collectionId).length;

    return (
      <div className="flex flex-col h-full overflow-hidden" style={{ minWidth: 180, maxWidth: 240 }}>
        <div className="flex items-center justify-between px-3 py-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.textMuted }}>Collections</span>
          <div className="flex gap-1">
            <button onClick={() => setShowTagManager(!showTagManager)} className="p-1 hover:opacity-80 transition-opacity" title="Manage tags">
              <TagIcon size={13} style={{ color: theme.textMuted }} />
            </button>
            <button onClick={() => setShowCollectionSidebar(false)} className="p-1 hover:opacity-80 transition-opacity" title="Hide sidebar">
              <PanelLeftClose size={13} style={{ color: theme.textMuted }} />
            </button>
          </div>
        </div>

        {/* Smart entries */}
        <div className="px-1 mb-2">
          <div
            className="flex items-center gap-2 py-1.5 px-2 cursor-pointer transition-colors text-sm"
            style={{ background: selectedCollectionId === null ? theme.cardSelected : 'transparent', color: selectedCollectionId === null ? theme.text : theme.textSecondary, borderRadius: '4px' }}
            onClick={() => setSelectedCollectionId(null)}
          >
            <Library size={13} />
            <span className="flex-1">All Prompts</span>
            <span className="text-xs opacity-60">{allCount}</span>
          </div>
          <div
            className="flex items-center gap-2 py-1.5 px-2 cursor-pointer transition-colors text-sm"
            style={{ background: selectedCollectionId === '__untagged__' ? theme.cardSelected : 'transparent', color: selectedCollectionId === '__untagged__' ? theme.text : theme.textSecondary, borderRadius: '4px' }}
            onClick={() => setSelectedCollectionId(selectedCollectionId === '__untagged__' ? null : '__untagged__')}
          >
            <FolderOpen size={13} />
            <span className="flex-1">Uncollected</span>
            <span className="text-xs opacity-60">{untaggedCount}</span>
          </div>
        </div>

        <div className="border-t mx-2 mb-2" style={{ borderColor: theme.cardBorder }} />

        {/* Tree */}
        <div className="flex-1 overflow-auto px-1">
          {renderTree(undefined, 0)}
          {collections.length === 0 && (
            <p className="text-xs px-3 py-2" style={{ color: theme.textMuted }}>No collections yet</p>
          )}
        </div>

        {/* Create input */}
        <div className="border-t p-2" style={{ borderColor: theme.cardBorder }}>
          {creatingUnder && (
            <p className="text-xs mb-1 truncate" style={{ color: theme.textMuted }}>
              Inside: {collections.find(c => c.id === creatingUnder)?.name || 'root'}
              <button onClick={() => setCreatingUnder(undefined)} className="ml-1 opacity-60 hover:opacity-100">✕</button>
            </p>
          )}
          <div className="flex gap-1">
            <input
              type="text" value={newColName} onChange={(e) => setNewColName(e.target.value)}
              placeholder="New collection…"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="flex-1 px-2 py-1 text-xs border outline-none"
              style={{ background: theme.input, borderColor: theme.inputBorder, color: theme.text, borderRadius: '3px' }}
            />
            <button onClick={handleCreate} disabled={!newColName.trim()} className="px-2 py-1 text-xs font-medium disabled:opacity-30 hover:opacity-80" style={{ background: theme.buttonPrimary, color: theme.buttonPrimaryText, borderRadius: '3px' }}>
              <Plus size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // TagManager — modal for creating, editing, and deleting tags
  // --------------------------------------------------------------------------
  const TagManager = () => {
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#6366f1');
    const [editingTag, setEditingTag] = useState<string | null>(null);

    const presetColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'];

    const handleCreateTag = async () => {
      const name = newTagName.trim();
      if (!name) return;
      await createTag(name, newTagColor);
      setNewTagName('');
      setNewTagColor('#6366f1');
    };

    if (!showTagManager) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowTagManager(false)}>
        <div className="w-full max-w-sm mx-4 p-4 border" style={{ background: theme.card, borderColor: theme.cardBorder, borderRadius: '8px' }} onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold" style={{ color: theme.text }}>Manage Tags</h3>
            <button onClick={() => setShowTagManager(false)} className="p-1 hover:opacity-80"><X size={14} style={{ color: theme.textMuted }} /></button>
          </div>

          {/* Existing tags */}
          <div className="space-y-1.5 mb-4 max-h-48 overflow-auto">
            {tags.length === 0 && <p className="text-xs py-2" style={{ color: theme.textMuted }}>No tags created yet</p>}
            {tags.map(t => (
              <div key={t.id} className="flex items-center gap-2 py-1.5 px-2 group" style={{ background: theme.accentBg, borderRadius: '4px' }}>
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.color }} />
                {editingTag === t.id ? (
                  <input
                    autoFocus
                    defaultValue={t.name}
                    className="flex-1 text-sm px-1 py-0.5 border outline-none"
                    style={{ background: theme.input, borderColor: theme.inputBorder, color: theme.text, borderRadius: '3px' }}
                    onBlur={(e) => { updateTag(t.id, { name: e.target.value.trim() || t.name }); setEditingTag(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
                  />
                ) : (
                  <span className="flex-1 text-sm truncate" style={{ color: theme.text }}>{t.name}</span>
                )}
                <span className="text-xs" style={{ color: theme.textMuted }}>{library.filter(i => i.tagIds?.includes(t.id)).length}</span>
                <button onClick={() => setEditingTag(t.id)} className="opacity-0 group-hover:opacity-60 hover:opacity-100 p-0.5"><Edit2 size={11} style={{ color: theme.textMuted }} /></button>
                <button onClick={() => { if (confirm(`Delete tag "${t.name}"?`)) deleteTag(t.id); }} className="opacity-0 group-hover:opacity-60 hover:opacity-100 p-0.5"><Trash2 size={11} style={{ color: theme.textMuted }} /></button>
              </div>
            ))}
          </div>

          {/* Create new */}
          <div className="border-t pt-3" style={{ borderColor: theme.cardBorder }}>
            <div className="flex gap-2 mb-2">
              <input type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="Tag name…"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                className="flex-1 px-2 py-1.5 text-sm border outline-none"
                style={{ background: theme.input, borderColor: theme.inputBorder, color: theme.text, borderRadius: '3px' }}
              />
              <button onClick={handleCreateTag} disabled={!newTagName.trim()} className="px-3 py-1.5 text-xs font-medium disabled:opacity-30 hover:opacity-80"
                style={{ background: theme.buttonPrimary, color: theme.buttonPrimaryText, borderRadius: '3px' }}>
                Add
              </button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {presetColors.map(c => (
                <button key={c} onClick={() => setNewTagColor(c)}
                  className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ background: c, borderColor: newTagColor === c ? theme.text : 'transparent' }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // ItemTagPills — inline tag display for library cards and detail panel
  // --------------------------------------------------------------------------
  const ItemTagPills = ({ item }: { item: LibraryItem }) => {
    if (!item.tagIds || item.tagIds.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1">
        {item.tagIds.map(tid => {
          const t = tags.find(tg => tg.id === tid);
          if (!t) return null;
          return (
            <span key={tid} className="px-1.5 py-0.5 text-xs font-medium" style={{ background: t.color + '22', color: t.color, borderRadius: '3px' }}>
              {t.name}
            </span>
          );
        })}
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // TagAssigner — dropdown to toggle tags on a selected item
  // --------------------------------------------------------------------------
  const TagAssigner = ({ item }: { item: LibraryItem }) => {
    const [open, setOpen] = useState(false);
    if (tags.length === 0) return null;
    return (
      <div className="relative">
        <button onClick={() => setOpen(!open)} className="p-1.5 transition-colors hover:opacity-80" style={{ color: theme.textMuted }} title="Assign tags">
          <TagIcon size={14} />
        </button>
        {open && (
          <div className="absolute right-0 top-8 z-40 w-48 border py-1 shadow-lg" style={{ background: theme.card, borderColor: theme.cardBorder, borderRadius: '6px' }}
            onMouseLeave={() => setOpen(false)}>
            {tags.map(t => {
              const active = item.tagIds?.includes(t.id);
              return (
                <button key={t.id} onClick={() => toggleItemTag(item.id, t.id)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:opacity-80 transition-opacity"
                  style={{ color: active ? theme.text : theme.textSecondary }}>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
                  <span className="flex-1 truncate">{t.name}</span>
                  {active && <Check size={12} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // CollectionAssigner — dropdown to assign item to a collection
  // --------------------------------------------------------------------------
  const CollectionAssigner = ({ item }: { item: LibraryItem }) => {
    const [open, setOpen] = useState(false);
    return (
      <div className="relative">
        <button onClick={() => setOpen(!open)} className="p-1.5 transition-colors hover:opacity-80" style={{ color: theme.textMuted }} title="Assign to collection">
          <Folder size={14} />
        </button>
        {open && (
          <div className="absolute right-0 top-8 z-40 w-52 border py-1 shadow-lg max-h-60 overflow-auto" style={{ background: theme.card, borderColor: theme.cardBorder, borderRadius: '6px' }}
            onMouseLeave={() => setOpen(false)}>
            <button onClick={() => { assignCollection(item.id, undefined); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:opacity-80"
              style={{ color: !item.collectionId ? theme.text : theme.textSecondary }}>
              <span>—</span><span className="flex-1">No Collection</span>
              {!item.collectionId && <Check size={12} />}
            </button>
            {collections.map(c => (
              <button key={c.id} onClick={() => { assignCollection(item.id, c.id); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:opacity-80"
                style={{ color: item.collectionId === c.id ? theme.text : theme.textSecondary }}>
                <span style={{ fontSize: 12 }}>{c.icon || '📁'}</span>
                <span className="flex-1 truncate">{c.name}</span>
                {item.collectionId === c.id && <Check size={12} />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // -- Filter helpers --
  const getActiveFilterCount = () => {
    let count = 0;
    if (filterProvider) count++;
    if (filterMode) count++;
    if (filterTagIds.length > 0) count++;
    if (filterHasVersions) count++;
    if (filterDateRange !== 'all') count++;
    return count;
  };

  const clearAllFilters = () => {
    setFilterProvider(null);
    setFilterMode(null);
    setFilterTagIds([]);
    setFilterHasVersions(false);
    setFilterDateRange('all');
  };

  const getDateCutoff = (range: string): Date | null => {
    if (range === 'all') return null;
    const now = new Date();
    if (range === 'today') { now.setHours(0, 0, 0, 0); return now; }
    if (range === 'week') { now.setDate(now.getDate() - 7); return now; }
    if (range === 'month') { now.setMonth(now.getMonth() - 1); return now; }
    return null;
  };

  // Get unique providers/modes from library for filter options
  const uniqueProviders = useMemo(() => {
    const set = new Set<string>();
    library.forEach(p => { if (p.processedWith?.provider) set.add(p.processedWith.provider); });
    return Array.from(set).sort();
  }, [library]);

  const uniqueModes = useMemo(() => {
    const set = new Set<string>();
    library.forEach(p => { if (p.processedWith?.mode) set.add(p.processedWith.mode); });
    return Array.from(set).sort();
  }, [library]);

  const FilterPanel = () => {
    const activeCount = getActiveFilterCount();
    const FilterChip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
      <button onClick={onClick} className="px-2.5 py-1 text-xs border transition-colors"
        style={{ background: active ? theme.cardSelected : 'transparent', borderColor: active ? theme.text : theme.inputBorder, color: active ? theme.text : theme.textSecondary, borderRadius: '12px' }}>
        {label}
      </button>
    );

    return (
      <div className="p-3 border mb-2 space-y-3" style={{ background: theme.card, borderColor: theme.cardBorder, borderRadius: '6px' }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: theme.textSecondary }}>Filters {activeCount > 0 && `(${activeCount})`}</span>
          {activeCount > 0 && (
            <button onClick={clearAllFilters} className="text-xs hover:opacity-80" style={{ color: theme.textMuted }}>Clear all</button>
          )}
        </div>

        {/* Sort */}
        <div>
          <span className="text-xs mb-1.5 block" style={{ color: theme.textMuted }}>Sort</span>
          <div className="flex gap-1.5 flex-wrap">
            <FilterChip label="Date" active={sortBy === 'date'} onClick={() => { setSortBy('date'); setSortDir(sortBy === 'date' ? (sortDir === 'desc' ? 'asc' : 'desc') : 'desc'); }} />
            <FilterChip label="Title" active={sortBy === 'title'} onClick={() => { setSortBy('title'); setSortDir(sortBy === 'title' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc'); }} />
            <FilterChip label="Complexity" active={sortBy === 'complexity'} onClick={() => { setSortBy('complexity'); setSortDir(sortBy === 'complexity' ? (sortDir === 'desc' ? 'asc' : 'desc') : 'desc'); }} />
            <button onClick={() => setSortDir(sortDir === 'desc' ? 'asc' : 'desc')} className="p-1 hover:opacity-80" title={sortDir === 'desc' ? 'Newest first' : 'Oldest first'}>
              <ArrowUpDown size={12} style={{ color: theme.textMuted, transform: sortDir === 'asc' ? 'scaleY(-1)' : 'none' }} />
            </button>
          </div>
        </div>

        {/* Provider filter */}
        {uniqueProviders.length > 1 && (
          <div>
            <span className="text-xs mb-1.5 block" style={{ color: theme.textMuted }}>Provider</span>
            <div className="flex gap-1.5 flex-wrap">
              {uniqueProviders.map(prov => (
                <FilterChip key={prov} label={prov} active={filterProvider === prov} onClick={() => setFilterProvider(filterProvider === prov ? null : prov)} />
              ))}
            </div>
          </div>
        )}

        {/* Mode filter */}
        {uniqueModes.length > 1 && (
          <div>
            <span className="text-xs mb-1.5 block" style={{ color: theme.textMuted }}>Mode</span>
            <div className="flex gap-1.5 flex-wrap">
              {uniqueModes.map(mode => (
                <FilterChip key={mode} label={mode} active={filterMode === mode} onClick={() => setFilterMode(filterMode === mode ? null : mode)} />
              ))}
            </div>
          </div>
        )}

        {/* Tag filter */}
        {tags.length > 0 && (
          <div>
            <span className="text-xs mb-1.5 block" style={{ color: theme.textMuted }}>Tags</span>
            <div className="flex gap-1.5 flex-wrap">
              {tags.map(t => (
                <button key={t.id} onClick={() => setFilterTagIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                  className="px-2.5 py-1 text-xs border transition-colors"
                  style={{ background: filterTagIds.includes(t.id) ? t.color + '33' : 'transparent', borderColor: filterTagIds.includes(t.id) ? t.color : theme.inputBorder, color: filterTagIds.includes(t.id) ? t.color : theme.textSecondary, borderRadius: '12px' }}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date range + has versions */}
        <div className="flex gap-4 flex-wrap">
          <div>
            <span className="text-xs mb-1.5 block" style={{ color: theme.textMuted }}>Date</span>
            <div className="flex gap-1.5 flex-wrap">
              {(['all', 'today', 'week', 'month'] as const).map(r => (
                <FilterChip key={r} label={r === 'all' ? 'Any' : r === 'today' ? 'Today' : r === 'week' ? 'This week' : 'This month'}
                  active={filterDateRange === r} onClick={() => setFilterDateRange(r)} />
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs mb-1.5 block" style={{ color: theme.textMuted }}>Other</span>
            <FilterChip label="Has versions" active={filterHasVersions} onClick={() => setFilterHasVersions(!filterHasVersions)} />
          </div>
        </div>
      </div>
    );
  };

  const LibraryView = () => {
    const q = searchQuery.toLowerCase();
    const dateCutoff = getDateCutoff(filterDateRange);

    const filtered = library.filter(p => {
      // Search: title, tags, category, prompt content
      const matchesSearch = !q || p.title?.toLowerCase().includes(q) ||
        p.tags?.some(t => t.toLowerCase().includes(q)) ||
        p.category?.toLowerCase().includes(q) ||
        p.originalPrompt?.toLowerCase().includes(q) ||
        p.refactoredPrompt?.toLowerCase().includes(q);
      const matchesFavorite = !showFavoritesOnly || favorites.has(p.id);
      const matchesCollection = selectedCollectionId === null
        ? true
        : selectedCollectionId === '__untagged__'
          ? !p.collectionId
          : p.collectionId === selectedCollectionId;
      const matchesProvider = !filterProvider || p.processedWith?.provider === filterProvider;
      const matchesMode = !filterMode || p.processedWith?.mode === filterMode;
      const matchesTags = filterTagIds.length === 0 || filterTagIds.every(tid => p.tagIds?.includes(tid));
      const matchesVersions = !filterHasVersions || (p.rootId || library.some(x => x.rootId === p.id));
      const matchesDate = !dateCutoff || new Date(p.createdAt) >= dateCutoff;
      return matchesSearch && matchesFavorite && matchesCollection && matchesProvider && matchesMode && matchesTags && matchesVersions && matchesDate;
    });

    // Sort
    const complexityOrder = { 'simple': 1, 'moderate': 2, 'complex': 3, 'expert': 4 };
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'title') {
        cmp = (a.title || '').localeCompare(b.title || '');
      } else if (sortBy === 'complexity') {
        cmp = (complexityOrder[a.complexity?.toLowerCase()] || 0) - (complexityOrder[b.complexity?.toLowerCase()] || 0);
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    const activeCollectionName = selectedCollectionId === null
      ? 'All Prompts'
      : selectedCollectionId === '__untagged__'
        ? 'Uncollected'
        : collections.find(c => c.id === selectedCollectionId)?.name || 'Collection';

    const activeFilterCount = getActiveFilterCount();

    return (
      <div className="flex h-full max-w-7xl mx-auto gap-0">
        {/* Collection sidebar */}
        {showCollectionSidebar && (
          <div className="hidden lg:block border-r flex-shrink-0" style={{ borderColor: theme.cardBorder }}>
            <CollectionSidebar />
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 px-4 min-w-0">
          {/* Prompt list */}
          <div className="lg:w-2/5 flex flex-col gap-3 min-w-0">
            <div className="flex gap-2 items-center">
              {!showCollectionSidebar && (
                <button onClick={() => setShowCollectionSidebar(true)} className="p-2 border transition-colors hover:opacity-80"
                  style={{ borderColor: theme.inputBorder, borderRadius: '4px' }} title="Show sidebar">
                  <PanelLeft size={14} style={{ color: theme.textMuted }} />
                </button>
              )}
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search prompts..."
                  className="w-full pl-9 pr-4 py-2 border outline-none transition-colors text-sm"
                  style={{ background: theme.input, borderColor: theme.inputBorder, color: theme.text, borderRadius: '4px' }} />
              </div>
              <button onClick={() => setShowFilterPanel(!showFilterPanel)}
                className="p-2 border transition-colors hover:opacity-80 relative"
                style={{ background: showFilterPanel ? theme.cardSelected : theme.input, borderColor: showFilterPanel || activeFilterCount > 0 ? theme.text : theme.inputBorder, borderRadius: '4px' }}
                title="Filters & Sort">
                <SlidersHorizontal size={14} style={{ color: showFilterPanel || activeFilterCount > 0 ? theme.text : theme.textMuted }} />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center text-[10px] font-bold"
                    style={{ background: theme.text, color: theme.bg, borderRadius: '50%' }}>{activeFilterCount}</span>
                )}
              </button>
              <button onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className="p-2 border transition-colors"
                style={{ background: showFavoritesOnly ? theme.cardSelected : theme.input, borderColor: showFavoritesOnly ? theme.text : theme.inputBorder, borderRadius: '4px' }}>
                <Star size={14} fill={showFavoritesOnly ? theme.text : 'none'} style={{ color: showFavoritesOnly ? theme.text : theme.textMuted }} />
              </button>
            </div>
            {showFilterPanel && <FilterPanel />}
            {selectedCollectionId !== null && (
              <div className="flex items-center gap-2 text-xs" style={{ color: theme.textSecondary }}>
                <Folder size={12} />
                <span className="font-medium">{activeCollectionName}</span>
                <span style={{ color: theme.textMuted }}>({filtered.length})</span>
                <button onClick={() => setSelectedCollectionId(null)} className="ml-auto hover:opacity-80"><X size={12} style={{ color: theme.textMuted }} /></button>
              </div>
            )}
            {/* Result count when filters active */}
            {(activeFilterCount > 0 || searchQuery) && selectedCollectionId === null && (
              <div className="text-xs" style={{ color: theme.textMuted }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</div>
            )}
            <div className="flex flex-col gap-2 overflow-auto max-h-[65vh]">
              {filtered.length === 0 ? (
                <div className="text-center py-12">
                  <FileText size={28} className="mx-auto mb-3" style={{ color: theme.textMuted }} />
                  <p className="text-sm" style={{ color: theme.textMuted }}>
                    {activeFilterCount > 0 || searchQuery ? 'No prompts match your filters' : showFavoritesOnly ? 'No favorites' : selectedCollectionId ? 'No prompts in this collection' : 'No prompts saved'}
                  </p>
                  {(activeFilterCount > 0 || searchQuery) && (
                    <button onClick={() => { clearAllFilters(); setSearchQuery(''); }} className="text-xs mt-2 hover:opacity-80" style={{ color: theme.textSecondary }}>Clear filters</button>
                  )}
                </div>
              ) : filtered.map(p => (
                <Card key={p.id} onClick={() => setSelectedPrompt(p)} selected={selectedPrompt?.id === p.id} padding={false} className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-medium text-sm line-clamp-2 flex-1" style={{ color: theme.text }}>{p.title}</h3>
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }} className="p-1 transition-colors hover:opacity-80">
                      <Star size={12} fill={favorites.has(p.id) ? theme.text : 'none'} style={{ color: favorites.has(p.id) ? theme.text : theme.textMuted }} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    <Tag>{p.category}</Tag>
                    {p.isGenerated && <Tag>Expanded</Tag>}
                  </div>
                  <ItemTagPills item={p} />
                  <div className="flex items-center justify-between text-xs mt-1.5" style={{ color: theme.textMuted }}>
                    <div className="flex items-center gap-1.5">
                      <Clock size={11} />
                      {new Date(p.createdAt).toLocaleDateString()}
                    </div>
                    <VersionBadge item={p} />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Detail panel */}
          <div className="lg:w-3/5 min-w-0">
            {selectedPrompt ? (
              <Card className="h-full overflow-auto">
                <div className="flex justify-between items-start gap-4 mb-3">
                  <h2 className="text-base font-semibold flex-1" style={{ color: theme.text }}>{selectedPrompt.title}</h2>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => handleReimport(selectedPrompt)} className="p-1.5 transition-colors hover:opacity-80" style={{ color: theme.textMuted }} title="Re-import & refine">
                      <RotateCcw size={14} />
                    </button>
                    <button onClick={() => handleDuplicate(selectedPrompt)} className="p-1.5 transition-colors hover:opacity-80" style={{ color: theme.textMuted }} title="Duplicate">
                      <CopyPlus size={14} />
                    </button>
                    <TagAssigner item={selectedPrompt} />
                    <CollectionAssigner item={selectedPrompt} />
                    <button onClick={() => toggleFavorite(selectedPrompt.id)} className="p-1.5 transition-colors hover:opacity-80"
                      style={{ color: favorites.has(selectedPrompt.id) ? theme.text : theme.textMuted }}>
                      <Star size={14} fill={favorites.has(selectedPrompt.id) ? theme.text : 'none'} />
                    </button>
                    <button onClick={() => deleteFromLibrary(selectedPrompt.id)} className="p-1.5 hover:text-red-500 transition-colors" style={{ color: theme.textMuted }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Tags and collection info */}
                <div className="flex flex-wrap gap-1.5 mb-1.5">{selectedPrompt.tags?.map(t => <Tag key={t}>{t}</Tag>)}</div>
                <div className="flex items-center gap-3 mb-4">
                  <ItemTagPills item={selectedPrompt} />
                  {selectedPrompt.collectionId && (() => {
                    const col = collections.find(c => c.id === selectedPrompt.collectionId);
                    return col ? (
                      <span className="flex items-center gap-1 text-xs" style={{ color: theme.textMuted }}>
                        <Folder size={11} />
                        {col.name}
                      </span>
                    ) : null;
                  })()}
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-medium" style={{ color: theme.textSecondary }}>{selectedPrompt.isGenerated ? 'Source Input' : 'Source Prompt'}</h3>
                      <CopyButton text={selectedPrompt.originalPrompt} field="orig" />
                    </div>
                    <pre className="text-sm p-3 whitespace-pre-wrap max-h-40 overflow-auto font-mono"
                      style={{ background: theme.codeBlock, color: theme.textSecondary, borderRadius: '4px' }}>{selectedPrompt.originalPrompt}</pre>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-medium" style={{ color: theme.textSecondary }}>{selectedPrompt.isGenerated ? 'Expanded Output' : 'Template Output'}</h3>
                      <CopyButton text={selectedPrompt.refactoredPrompt} field="ref" />
                    </div>
                    <pre className="text-sm p-3 whitespace-pre-wrap max-h-[400px] overflow-auto font-mono"
                      style={{ background: theme.codeBlock, color: theme.textSecondary, borderRadius: '4px' }}>{selectedPrompt.refactoredPrompt}</pre>
                  </div>
                </div>

                <VersionTimeline item={selectedPrompt} />
                <ChroniclePanel item={selectedPrompt} />
              </Card>
            ) : (
              <Card className="h-64 lg:h-full flex items-center justify-center">
                <div className="text-center">
                  <FileText size={28} className="mx-auto mb-3" style={{ color: theme.textMuted }} />
                  <p className="text-sm" style={{ color: theme.textMuted }}>Select a prompt to view</p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Tag Manager modal */}
        <TagManager />
      </div>
    );
  };

  const SettingsView = () => {
    const ApiKeyField = ({ provider, field, label, placeholder }) => {
      const value = providerKeys[provider]?.[field] || '';
      const isVisible = showApiKeys[`${provider}-${field}`];
      return (
        <div>
          <label className="block text-sm mb-1.5" style={{ color: theme.textSecondary }}>{label}</label>
          <div className="relative">
            <input type={isVisible ? 'text' : 'password'} value={value} 
              onChange={(e) => setProviderKeys({ ...providerKeys, [provider]: { ...providerKeys[provider], [field]: e.target.value } })}
              placeholder={placeholder} className="w-full px-3 py-2 pr-10 border outline-none text-sm"
              style={{ background: theme.input, borderColor: theme.inputBorder, color: theme.text, borderRadius: '4px' }} />
            <button onClick={() => setShowApiKeys({ ...showApiKeys, [`${provider}-${field}`]: !isVisible })}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: theme.textMuted }}>
              {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      );
    };

    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Key size={16} style={{ color: theme.text }} />
            <h2 className="text-base font-semibold" style={{ color: theme.text }}>API Keys</h2>
          </div>
          <p className="text-sm mb-6" style={{ color: theme.textMuted }}>Credentials stored locally in browser storage. Anthropic works natively in Claude.ai artifacts.</p>
          
          <div className="space-y-4">
            <div className="p-3 border" style={{ borderColor: theme.inputBorder, borderRadius: '4px' }}>
              <div className="flex items-center gap-2 mb-2">
                <Brain size={14} style={{ color: theme.textMuted }} />
                <h3 className="font-medium text-sm" style={{ color: theme.text }}>Anthropic</h3>
                <span className="text-xs px-2 py-0.5" style={{ background: '#dcfce7', color: '#166534', borderRadius: '2px' }}>Native support</span>
              </div>
              <p className="text-xs" style={{ color: theme.textMuted }}>Works automatically in Claude.ai artifacts - no API key needed.</p>
            </div>

            <div className="p-3 border" style={{ borderColor: theme.inputBorder, borderRadius: '4px' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap size={14} style={{ color: theme.textMuted }} />
                  <h3 className="font-medium text-sm" style={{ color: theme.text }}>Google AI</h3>
                </div>
                {providerKeys.google?.apiKey && <span className="text-xs px-2 py-0.5" style={{ background: '#dcfce7', color: '#166534', borderRadius: '2px' }}>Configured</span>}
              </div>
              <ApiKeyField provider="google" field="apiKey" label="API Key" placeholder="AIza..." />
              <p className="text-xs mt-2" style={{ color: theme.textMuted }}>Get your API key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a></p>
            </div>

            <div className="p-3 border" style={{ borderColor: theme.inputBorder, borderRadius: '4px' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Cpu size={14} style={{ color: theme.textMuted }} />
                  <h3 className="font-medium text-sm" style={{ color: theme.text }}>OpenAI</h3>
                </div>
                {providerKeys.openai?.apiKey && <span className="text-xs px-2 py-0.5" style={{ background: '#dcfce7', color: '#166534', borderRadius: '2px' }}>Configured</span>}
              </div>
              <div className="space-y-3">
                <ApiKeyField provider="openai" field="apiKey" label="API Key" placeholder="sk-..." />
                <ApiKeyField provider="openai" field="orgId" label="Organization ID (optional)" placeholder="org-..." />
              </div>
              <p className="text-xs mt-2" style={{ color: theme.textMuted }}>Get your API key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a></p>
            </div>

            <div className="p-3 border" style={{ borderColor: theme.inputBorder, borderRadius: '4px' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Server size={14} style={{ color: theme.textMuted }} />
                  <h3 className="font-medium text-sm" style={{ color: theme.text }}>Azure AI Foundry</h3>
                </div>
                {providerKeys.azure?.endpoint && providerKeys.azure?.apiKey && <span className="text-xs px-2 py-0.5" style={{ background: '#dcfce7', color: '#166534', borderRadius: '2px' }}>Configured</span>}
              </div>
              <div className="space-y-3">
                <ApiKeyField provider="azure" field="endpoint" label="Endpoint" placeholder="https://your-resource.openai.azure.com" />
                <ApiKeyField provider="azure" field="apiKey" label="API Key" placeholder="..." />
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: theme.textSecondary }}>API Version</label>
                  <input type="text" value={providerKeys.azure?.apiVersion || '2024-12-01-preview'} 
                    onChange={(e) => setProviderKeys({ ...providerKeys, azure: { ...providerKeys.azure, apiVersion: e.target.value } })}
                    className="w-full px-3 py-2 border outline-none text-sm"
                    style={{ background: theme.input, borderColor: theme.inputBorder, color: theme.text, borderRadius: '4px' }} />
                </div>
              </div>
            </div>
          </div>

          <Button className="w-full mt-6" onClick={() => { saveSettings({ providerKeys }); alert('API keys saved'); }}>Save API Keys</Button>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Server size={16} style={{ color: theme.text }} />
            <h2 className="text-base font-semibold" style={{ color: theme.text }}>Azure Deployments</h2>
          </div>
          
          <div className="space-y-2 mb-4">
            {azureDeployments.map((d, i) => (
              <div key={i} className="flex items-center gap-3 p-3" style={{ background: theme.codeBlock, borderRadius: '4px' }}>
                <Layers size={14} style={{ color: theme.textMuted }} />
                <div className="flex-1">
                  <p className="text-sm" style={{ color: theme.text }}>{d.name}</p>
                  <p className="text-xs" style={{ color: theme.textMuted }}>{d.id}</p>
                </div>
                <button onClick={() => {
                  const updated = azureDeployments.filter((_, idx) => idx !== i);
                  setAzureDeployments(updated);
                  saveSettings({ azureDeployments: updated });
                }} className="p-1.5 hover:text-red-500 transition-colors" style={{ color: theme.textMuted }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {azureDeployments.length === 0 && <p className="text-sm text-center py-4" style={{ color: theme.textMuted }}>No deployments</p>}
          </div>

          <div className="flex gap-2">
            <input type="text" value={newDeployment.name} onChange={(e) => setNewDeployment({ ...newDeployment, name: e.target.value })}
              placeholder="Display name" className="flex-1 px-3 py-2 border outline-none text-sm"
              style={{ background: theme.input, borderColor: theme.inputBorder, color: theme.text, borderRadius: '4px' }} />
            <input type="text" value={newDeployment.id} onChange={(e) => setNewDeployment({ ...newDeployment, id: e.target.value })}
              placeholder="Deployment ID" className="flex-1 px-3 py-2 border outline-none text-sm"
              style={{ background: theme.input, borderColor: theme.inputBorder, color: theme.text, borderRadius: '4px' }} />
            <Button size="sm" icon={Plus} onClick={() => {
              if (newDeployment.name && newDeployment.id) {
                const updated = [...azureDeployments, { ...newDeployment, description: 'Azure deployment' }];
                setAzureDeployments(updated);
                saveSettings({ azureDeployments: updated });
                setNewDeployment({ name: '', id: '' });
              }
            }}>Add</Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Export Workspace (.prb)</h2>
          <p className="text-xs mb-3" style={{ color: theme.textMuted }}>
            Export your entire workspace — {library.length} items, {collections.length} collections, {tags.length} tags — as a compressed .prb bundle.
          </p>
          <div className="flex items-center gap-3 mb-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs" style={{ color: theme.text }}>
              <input type="checkbox" checked={exportEncrypt} onChange={(e) => setExportEncrypt(e.target.checked)}
                style={{ accentColor: theme.buttonPrimary }} />
              <Lock size={12} /> Encrypt with password
            </label>
          </div>
          {exportEncrypt && (
            <input type="password" value={exportPassword} onChange={(e) => setExportPassword(e.target.value)}
              placeholder="Enter encryption password" className="w-full px-3 py-2 border outline-none text-sm mb-3"
              style={{ background: theme.input, borderColor: theme.inputBorder, color: theme.text, borderRadius: '4px' }} />
          )}
          <div className="flex gap-2">
            <Button icon={FileDown} onClick={handleExportBundle}
              disabled={exportEncrypt && !exportPassword}>Export Bundle</Button>
            <Button variant="secondary" icon={Download} onClick={() => {
              const blob = new Blob([JSON.stringify(library, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'prompt-library.json'; a.click();
            }}>Raw JSON</Button>
          </div>
          {exportStatus && (
            <p className="text-xs mt-2" style={{ color: exportStatus.includes('failed') ? '#ef4444' : '#10b981' }}>{exportStatus}</p>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Import Workspace (.prb)</h2>
          <p className="text-xs mb-3" style={{ color: theme.textMuted }}>
            Import a .prb bundle. Duplicate items (matching IDs) are skipped.
          </p>
          <div className="flex gap-2 mb-3">
            <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border transition-colors"
              style={{ background: theme.input, borderColor: theme.inputBorder, color: theme.text, borderRadius: '4px' }}>
              <FileUp size={14} />
              <span>Choose .prb file</span>
              <input type="file" accept=".prb,.json" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportBundle(file);
                e.target.value = '';
              }} />
            </label>
          </div>
          {showImportPassword && (
            <div className="flex gap-2 mb-3">
              <input type="password" value={importPassword} onChange={(e) => setImportPassword(e.target.value)}
                placeholder="Bundle password" className="flex-1 px-3 py-2 border outline-none text-sm"
                style={{ background: theme.input, borderColor: theme.inputBorder, color: theme.text, borderRadius: '4px' }} />
              <Button size="sm" icon={Lock} onClick={() => {
                if (pendingImportFile && importPassword) handleImportBundle(pendingImportFile, importPassword);
              }}>Decrypt</Button>
            </div>
          )}
          {importStatus && (
            <p className="text-xs" style={{ color: importStatus.includes('failed') || importStatus.includes('Failed') ? '#ef4444' : importStatus.includes('encrypted') ? '#f59e0b' : '#10b981' }}>{importStatus}</p>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Danger Zone</h2>
          <Button variant="ghost" icon={Trash2} onClick={async () => {
            if (confirm('Clear ALL data? This removes all prompts, collections, and tags. This cannot be undone.')) {
              setLibrary([]);
              setCollections([]);
              setTags([]);
              await (window as any).storage.delete('prompt-library-v3');
              await (window as any).storage.delete('prompt-chronicle-collections');
              await (window as any).storage.delete('prompt-chronicle-tags');
            }
          }}>Clear All Data</Button>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold" style={{ color: theme.text }}>Prompt Refinery</h2>
              <p className="text-sm" style={{ color: theme.textMuted }}>Twindevs v1.10</p>
            </div>
            <div className="flex items-center gap-2">
              {isUltrawide && <Tag>Ultrawide</Tag>}
              <Tag>{darkMode ? 'Dark' : 'Light'}</Tag>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const NavItem = ({ id, icon: Icon, label, active }) => (
    <button onClick={() => setView(id)}
      className="flex flex-col items-center gap-1 px-4 py-2 transition-colors duration-150"
      style={{ background: active ? theme.buttonPrimary : 'transparent', color: active ? theme.buttonPrimaryText : theme.textMuted, borderRadius: '4px' }}>
      <Icon size={16} strokeWidth={active ? 2 : 1.5} />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen pb-20" style={{ background: theme.bg }}>
      <DiffView />
      <CommitDialog />
      <div className="p-4 md:p-6 lg:p-8">
        {view === 'refine' && <RefineView />}
        {view === 'library' && <LibraryView />}
        {view === 'settings' && <SettingsView />}
      </div>

      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-1 p-1 border"
        style={{ background: theme.card, borderColor: theme.cardBorder, borderRadius: '6px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
        <NavItem id="refine" icon={FileInput} label="Process" active={view === 'refine'} />
        <NavItem id="library" icon={Library} label="Library" active={view === 'library'} />
        <NavItem id="settings" icon={Settings} label="Settings" active={view === 'settings'} />
      </nav>
    </div>
  );
}