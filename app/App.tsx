import React, { useState, useEffect, useRef } from 'react';
import { FileInput, Library, Settings, Copy, Check, Trash2, Download, ChevronDown, Cpu, Brain, Zap, X, Search, FileText, Clock, Moon, Sun, Layers, Server, Plus, Star, Eye, EyeOff, Key, PenLine, RefreshCw, ArrowRight } from 'lucide-react';

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

const PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    icon: Brain,
    models: [
      { id: 'claude-opus-4-6-20251115', name: 'Claude Opus 4.6', description: 'Maximum intelligence for complex tasks' },
      { id: 'claude-sonnet-4-6-20251022', name: 'Claude Sonnet 4.6', description: 'Balance of intelligence, speed, and cost' },
    ],
    modes: [
      { id: 'standard', name: 'Standard', description: 'Direct response', config: {} },
      { id: 'thinking', name: 'Extended Thinking', description: '16K thinking budget', config: { thinking: { type: 'enabled', budget_tokens: 16000 } } },
      { id: 'deep_thinking', name: 'Deep Thinking', description: '32K thinking budget', config: { thinking: { type: 'enabled', budget_tokens: 32000 } } },
    ],
    endpoint: 'https://api.anthropic.com/v1/messages'
  },
  google: {
    name: 'Google',
    icon: Zap,
    models: [
      { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', description: 'State-of-the-art reasoning' },
      { id: 'gemini-3.1-flash', name: 'Gemini 3.1 Flash', description: 'Low-latency, high volume' },
    ],
    modes: [
      { id: 'standard', name: 'Standard', description: 'Direct response', config: {} },
      { id: 'thinking', name: 'Thinking', description: 'With reasoning', config: { thinking: true } },
    ],
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models'
  },
  openai: {
    name: 'OpenAI',
    icon: Cpu,
    models: [
      { id: 'gpt-5.2-pro-2025-12-11', name: 'GPT-5.2 Pro', description: 'Frontier model with reasoning' },
      { id: 'gpt-5.2-2025-12-11', name: 'GPT-5.2', description: 'High intelligence, optimized for speed' },
    ],
    modes: [
      { id: 'none', name: 'None', description: 'No reasoning (default)', config: {} },
      { id: 'low', name: 'Low', description: 'Minimal reasoning', config: { reasoning_effort: 'low' } },
      { id: 'medium', name: 'Medium', description: 'Balanced reasoning', config: { reasoning_effort: 'medium' } },
      { id: 'high', name: 'High', description: 'Deep reasoning', config: { reasoning_effort: 'high' } },
      { id: 'xhigh', name: 'XHigh', description: 'Maximum reasoning', config: { reasoning_effort: 'xhigh' } },
    ],
    endpoint: 'https://api.openai.com/v1/chat/completions'
  },
  azure: {
    name: 'Azure AI Foundry',
    icon: Server,
    models: [],
    modes: [
      { id: 'standard', name: 'Standard', description: 'Direct response', config: {} },
      { id: 'low', name: 'Low', description: 'Minimal reasoning', config: { reasoning_effort: 'low' } },
      { id: 'medium', name: 'Medium', description: 'Balanced reasoning', config: { reasoning_effort: 'medium' } },
      { id: 'high', name: 'High', description: 'Deep reasoning', config: { reasoning_effort: 'high' } },
    ],
    endpoint: '',
    configurable: true
  }
};

const DEFAULT_STORAGE_CONFIG = { type: 'browser', bucket: '', endpoint: '', apiKey: '' };
const DEFAULT_PROVIDER_KEYS = {
  anthropic: { apiKey: '' },
  google: { apiKey: '' },
  openai: { apiKey: '', orgId: '' },
  azure: { endpoint: '', apiKey: '', apiVersion: '2024-02-15-preview' }
};

const generateMetadata = (analysis: any) => ({
  title: analysis.title || '',
  alternativeTitles: analysis.alternativeTitles || [],
  category: analysis.category || 'General',
  complexity: analysis.complexity || 'Moderate',
  targetModel: analysis.targetModel || 'Claude 4.6',
  tags: analysis.tags || [],
  tone: analysis.tone || 'Technical',
  tokenEstimate: analysis.tokenEstimate || 0,
  createdAt: new Date().toISOString(),
  version: '1.0'
});

export default function PromptRefinery() {
  const [view, setView] = useState('refine');
  const [mode, setMode] = useState('refine');
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [generatedResult, setGeneratedResult] = useState<any>(null);
  const [library, setLibrary] = useState<any[]>([]);
  const [storageConfig, setStorageConfig] = useState(DEFAULT_STORAGE_CONFIG);
  const [providerKeys, setProviderKeys] = useState(DEFAULT_PROVIDER_KEYS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [isUltrawide, setIsUltrawide] = useState(false);
  
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [selectedModel, setSelectedModel] = useState<any>(PROVIDERS.anthropic.models[0]);
  const [selectedMode, setSelectedMode] = useState<any>(PROVIDERS.anthropic.modes[0]);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  
  const [azureDeployments, setAzureDeployments] = useState<any[]>([]);
  const [newDeployment, setNewDeployment] = useState({ name: '', id: '' });
  const [favorites, setFavorites] = useState(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [savedTitles, setSavedTitles] = useState(new Set());

  useEffect(() => {
    const checkUltrawide = () => setIsUltrawide(window.innerWidth / window.innerHeight >= 2.5);
    checkUltrawide();
    window.addEventListener('resize', checkUltrawide);
    return () => window.removeEventListener('resize', checkUltrawide);
  }, []);

  useEffect(() => { loadLibrary(); loadSettings(); }, []);

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

  const loadLibrary = async () => {
    try {
      const data = await (window as any).storage.get('prompt-library-v3');
      if (data?.value) setLibrary(JSON.parse(data.value));
    } catch (e) { console.log('No existing library'); }
  };

  const loadSettings = async () => {
    try {
      const data = await (window as any).storage.get('prompt-refinery-settings');
      if (data?.value) {
        const s = JSON.parse(data.value);
        if (s.darkMode !== undefined) setDarkMode(s.darkMode);
        if (s.providerKeys) setProviderKeys(s.providerKeys);
        if (s.azureDeployments) setAzureDeployments(s.azureDeployments);
        if (s.favorites) setFavorites(new Set(s.favorites));
      }
    } catch (e) {}
  };

  const saveSettings = async (updates = {}) => {
    const settings = { darkMode, providerKeys, azureDeployments, favorites: Array.from(favorites), ...updates };
    await (window as any).storage.set('prompt-refinery-settings', JSON.stringify(settings));
  };

  const toggleFavorite = async (id: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) newFavorites.delete(id);
    else newFavorites.add(id);
    setFavorites(newFavorites);
    await saveSettings({ favorites: Array.from(newFavorites) });
  };

  const saveToLibrary = async (item: any) => {
    const updated = [item, ...library];
    setLibrary(updated);
    await (window as any).storage.set('prompt-library-v3', JSON.stringify(updated));
  };

  const saveResultWithTitle = async (title: string, sourceResult: any, isGenerated: boolean) => {
    const itemId = `${Date.now()}-${title.substring(0, 20).replace(/\s/g, '-')}`;
    
    const item = {
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
    
    await saveToLibrary(item);
    setSavedTitles(prev => new Set([...prev, title]));
    return item;
  };

  const deleteFromLibrary = async (id: string) => {
    const updated = library.filter(p => p.id !== id);
    setLibrary(updated);
    await (window as any).storage.set('prompt-library-v3', JSON.stringify(updated));
    if (selectedPrompt?.id === id) setSelectedPrompt(null);
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    const provider = PROVIDERS[providerId as keyof typeof PROVIDERS];
    const models = providerId === 'azure' ? azureDeployments : provider.models;
    if (models.length > 0) setSelectedModel(models[0]);
    else setSelectedModel(null);
    setSelectedMode(provider.modes[0]);
  };

  const handleModelChange = (model: any) => {
    setSelectedModel(model);
    if (selectedProvider === 'openai') {
      if (model.id === 'gpt-5.2-pro-2025-12-11') {
        setSelectedMode(PROVIDERS.openai.modes.find(m => m.id === 'high'));
      } else {
        setSelectedMode(PROVIDERS.openai.modes.find(m => m.id === 'none'));
      }
    }
  };

  const getAvailableModels = () => selectedProvider === 'azure' ? azureDeployments : PROVIDERS[selectedProvider as keyof typeof PROVIDERS]?.models || [];

  const getAvailableModes = () => {
    const provider = PROVIDERS[selectedProvider as keyof typeof PROVIDERS];
    if (!provider) return [];
    
    if (selectedProvider === 'openai' && selectedModel) {
      if (selectedModel.id === 'gpt-5.2-pro-2025-12-11') {
        return provider.modes.filter(m => ['medium', 'high', 'xhigh'].includes(m.id));
      }
      // For standard GPT-5.2, default to none/low or all if applicable. 
      // Assuming standard might not have reasoning controls exposed or needed.
      return provider.modes;
    }
    
    return provider.modes;
  };

  // GENERATE MODE: Transform brief idea into comprehensive prompt
  const generatePrompt = async () => {
    if (!prompt.trim()) return;
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

Generate a comprehensive, detailed prompt that:
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
      // Simulation for demo purposes since we don't have real backend
      await new Promise(resolve => setTimeout(resolve, 2000));
      setProcessStep(2);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProcessStep(3);
      
      // Mock response
      const mockResponse = {
        title: "Advanced React Component Generator",
        titleRationale: "Captures the technical depth and specific output format required.",
        alternativeTitles: [
          { title: "React Component Architect", emphasis: "Focus on structure" },
          { title: "Frontend Code Synthesizer", emphasis: "Focus on generation" }
        ],
        category: "Coding",
        complexity: "Complex",
        estimatedTokens: 1200,
        tags: ["React", "TypeScript", "Frontend", "Architecture"],
        generatedPrompt: `You are a Senior React Engineer. Create a robust, production-ready React component based on the following requirements.\n\nRequirements:\n- Use TypeScript\n- Implement proper error handling\n- Use Tailwind CSS for styling\n\nInput: ${prompt}`,
        keyEnhancements: ["Added TypeScript requirement", "Specified error handling patterns", "Enforced Tailwind CSS"],
        usageNotes: "Best used with GPT-5.2 Pro or Claude Opus 4.6 for complex logic."
      };

      setGeneratedResult({
        id: Date.now().toString(),
        originalIdea: prompt,
        ...mockResponse,
        processedWith: { provider: PROVIDERS[selectedProvider as keyof typeof PROVIDERS].name, model: selectedModel.name, mode: 'Extended Thinking (16K)' }
      });
      setProcessStep(4);
    } catch (error: any) {
      console.error('Generation error:', error);
      setGeneratedResult({ error: error.message || 'Failed to process. Check console for details.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // REFINE MODE: Process existing detailed prompt
  const processPrompt = async () => {
    if (!prompt.trim() || !selectedModel) return;
    setIsProcessing(true);
    setProcessStep(1);
    setSavedTitles(new Set());

    try {
      // Simulation for demo purposes
      await new Promise(resolve => setTimeout(resolve, 2000));
      setProcessStep(2);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProcessStep(3);

      const mockAnalysis = {
        title: "Optimized System Prompt Template",
        alternativeTitles: [
          { title: "System Instruction Generator", bestFor: "Creating system prompts", reasoning: "Direct and clear" }
        ],
        recommendedReasoning: "This title clearly indicates the output format and purpose.",
        category: "System",
        complexity: "Moderate",
        targetModel: "Claude Sonnet 4.6",
        tags: ["System", "Template", "Optimization"],
        tone: "Technical",
        tokenEstimate: 800,
        refactoredPrompt: `You are an AI assistant. Your task is to: $TASK_DESCRIPTION.\n\nContext:\n$CONTEXT\n\nConstraints:\n$CONSTRAINTS\n\nOutput Format:\n$OUTPUT_FORMAT`
      };
      
      setResult({
        id: Date.now().toString(),
        originalPrompt: prompt,
        ...generateMetadata(mockAnalysis),
        refactoredPrompt: mockAnalysis.refactoredPrompt,
        alternativeTitles: mockAnalysis.alternativeTitles,
        recommendedReasoning: mockAnalysis.recommendedReasoning,
        processedWith: { provider: PROVIDERS[selectedProvider as keyof typeof PROVIDERS].name, model: selectedModel.name, mode: selectedMode.name }
      });
      setProcessStep(4);
    } catch (error: any) {
      console.error('Processing error:', error);
      setResult({ error: error.message || 'Failed to process. Check console for details.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const theme = {
    bg: darkMode ? '#09090b' : '#fafafa',
    bgGradient: darkMode ? 'linear-gradient(180deg, #09090b 0%, #18181b 100%)' : 'linear-gradient(180deg, #fafafa 0%, #f4f4f5 100%)',
    card: darkMode ? 'rgba(24, 24, 27, 0.9)' : 'rgba(255, 255, 255, 0.9)',
    cardBorder: darkMode ? 'rgba(63, 63, 70, 0.5)' : 'rgba(228, 228, 231, 1)',
    cardSelected: darkMode ? 'rgba(63, 63, 70, 0.4)' : 'rgba(244, 244, 245, 1)',
    text: darkMode ? '#fafafa' : '#09090b',
    textSecondary: darkMode ? '#a1a1aa' : '#52525b',
    textMuted: darkMode ? '#71717a' : '#a1a1aa',
    input: darkMode ? 'rgba(24, 24, 27, 0.9)' : 'rgba(255, 255, 255, 1)',
    inputBorder: darkMode ? 'rgba(63, 63, 70, 0.8)' : 'rgba(228, 228, 231, 1)',
    buttonPrimary: darkMode ? '#fafafa' : '#18181b',
    buttonPrimaryText: darkMode ? '#18181b' : '#fafafa',
    buttonSecondary: darkMode ? 'rgba(63, 63, 70, 0.5)' : 'rgba(244, 244, 245, 1)',
    tag: darkMode ? 'rgba(63, 63, 70, 0.6)' : 'rgba(244, 244, 245, 1)',
    codeBlock: darkMode ? 'rgba(24, 24, 27, 0.8)' : 'rgba(250, 250, 250, 1)',
    accent: darkMode ? '#a1a1aa' : '#52525b',
    accentBg: darkMode ? 'rgba(63, 63, 70, 0.3)' : 'rgba(244, 244, 245, 1)',
  };

  const GlassCard = ({ children, className = '', onClick, selected, padding = true }: any) => (
    <div onClick={onClick} className={`relative overflow-hidden rounded-xl border transition-all duration-200 ${onClick ? 'cursor-pointer' : ''} ${padding ? 'p-5' : ''} ${className}`}
      style={{
        background: selected ? theme.cardSelected : theme.card,
        borderColor: selected ? theme.text : theme.cardBorder,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
      }}>
      {children}
    </div>
  );

  const Button = ({ children, onClick, variant = 'primary', size = 'md', disabled, className = '', icon: Icon }: any) => {
    const base = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed";
    const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2', lg: 'px-6 py-3' };
    const variants = {
      primary: { background: theme.buttonPrimary, color: theme.buttonPrimaryText },
      secondary: { background: theme.buttonSecondary, color: theme.text },
      ghost: { background: 'transparent', color: theme.textSecondary }
    };
    return (
      <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size as keyof typeof sizes]} hover:opacity-80 active:scale-[0.98] ${className}`} style={variants[variant as keyof typeof variants]}>
        {Icon && <Icon size={size === 'sm' ? 14 : 15} />}
        {children}
      </button>
    );
  };

  const Tag = ({ children }: any) => (
    <span className="px-2 py-0.5 rounded text-xs font-medium" 
      style={{ background: theme.tag, color: theme.textSecondary }}>
      {children}
    </span>
  );

  const CopyButton = ({ text, field }: any) => (
    <button onClick={() => copyToClipboard(text, field)} 
      className="p-2 rounded-md transition-all duration-150 hover:opacity-70 active:scale-95"
      style={{ color: copiedField === field ? '#22c55e' : theme.textMuted }}>
      {copiedField === field ? <Check size={15} /> : <Copy size={15} />}
    </button>
  );

  const SaveableTitle = ({ title, sourceResult, isGenerated, variant = 'primary' }: any) => {
    const [isHovered, setIsHovered] = useState(false);
    const [justSaved, setJustSaved] = useState(false);
    const isSaved = savedTitles.has(title);
    
    const handleSave = async (e: any) => {
      e.stopPropagation();
      if (isSaved) return;
      
      await saveResultWithTitle(title, sourceResult, isGenerated);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    };
    
    const isPrimary = variant === 'primary';
    
    return (
      <div 
        className={`group relative flex items-start gap-2 rounded-lg transition-all duration-150 cursor-pointer ${isPrimary ? 'p-2 -m-2' : 'p-2'}`}
        style={{ 
          background: isHovered ? theme.cardSelected : (isPrimary ? 'transparent' : theme.codeBlock),
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

  const Dropdown = ({ show, onToggle, onClose, icon: Icon, label, sublabel, children }: any) => {
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
      if (!show) return;
      
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
          className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all hover:opacity-80"
          style={{ background: theme.input, borderColor: theme.inputBorder }}>
          {Icon && <Icon size={14} style={{ color: theme.textMuted }} />}
          <div className="text-left">
            <span className="text-sm" style={{ color: theme.text }}>{label}</span>
            {sublabel && <span className="text-xs ml-1" style={{ color: theme.textMuted }}>{sublabel}</span>}
          </div>
          <ChevronDown size={14} className={`transition-transform ${show ? 'rotate-180' : ''}`} style={{ color: theme.textMuted }} />
        </button>
        {show && (
          <div className="absolute top-full left-0 mt-2 w-64 rounded-lg border shadow-lg z-50 overflow-hidden"
            style={{ background: darkMode ? 'rgba(24, 24, 27, 0.98)' : 'rgba(255, 255, 255, 0.98)', borderColor: theme.cardBorder }}>
            {children}
          </div>
        )}
      </div>
    );
  };

  const ProgressIndicator = ({ step, isGenerate }: any) => {
    const steps = isGenerate ? ['Parsing input', 'Analyzing structure', 'Generating output', 'Complete'] : ['Analyzing', 'Extracting metadata', 'Formatting', 'Complete'];
    return (
      <div className="flex flex-col items-center gap-6 py-12">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: theme.inputBorder }} />
          <div className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: theme.text, borderTopColor: 'transparent' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            {isGenerate ? <PenLine size={20} style={{ color: theme.textSecondary }} /> : <Cpu size={20} style={{ color: theme.textSecondary }} />}
          </div>
        </div>
        <div className="text-center">
          <p className="text-base font-medium" style={{ color: theme.text }}>{steps[step - 1] || steps[0]}</p>
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>
            {isGenerate 
              ? 'Extended thinking enabled' 
              : `${PROVIDERS[selectedProvider as keyof typeof PROVIDERS]?.name || 'Provider'} · ${selectedModel?.name || 'Model'}${selectedMode?.config?.thinking ? ' · Thinking' : ''}`}
          </p>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full transition-all duration-300" 
              style={{ background: i <= step ? theme.text : theme.inputBorder }} />
          ))}
        </div>
      </div>
    );
  };

  const ModeToggle = () => (
    <div className="flex p-1 rounded-lg mb-4" style={{ background: theme.codeBlock }}>
      <button onClick={() => { setMode('refine'); setResult(null); setGeneratedResult(null); setSavedTitles(new Set()); }}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md transition-all"
        style={{ background: mode === 'refine' ? theme.buttonPrimary : 'transparent', color: mode === 'refine' ? theme.buttonPrimaryText : theme.textSecondary }}>
        <RefreshCw size={15} />
        <span className="font-medium text-sm">Templatize</span>
      </button>
      <button onClick={() => { setMode('generate'); setResult(null); setGeneratedResult(null); setSavedTitles(new Set()); }}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md transition-all"
        style={{ background: mode === 'generate' ? theme.buttonPrimary : 'transparent', color: mode === 'generate' ? theme.buttonPrimaryText : theme.textSecondary }}>
        <PenLine size={15} />
        <span className="font-medium text-sm">Expand</span>
      </button>
    </div>
  );

  const ProviderModelSelector = () => {
    const provider = PROVIDERS[selectedProvider as keyof typeof PROVIDERS];
    const ProviderIcon = provider.icon;

    const hasKey = (id: string) => {
      if (id === 'azure') {
        return providerKeys.azure?.apiKey && providerKeys.azure?.endpoint;
      }
      return !!(providerKeys as any)[id]?.apiKey;
    };

    return (
      <div className="flex flex-wrap gap-2 mb-4">
        <Dropdown show={showProviderDropdown} onToggle={toggleProviderDropdown} onClose={() => setShowProviderDropdown(false)} icon={ProviderIcon} label={provider.name}>
          <div className="px-3 py-2 border-b" style={{ borderColor: theme.inputBorder }}>
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: theme.textMuted }}>Provider</span>
          </div>
          {Object.entries(PROVIDERS).map(([id, p]) => (
            <button key={id} onClick={() => { handleProviderChange(id); setShowProviderDropdown(false); }}
              className="w-full flex items-center gap-3 px-3 py-3 transition-colors text-left hover:opacity-80"
              style={{ background: selectedProvider === id ? theme.cardSelected : 'transparent' }}>
              <p.icon size={16} style={{ color: theme.textMuted }} />
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium" style={{ color: theme.text }}>{p.name}</div>
                  {!hasKey(id) && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
                      No key
                    </span>
                  )}
                </div>
                <div className="text-xs" style={{ color: theme.textMuted }}>
                  {id === 'azure' ? `${azureDeployments.length} deployments` : `${p.models.length} models`}
                </div>
              </div>
            </button>
          ))}
        </Dropdown>

        <Dropdown show={showModelDropdown} onToggle={toggleModelDropdown} onClose={() => setShowModelDropdown(false)} icon={Layers} label={selectedModel?.name || 'Select Model'}>
          <div className="px-3 py-2 border-b" style={{ borderColor: theme.inputBorder }}>
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: theme.textMuted }}>Model</span>
          </div>
          {getAvailableModels().length === 0 ? (
            <div className="px-3 py-4 text-center" style={{ color: theme.textMuted }}>
              <p className="text-sm">No models configured</p>
            </div>
          ) : getAvailableModels().map((m: any) => (
            <button key={m.id} onClick={() => { handleModelChange(m); setShowModelDropdown(false); }}
              className="w-full flex items-start gap-3 px-3 py-3 transition-colors text-left hover:opacity-80"
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
            {getAvailableModes().map((m: any) => (
              <button key={m.id} onClick={() => { setSelectedMode(m); setShowModeDropdown(false); }}
                className="w-full flex items-start gap-3 px-3 py-3 transition-colors text-left hover:opacity-80"
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
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: theme.codeBlock, border: `1px solid ${theme.inputBorder}` }}>
            <Brain size={14} style={{ color: theme.textSecondary }} />
            <span className="text-sm" style={{ color: theme.textSecondary }}>Extended processing (10K thinking)</span>
          </div>
        )}

        <button onClick={() => { setDarkMode(!darkMode); saveSettings({ darkMode: !darkMode }); }}
          className="ml-auto p-2 rounded-lg border transition-all hover:opacity-80"
          style={{ background: theme.input, borderColor: theme.inputBorder }}>
          {darkMode ? <Sun size={15} style={{ color: theme.text }} /> : <Moon size={15} style={{ color: theme.text }} />}
        </button>
      </div>
    );
  };

  const RefineView = () => (
    <div className={`flex ${isUltrawide ? 'flex-row gap-6' : 'flex-col gap-6'} max-w-7xl mx-auto`}>
      <div className={isUltrawide ? 'w-1/3 flex flex-col gap-4' : 'w-full'}>
        {!isUltrawide && (
          <div className="text-center mb-2">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight" style={{ color: theme.text }}>
              Prompt Refinery <span className="font-normal text-lg" style={{ color: theme.textMuted }}>by Twindevs</span>
            </h1>
            <p className="mt-1" style={{ color: theme.textMuted }}>
              {mode === 'generate' ? 'Expand informal input into structured prompt specifications' : 'Convert detailed prompts into reusable template format'}
            </p>
          </div>
        )}

        <GlassCard>
          {isUltrawide && <h2 className="text-lg font-semibold mb-4" style={{ color: theme.text }}>Input <span className="font-normal text-sm" style={{ color: theme.textMuted }}>by Twindevs</span></h2>}
          
          <ModeToggle />
          <ProviderModelSelector />
          
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} 
            placeholder={mode === 'generate' 
              ? "Enter a brief task description or informal request..." 
              : "Paste a detailed prompt to convert into template format..."}
            className="w-full h-48 md:h-56 resize-none bg-transparent outline-none text-[15px] leading-relaxed"
            style={{ color: theme.text }} />
          
          <div className="flex flex-wrap justify-between items-center gap-3 mt-4 pt-4 border-t" style={{ borderColor: theme.inputBorder }}>
            <span className="text-sm" style={{ color: theme.textMuted }}>{prompt.length.toLocaleString()} chars</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPrompt('')} icon={X}>Clear</Button>
              {mode === 'generate' ? (
                <Button onClick={generatePrompt} disabled={!prompt.trim() || isProcessing} icon={ArrowRight}>
                  {isProcessing ? 'Processing...' : 'Expand'}
                </Button>
              ) : (
                <Button onClick={processPrompt} disabled={!prompt.trim() || isProcessing || !selectedModel} icon={ArrowRight}>
                  {isProcessing ? 'Processing...' : 'Process'}
                </Button>
              )}
            </div>
          </div>
        </GlassCard>

        {isProcessing && !isUltrawide && <GlassCard><ProgressIndicator step={processStep} isGenerate={mode === 'generate'} /></GlassCard>}
      </div>

      {(isUltrawide || result || generatedResult) && (
        <div className={isUltrawide ? 'w-2/3 flex flex-col gap-4 overflow-auto max-h-[85vh]' : 'w-full flex flex-col gap-4'}>
          {isUltrawide && <h2 className="text-lg font-semibold" style={{ color: theme.text }}>Results</h2>}
          
          {isProcessing && isUltrawide && <GlassCard><ProgressIndicator step={processStep} isGenerate={mode === 'generate'} /></GlassCard>}

          {/* GENERATE MODE RESULTS */}
          {generatedResult && !generatedResult.error && (
            <>
              <GlassCard>
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <PenLine size={16} style={{ color: theme.textSecondary }} />
                      <h2 className="text-base font-semibold" style={{ color: theme.text }}>Expanded Prompt</h2>
                    </div>
                    <p className="text-xs" style={{ color: theme.textMuted }}>
                      {generatedResult.processedWith?.provider} · Extended processing
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
                  <p className="text-sm p-3 rounded-lg mt-3" style={{ background: theme.codeBlock, color: theme.textSecondary }}>
                    {generatedResult.titleRationale}
                  </p>
                </div>

                {generatedResult.alternativeTitles?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: theme.textMuted }}>Alternative Titles</p>
                    <div className="space-y-1">
                      {generatedResult.alternativeTitles.map((alt: any, i: number) => (
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
                  {generatedResult.tags?.map((tag: string) => <Tag key={tag}>{tag}</Tag>)}
                </div>

                {generatedResult.keyEnhancements?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: theme.textMuted }}>Additions</p>
                    <ul className="space-y-1">
                      {generatedResult.keyEnhancements.map((e: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2" style={{ color: theme.textSecondary }}>
                          <span className="mt-1 w-1 h-1 rounded-full flex-shrink-0" style={{ background: theme.textMuted }} />
                          {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {generatedResult.usageNotes && (
                  <p className="text-sm p-3 rounded-lg" style={{ background: theme.codeBlock, color: theme.textSecondary }}>
                    <strong>Notes:</strong> {generatedResult.usageNotes}
                  </p>
                )}
              </GlassCard>

              <GlassCard>
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div>
                    <h2 className="text-base font-semibold" style={{ color: theme.text }}>Full Output</h2>
                    <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>~{generatedResult.estimatedTokens?.toLocaleString()} tokens</p>
                  </div>
                  <CopyButton text={generatedResult.generatedPrompt} field="generated" />
                </div>
                <pre className="whitespace-pre-wrap text-sm p-4 rounded-lg overflow-auto max-h-[500px] leading-relaxed font-mono"
                  style={{ background: theme.codeBlock, color: theme.textSecondary }}>
                  {generatedResult.generatedPrompt}
                </pre>
              </GlassCard>

              <div className="flex justify-center gap-3">
                <Button variant="secondary" onClick={() => { setGeneratedResult(null); setPrompt(''); setSavedTitles(new Set()); }}>Start Over</Button>
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
                }} icon={Library}>Save</Button>
              </div>
            </>
          )}

          {/* REFINE MODE RESULTS */}
          {result && !result.error && (
            <>
              <GlassCard>
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div className="flex-1">
                    <h2 className="text-base font-semibold" style={{ color: theme.text }}>Extracted Title</h2>
                    <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                      {result.processedWith?.provider} · {result.processedWith?.model} · {result.processedWith?.mode}
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
                  <p className="text-sm mt-3 p-3 rounded-lg" style={{ background: theme.codeBlock, color: theme.textSecondary }}>
                    <span className="font-medium">Rationale:</span> {result.recommendedReasoning}
                  </p>
                )}
                {result.alternativeTitles?.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide" style={{ color: theme.textMuted }}>Alternatives</p>
                    {result.alternativeTitles.map((alt: any, i: number) => (
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
              </GlassCard>

              <GlassCard>
                <div className="flex justify-between items-start gap-4 mb-4">
                  <h2 className="text-base font-semibold" style={{ color: theme.text }}>Metadata</h2>
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
                    <div key={label} className="p-3 rounded-lg" style={{ background: theme.codeBlock }}>
                      <p className="text-xs mb-0.5" style={{ color: theme.textMuted }}>{label}</p>
                      <p className="font-medium text-sm" style={{ color: theme.text }}>{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <p className="text-xs mb-2" style={{ color: theme.textMuted }}>Tags</p>
                  <div className="flex flex-wrap gap-1.5">{result.tags?.map((tag: string) => <Tag key={tag}>{tag}</Tag>)}</div>
                </div>
              </GlassCard>

              <GlassCard>
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div>
                    <h2 className="text-base font-semibold" style={{ color: theme.text }}>Template Output</h2>
                    <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>Parameterized for reuse</p>
                  </div>
                  <CopyButton text={result.refactoredPrompt} field="refactored" />
                </div>
                <pre className="whitespace-pre-wrap text-sm p-4 rounded-lg overflow-auto max-h-80 leading-relaxed font-mono"
                  style={{ background: theme.codeBlock, color: theme.textSecondary }}>
                  {result.refactoredPrompt}
                </pre>
              </GlassCard>

              <div className="flex justify-center gap-3">
                <Button variant="secondary" onClick={() => { setResult(null); setPrompt(''); setSavedTitles(new Set()); }}>Start Over</Button>
                <Button onClick={() => { 
                  saveToLibrary(result); 
                  setSavedTitles(prev => new Set([...prev, result.title]));
                  setView('library'); 
                }} icon={Library}>Save</Button>
              </div>
            </>
          )}

          {(result?.error || generatedResult?.error) && (
            <GlassCard>
              <p className="text-red-500 text-center">{result?.error || generatedResult?.error}</p>
              <div className="flex justify-center mt-4">
                <Button variant="secondary" onClick={() => { setResult(null); setGeneratedResult(null); }}>Try Again</Button>
              </div>
            </GlassCard>
          )}

          {!result && !generatedResult && isUltrawide && (
            <GlassCard className="flex-1 flex items-center justify-center min-h-64">
              <div className="text-center">
                {mode === 'generate' ? <PenLine size={28} style={{ color: theme.textMuted }} className="mx-auto mb-3" /> : <FileInput size={28} style={{ color: theme.textMuted }} className="mx-auto mb-3" />}
                <p style={{ color: theme.textMuted }}>Output will appear here</p>
              </div>
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );

  const LibraryView = () => {
    const filtered = library.filter(p => {
      const matchesSearch = p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFavorite = !showFavoritesOnly || favorites.has(p.id);
      return matchesSearch && matchesFavorite;
    });

    return (
      <div className="flex flex-col lg:flex-row gap-6 h-full max-w-6xl mx-auto">
        <div className="lg:w-2/5 flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border outline-none transition-colors text-sm"
                style={{ background: theme.input, borderColor: theme.inputBorder, color: theme.text }} />
            </div>
            <button onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className="px-3 py-2 rounded-lg border transition-all"
              style={{ background: showFavoritesOnly ? theme.cardSelected : theme.input, borderColor: showFavoritesOnly ? theme.text : theme.inputBorder }}>
              <Star size={15} fill={showFavoritesOnly ? theme.text : 'none'} style={{ color: showFavoritesOnly ? theme.text : theme.textMuted }} />
            </button>
          </div>
          <div className="flex flex-col gap-2 overflow-auto max-h-[65vh]">
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={32} className="mx-auto mb-3" style={{ color: theme.textMuted }} />
                <p className="text-sm" style={{ color: theme.textMuted }}>{showFavoritesOnly ? 'No favorite prompts' : 'No prompts saved'}</p>
              </div>
            ) : filtered.map(p => (
              <GlassCard key={p.id} onClick={() => setSelectedPrompt(p)} selected={selectedPrompt?.id === p.id} padding={false} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-sm line-clamp-2 flex-1" style={{ color: theme.text }}>{p.title}</h3>
                  <button onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }} className="p-1 rounded transition-all hover:scale-110">
                    <Star size={13} fill={favorites.has(p.id) ? theme.text : 'none'} style={{ color: favorites.has(p.id) ? theme.text : theme.textMuted }} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <Tag>{p.category}</Tag>
                  {p.isGenerated && <Tag>Expanded</Tag>}
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: theme.textMuted }}>
                  <Clock size={12} />
                  {new Date(p.createdAt).toLocaleDateString()}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        <div className="lg:w-3/5">
          {selectedPrompt ? (
            <GlassCard className="h-full overflow-auto">
              <div className="flex justify-between items-start gap-4 mb-4">
                <h2 className="text-lg font-semibold flex-1" style={{ color: theme.text }}>{selectedPrompt.title}</h2>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleFavorite(selectedPrompt.id)} className="p-2 rounded-lg transition-all hover:scale-110"
                    style={{ color: favorites.has(selectedPrompt.id) ? theme.text : theme.textMuted }}>
                    <Star size={15} fill={favorites.has(selectedPrompt.id) ? theme.text : 'none'} />
                  </button>
                  <button onClick={() => deleteFromLibrary(selectedPrompt.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">{selectedPrompt.tags?.map((t: string) => <Tag key={t}>{t}</Tag>)}</div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium" style={{ color: theme.textSecondary }}>{selectedPrompt.isGenerated ? 'Source Input' : 'Source Prompt'}</h3>
                    <CopyButton text={selectedPrompt.originalPrompt} field="orig" />
                  </div>
                  <pre className="text-sm p-4 rounded-lg whitespace-pre-wrap max-h-40 overflow-auto font-mono"
                    style={{ background: theme.codeBlock, color: theme.textSecondary }}>{selectedPrompt.originalPrompt}</pre>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium" style={{ color: theme.textSecondary }}>{selectedPrompt.isGenerated ? 'Expanded Output' : 'Template Output'}</h3>
                    <CopyButton text={selectedPrompt.refactoredPrompt} field="ref" />
                  </div>
                  <pre className="text-sm p-4 rounded-lg whitespace-pre-wrap max-h-[400px] overflow-auto font-mono"
                    style={{ background: theme.codeBlock, color: theme.textSecondary }}>{selectedPrompt.refactoredPrompt}</pre>
                </div>
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="h-64 lg:h-full flex items-center justify-center">
              <div className="text-center">
                <FileText size={32} className="mx-auto mb-3" style={{ color: theme.textMuted }} />
                <p className="text-sm" style={{ color: theme.textMuted }}>Select a prompt to view</p>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    );
  };

  const SettingsView = () => {
    const ApiKeyField = ({ provider, field, label, placeholder }: any) => {
      const value = (providerKeys as any)[provider]?.[field] || '';
      const isVisible = showApiKeys[`${provider}-${field}`];
      return (
        <div>
          <label className="block text-sm mb-1.5" style={{ color: theme.textSecondary }}>{label}</label>
          <div className="relative">
            <input type={isVisible ? 'text' : 'password'} value={value} 
              onChange={(e) => setProviderKeys({ ...providerKeys, [provider]: { ...(providerKeys as any)[provider], [field]: e.target.value } })}
              placeholder={placeholder} className="w-full px-3 py-2 pr-10 rounded-lg border outline-none text-sm"
              style={{ background: theme.input, borderColor: theme.inputBorder, color: theme.text }} />
            <button onClick={() => setShowApiKeys({ ...showApiKeys, [`${provider}-${field}`]: !isVisible })}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded" style={{ color: theme.textMuted }}>
              {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      );
    };

    return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* API Keys */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Key size={16} style={{ color: theme.textSecondary }} />
          <h2 className="text-base font-semibold" style={{ color: theme.text }}>API Credentials</h2>
        </div>
        <p className="text-sm mb-6" style={{ color: theme.textMuted }}>Credentials stored locally in browser storage.</p>
        
        <div className="space-y-6">
          <div className="p-4 rounded-lg border" style={{ borderColor: theme.inputBorder }}>
              <div className="flex items-center gap-2 mb-3">
                <Brain size={15} style={{ color: theme.textMuted }} />
                <h3 className="font-medium text-sm" style={{ color: theme.text }}>Anthropic</h3>
              </div>
              <ApiKeyField provider="anthropic" field="apiKey" label="API Key" placeholder="sk-ant-..." />
            </div>

            <div className="p-4 rounded-lg border" style={{ borderColor: theme.inputBorder }}>
              <div className="flex items-center gap-2 mb-3">
                <Zap size={15} style={{ color: theme.textMuted }} />
                <h3 className="font-medium text-sm" style={{ color: theme.text }}>Google AI</h3>
              </div>
              <ApiKeyField provider="google" field="apiKey" label="API Key" placeholder="AIza..." />
            </div>

            <div className="p-4 rounded-lg border" style={{ borderColor: theme.inputBorder }}>
              <div className="flex items-center gap-2 mb-3">
                <Cpu size={15} style={{ color: theme.textMuted }} />
                <h3 className="font-medium text-sm" style={{ color: theme.text }}>OpenAI</h3>
              </div>
              <div className="space-y-3">
                <ApiKeyField provider="openai" field="apiKey" label="API Key" placeholder="sk-..." />
                <ApiKeyField provider="openai" field="orgId" label="Organization ID (optional)" placeholder="org-..." />
              </div>
            </div>

            <div className="p-4 rounded-lg border" style={{ borderColor: theme.inputBorder }}>
              <div className="flex items-center gap-2 mb-3">
                <Server size={15} style={{ color: theme.textMuted }} />
                <h3 className="font-medium text-sm" style={{ color: theme.text }}>Azure AI Foundry</h3>
              </div>
              <div className="space-y-3">
                <ApiKeyField provider="azure" field="endpoint" label="Endpoint" placeholder="https://your-resource.openai.azure.com" />
                <ApiKeyField provider="azure" field="apiKey" label="API Key" placeholder="..." />
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: theme.textSecondary }}>API Version</label>
                  <input type="text" value={providerKeys.azure?.apiVersion || '2024-02-15-preview'} 
                    onChange={(e) => setProviderKeys({ ...providerKeys, azure: { ...providerKeys.azure, apiVersion: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border outline-none text-sm"
                    style={{ background: theme.input, borderColor: theme.inputBorder, color: theme.text }} />
                </div>
              </div>
            </div>
        </div>

        <Button className="w-full mt-6" onClick={() => { saveSettings({ providerKeys }); alert('API keys saved'); }}>Save API Keys</Button>
      </GlassCard>

      {/* Azure Deployments */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Server size={16} style={{ color: theme.textSecondary }} />
          <h2 className="text-base font-semibold" style={{ color: theme.text }}>Azure AI Foundry Deployments</h2>
        </div>
        
        <div className="space-y-3 mb-4">
          {azureDeployments.map((d, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: theme.codeBlock }}>
                <Layers size={15} style={{ color: theme.textMuted }} />
                <div className="flex-1">
                  <p className="text-sm" style={{ color: theme.text }}>{d.name}</p>
                  <p className="text-xs" style={{ color: theme.textMuted }}>{d.id}</p>
                </div>
                <button onClick={() => {
                  const updated = azureDeployments.filter((_, idx) => idx !== i);
                  setAzureDeployments(updated);
                  saveSettings({ azureDeployments: updated });
                }} className="p-1.5 rounded hover:bg-red-500/10 text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          {azureDeployments.length === 0 && <p className="text-sm text-center py-4" style={{ color: theme.textMuted }}>No deployments</p>}
        </div>

        <div className="flex gap-2">
          <input type="text" value={newDeployment.name} onChange={(e) => setNewDeployment({ ...newDeployment, name: e.target.value })}
            placeholder="Display name" className="flex-1 px-3 py-2 rounded-lg border outline-none text-sm"
            style={{ background: theme.input, borderColor: theme.inputBorder, color: theme.text }} />
          <input type="text" value={newDeployment.id} onChange={(e) => setNewDeployment({ ...newDeployment, id: e.target.value })}
            placeholder="Deployment ID" className="flex-1 px-3 py-2 rounded-lg border outline-none text-sm"
            style={{ background: theme.input, borderColor: theme.inputBorder, color: theme.text }} />
          <Button size="sm" icon={Plus} onClick={() => {
            if (newDeployment.name && newDeployment.id) {
              const updated = [...azureDeployments, { ...newDeployment, description: 'Azure deployment' }];
              setAzureDeployments(updated);
              saveSettings({ azureDeployments: updated });
              setNewDeployment({ name: '', id: '' });
            }
          }}>Add</Button>
        </div>
      </GlassCard>

      {/* Data Management */}
      <GlassCard>
        <h2 className="text-base font-semibold mb-4" style={{ color: theme.text }}>Data</h2>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Download} onClick={() => {
            const blob = new Blob([JSON.stringify(library, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'prompt-library.json'; a.click();
          }}>Export</Button>
          <Button variant="ghost" icon={Trash2} onClick={async () => {
            if (confirm('Clear all saved prompts?')) {
              setLibrary([]);
              await (window as any).storage.delete('prompt-library-v3');
            }
          }}>Clear All</Button>
        </div>
      </GlassCard>

      {/* About */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: theme.text }}>Prompt Refinery</h2>
            <p className="text-sm" style={{ color: theme.textMuted }}>by Twindevs · v1.8</p>
          </div>
          <div className="flex items-center gap-2">
            {isUltrawide && <Tag>Ultrawide</Tag>}
            <Tag>{darkMode ? 'Dark' : 'Light'}</Tag>
          </div>
        </div>
      </GlassCard>
    </div>
  );
  };

  const NavItem = ({ id, icon: Icon, label, active }: any) => (
    <button onClick={() => setView(id)}
      className="flex flex-col items-center gap-1 px-5 py-2 rounded-lg transition-all duration-150"
      style={{ background: active ? theme.buttonPrimary : 'transparent', color: active ? theme.buttonPrimaryText : theme.textMuted }}>
      <Icon size={18} strokeWidth={active ? 2 : 1.5} />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen pb-24" style={{ background: theme.bgGradient }}>
      <div className="p-4 md:p-6 lg:p-8">
        {view === 'refine' && <RefineView />}
        {view === 'library' && <LibraryView />}
        {view === 'settings' && <SettingsView />}
      </div>

      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-1 p-1.5 rounded-xl border"
        style={{ background: theme.card, borderColor: theme.cardBorder, boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)' }}>
        <NavItem id="refine" icon={FileInput} label="Process" active={view === 'refine'} />
        <NavItem id="library" icon={Library} label="Library" active={view === 'library'} />
        <NavItem id="settings" icon={Settings} label="Settings" active={view === 'settings'} />
      </nav>
    </div>
  );
}