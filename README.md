# Prompt Refinery by Twindevs

## Comprehensive Product Overview

**Version:** 1.9  
**Last Updated:** February 2026  
**Platform:** React Artifact (Claude.ai embedded application)  
**Developer:** Twindevs

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement & Value Proposition](#2-problem-statement--value-proposition)
3. [Use Cases](#3-use-cases)
4. [Features](#4-features)
5. [Technical Functionality](#5-technical-functionality)
6. [Architecture](#6-architecture)å
7. [Design System](#7-design-system)
8. [API Integration](#8-api-integration)
9. [Data Models & Storage](#9-data-models--storage)
10. [Security & Privacy](#10-security--privacy)
11. [Performance Considerations](#11-performance-considerations)
12. [Limitations & Constraints](#12-limitations--constraints)
13. [Version History](#13-version-history)
14. [Future Roadmap](#14-future-roadmap)

---

## 1. Executive Summary

**Prompt Refinery by Twindevs** is a specialized prompt engineering tool designed to transform how users create, manage, and optimize AI prompts. Operating as an embedded React application within Claude.ai, it provides two core processing modes: converting detailed, project-specific prompts into reusable templates (Templatize), and expanding brief ideas into comprehensive, production-grade prompts (Expand).

The application addresses the growing need for systematic prompt management in AI-assisted workflows, enabling users to build a personal library of refined prompts with rich metadata suitable for integration with knowledge management systems like Notion.

### Key Highlights

- **Dual Processing Modes**: Templatize existing prompts or expand brief ideas
- **Multi-Provider Support**: Anthropic, Google, OpenAI, and Azure AI Foundry
- **Persistent Library**: Save, search, favorite, and export prompts
- **Extended Thinking**: Leverage advanced reasoning capabilities across providers
- **Zero Backend Dependencies**: Runs entirely client-side with local storage

---

## 2. Problem Statement & Value Proposition

### The Problem

Modern AI workflows suffer from several prompt-related challenges:

1. **Prompt Sprawl**: Users accumulate ad-hoc prompts across conversations without organization
2. **Reinventing the Wheel**: Similar prompts are written repeatedly for similar tasks
3. **Inconsistent Quality**: Brief requests produce inconsistent AI outputs
4. **No Reusability**: Project-specific prompts can't be adapted for other contexts
5. **Metadata Absence**: Prompts lack categorization, making retrieval difficult

### The Solution

Prompt Refinery addresses these challenges through:

| Challenge | Solution |
|-----------|----------|
| Prompt Sprawl | Centralized library with search and favorites |
| Reinventing the Wheel | Templatized prompts with `$VARIABLE` placeholders |
| Inconsistent Quality | Expand mode generates comprehensive, structured prompts |
| No Reusability | Variable extraction enables cross-project adaptation |
| Metadata Absence | Automatic extraction of category, complexity, tags, tone |

### Value Proposition

> **Transform informal ideas into production-grade prompts, and convert detailed prompts into reusable templates—all while building a searchable, exportable prompt library.**

---

## 3. Use Cases

### 3.1 Primary Use Cases

#### Use Case 1: Prompt Template Creation
**Persona**: Senior Developer  
**Scenario**: Has a detailed debugging prompt for a specific OAuth implementation  
**Action**: Uses Templatize mode to extract variables and create a reusable template  
**Outcome**: Template with `$PROJECT_NAME`, `$AUTH_PROVIDER`, `$ERROR_MESSAGE` placeholders

#### Use Case 2: Idea Expansion
**Persona**: Product Manager  
**Scenario**: Has a brief idea: "help me create a smart home hub"  
**Action**: Uses Expand mode to generate comprehensive prompt  
**Outcome**: 2,500+ token prompt with architecture specs, tech stack, deliverables

#### Use Case 3: Prompt Library Management
**Persona**: Technical Writer  
**Scenario**: Needs to organize prompts for different documentation tasks  
**Action**: Saves prompts with categories, searches by tags, marks favorites  
**Outcome**: Organized, searchable collection of documentation prompts

#### Use Case 4: Cross-Provider Testing
**Persona**: AI Researcher  
**Scenario**: Wants to compare prompt performance across models  
**Action**: Processes same prompt through Anthropic, OpenAI, and Google  
**Outcome**: Results tagged with provider/model for comparison

### 3.2 Secondary Use Cases

- **Notion Integration**: Export prompts with metadata for database import
- **Team Collaboration**: Export/import JSON for sharing prompt libraries
- **Prompt Versioning**: Track prompt iterations through library history
- **Quality Standardization**: Use Expand mode to enforce prompt structure
- **Training Data Preparation**: Generate consistent prompt formats for fine-tuning

### 3.3 Industry Applications

| Industry | Application |
|----------|-------------|
| Software Development | Code review prompts, debugging templates, architecture specs |
| Content Marketing | Blog post structures, social media templates, SEO briefs |
| Legal | Contract analysis templates, compliance checklists |
| Education | Lesson plan generators, assessment rubric prompts |
| Healthcare | Patient summary templates, research protocol prompts |
| Finance | Investment analysis frameworks, risk assessment prompts |

---

## 4. Features

### 4.1 Core Processing Features

#### Templatize Mode
- Converts detailed, project-specific prompts into reusable templates
- Extracts variables with `$VARIABLE_NAME` placeholder syntax
- Generates variable documentation section
- Preserves original prompt structure and comprehensiveness
- Produces Notion-ready metadata

#### Expand Mode
- Transforms brief ideas into comprehensive prompts
- Adds YAML frontmatter where applicable
- Includes explicit deliverable specifications
- Defines quality gates and validation criteria
- Generates usage notes and customization guidance

### 4.2 Multi-Provider Support

| Provider | Models | Reasoning Modes |
|----------|--------|-----------------|
| **Anthropic** | Claude Sonnet 4.5, Haiku 4.5, Opus 4.5 | Standard, Extended Thinking (8K), Deep Thinking (16K) |
| **Google** | Gemini 2.5 Pro, 2.5 Flash, 2.0 Flash | Standard, Thinking |
| **OpenAI** | GPT-4.1, o3-mini, o1 | None, Low, Medium, High |
| **Azure AI Foundry** | Custom deployments | Standard, Low, Medium, High |

### 4.3 Library Management

- **Persistent Storage**: Prompts survive browser sessions
- **Search**: Filter by title, tags, or category
- **Favorites**: Star important prompts for quick access
- **Metadata Display**: Category, complexity, tags, timestamps
- **Source Tracking**: Original input preserved alongside output
- **Processing Attribution**: Provider, model, and mode recorded

### 4.4 Title Management

- **Primary Title**: AI-generated descriptive title
- **Alternative Titles**: 3 alternatives with emphasis descriptions
- **Rationale**: Explanation of why primary title was chosen
- **Save-by-Click**: Click any title to save prompt to library
- **Visual Feedback**: Hover states and "Saved" confirmation

### 4.5 Metadata Extraction

Automatically extracted fields:
- **Title**: Descriptive, comprehensive title
- **Category**: Coding, Writing, Analysis, Creative, Research, System, DevOps, Data, Design, Architecture
- **Complexity**: Simple, Moderate, Complex, Expert
- **Target Model**: Recommended AI model
- **Tags**: 5 relevant keywords
- **Tone**: Formal, Technical, Casual, Instructional, Analytical
- **Token Estimate**: Approximate token count

### 4.6 Settings & Configuration

- **API Key Management**: Secure storage for all providers
- **Key Visibility Toggle**: Show/hide sensitive credentials
- **Azure Deployment Manager**: Add/remove custom deployments
- **Dark/Light Mode**: System-aware theme toggle
- **Data Export**: JSON export of entire library
- **Data Management**: Clear all prompts option

### 4.7 User Experience Features

- **Ultrawide Detection**: Automatic split-layout for 32:9 monitors
- **Mobile Responsive**: Adapts to all screen sizes
- **Progress Indicators**: Step-by-step processing feedback
- **Copy Buttons**: One-click copying for all outputs
- **Character Counter**: Real-time input length display
- **Error Handling**: Descriptive error messages with action links

---

## 5. Technical Functionality

### 5.1 State Management

```javascript
// Core application state
const [view, setView] = useState('refine');           // Current view: refine | library | settings
const [mode, setMode] = useState('refine');           // Processing mode: refine | generate
const [prompt, setPrompt] = useState('');             // User input
const [isProcessing, setIsProcessing] = useState(false);
const [processStep, setProcessStep] = useState(0);    // Progress indicator: 0-4
const [result, setResult] = useState(null);           // Templatize output
const [generatedResult, setGeneratedResult] = useState(null); // Expand output
const [library, setLibrary] = useState([]);           // Saved prompts

// Provider configuration
const [providers, setProviders] = useState(DEFAULT_PROVIDERS);
const [selectedProvider, setSelectedProvider] = useState('anthropic');
const [selectedModel, setSelectedModel] = useState(/*...*/);
const [selectedMode, setSelectedMode] = useState(/*...*/);
const [providerKeys, setProviderKeys] = useState(DEFAULT_PROVIDER_KEYS);

// UI state
const [darkMode, setDarkMode] = useState(false);
const [isUltrawide, setIsUltrawide] = useState(false);
const [favorites, setFavorites] = useState(new Set());
const [savedTitles, setSavedTitles] = useState(new Set());
```

### 5.2 API Integration Architecture

```javascript
// Unified API dispatcher
const callProviderAPI = async (providerId, systemPrompt, model, modeConfig, providerKeys, maxTokens) => {
  switch (providerId) {
    case 'anthropic':
      return callAnthropicAPI(systemPrompt, model.id, modeConfig, maxTokens);
    case 'google':
      return callGoogleAPI(systemPrompt, model.id, modeConfig, providerKeys.google?.apiKey);
    case 'openai':
      return callOpenAIAPI(systemPrompt, model.id, modeConfig, providerKeys.openai?.apiKey, providerKeys.openai?.orgId);
    case 'azure':
      return callAzureAPI(systemPrompt, model.id, modeConfig, providerKeys.azure?.endpoint, providerKeys.azure?.apiKey, providerKeys.azure?.apiVersion);
  }
};
```

### 5.3 Provider-Specific Implementations

#### Anthropic (Native Support)
```javascript
const callAnthropicAPI = async (systemPrompt, modelId, modeConfig, maxTokens) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelId,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: systemPrompt }],
      ...modeConfig  // Includes thinking configuration
    })
  });
  // Response parsing...
};
```

#### Google Gemini
```javascript
const callGoogleAPI = async (systemPrompt, modelId, modeConfig, apiKey) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
        generationConfig: {
          maxOutputTokens: 16384,
          ...(modeConfig.thinkingConfig && { thinkingConfig: modeConfig.thinkingConfig })
        }
      })
    }
  );
  // Response parsing...
};
```

#### OpenAI
```javascript
const callOpenAIAPI = async (systemPrompt, modelId, modeConfig, apiKey, orgId) => {
  const isReasoningModel = modelId.startsWith('o1') || modelId.startsWith('o3');
  
  const requestBody = {
    model: modelId,
    max_completion_tokens: 16384,
    messages: isReasoningModel 
      ? [{ role: 'developer', content: '...' }, { role: 'user', content: systemPrompt }]
      : [{ role: 'system', content: '...' }, { role: 'user', content: systemPrompt }],
    ...(isReasoningModel && modeConfig.reasoning_effort && { reasoning_effort: modeConfig.reasoning_effort })
  };
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...(orgId && { 'OpenAI-Organization': orgId })
    },
    body: JSON.stringify(requestBody)
  });
  // Response parsing...
};
```

#### Azure OpenAI
```javascript
const callAzureAPI = async (systemPrompt, deploymentId, modeConfig, endpoint, apiKey, apiVersion) => {
  const url = `${endpoint}/openai/deployments/${deploymentId}/chat/completions?api-version=${apiVersion}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify({
      messages: [{ role: 'system', content: '...' }, { role: 'user', content: systemPrompt }],
      max_tokens: 16384,
      ...(modeConfig.reasoning_effort && { reasoning_effort: modeConfig.reasoning_effort })
    })
  });
  // Response parsing...
};
```

### 5.4 Extended Thinking Configuration

| Provider | Configuration | Budget Range |
|----------|---------------|--------------|
| Anthropic | `thinking: { type: 'enabled', budget_tokens: N }` | 8,000 - 50,000 |
| Google | `thinkingConfig: { thinkingBudget: N }` | 1,024 - 24,576 |
| OpenAI | `reasoning_effort: 'low' \| 'medium' \| 'high'` | Implicit |
| Azure | `reasoning_effort: 'low' \| 'medium' \| 'high'` | Implicit |

**Critical Constraint (Anthropic)**: `max_tokens` must exceed `thinking.budget_tokens`

```javascript
const thinkingBudget = selectedMode.config?.thinking?.budget_tokens || 0;
const maxTokens = thinkingBudget > 0 ? thinkingBudget + 8000 : 16000;
```

### 5.5 Response Parsing

All providers return text that is parsed identically:

```javascript
// Clean markdown fences and parse JSON
const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
const analysis = JSON.parse(cleaned);
```

### 5.6 Storage Operations

```javascript
// Load from persistent storage
const loadLibrary = async () => {
  const data = await window.storage.get('prompt-library-v3');
  if (data?.value) setLibrary(JSON.parse(data.value));
};

// Save to persistent storage
const saveToLibrary = async (item) => {
  const updated = [item, ...library];
  setLibrary(updated);
  await window.storage.set('prompt-library-v3', JSON.stringify(updated));
};

// Settings persistence
const saveSettings = async (updates = {}) => {
  const settings = { darkMode, providerKeys, azureDeployments, favorites: Array.from(favorites), providers, lastSynced, ...updates };
  await window.storage.set('prompt-refinery-settings', JSON.stringify(settings));
};
```

### 5.7 Model-Specific Mode Filtering

```javascript
const getAvailableModes = () => {
  if (selectedProvider === 'openai' && selectedModel) {
    const isReasoningModel = selectedModel.id.startsWith('o1') || selectedModel.id.startsWith('o3');
    if (!isReasoningModel) {
      return provider.modes.filter(m => m.id === 'none');
    }
    return provider.modes.filter(m => m.id !== 'none');
  }
  return provider.modes;
};
```

### 5.8 API Key Validation

```javascript
const hasRequiredAPIKey = () => {
  switch (selectedProvider) {
    case 'anthropic': return true; // Native in Claude.ai
    case 'google': return !!providerKeys.google?.apiKey;
    case 'openai': return !!providerKeys.openai?.apiKey;
    case 'azure': return !!providerKeys.azure?.endpoint && !!providerKeys.azure?.apiKey;
    default: return false;
  }
};
```

---

## 6. Architecture

### 6.1 Component Hierarchy

```
PromptRefinery (Root)
├── RefineView
│   ├── ModeToggle
│   ├── ProviderModelSelector
│   │   └── Dropdown (×3: Provider, Model, Mode)
│   ├── APIKeyWarning
│   ├── TextArea (Input)
│   ├── ProgressIndicator
│   └── ResultCards
│       ├── SaveableTitle
│       ├── MetadataGrid
│       ├── TagList
│       └── CodeBlock (Template/Expanded output)
├── LibraryView
│   ├── SearchInput
│   ├── FavoritesToggle
│   ├── PromptList
│   │   └── GlassCard (per prompt)
│   └── PromptDetail
│       ├── TagList
│       ├── CodeBlock (Original)
│       └── CodeBlock (Processed)
├── SettingsView
│   ├── APIKeyCards (×4 providers)
│   │   └── ApiKeyField
│   ├── AzureDeploymentManager
│   ├── DataExportSection
│   └── AppInfoCard
└── NavBar
    └── NavItem (×3)
```

### 6.2 Data Flow

```
User Input → Mode Selection → Provider Selection → API Call
                                                      ↓
                                              Response Parsing
                                                      ↓
                                              State Update (result/generatedResult)
                                                      ↓
                                              UI Render (ResultCards)
                                                      ↓
                                              Save to Library (optional)
                                                      ↓
                                              Persist to Storage
```

### 6.3 Storage Architecture

```
window.storage
├── prompt-library-v3          // Array of saved prompts
└── prompt-refinery-settings   // Configuration object
    ├── darkMode               // boolean
    ├── providerKeys           // API credentials
    ├── azureDeployments       // Custom Azure models
    ├── favorites              // Array of prompt IDs
    ├── providers              // Provider configurations
    └── lastSynced             // ISO timestamp
```

---

## 7. Design System

### 7.1 Design Philosophy

Prompt Refinery follows a **utilitarian, technical aesthetic** that deliberately avoids common AI product tropes:

**Removed Elements:**
- Purple/pink gradients
- Sparkle emoji icons (✨)
- Overly rounded "pill" shapes
- Marketing language ("magic", "enhance", "intelligent", "transform")

**Implemented Elements:**
- Neutral zinc/gray palette
- Lucide icons (technical, consistent)
- Reduced border radius (lg/md instead of 2xl)
- Technical, direct copy

### 7.2 Color System

#### Light Mode
```javascript
{
  bg: '#fafafa',
  bgGradient: 'linear-gradient(180deg, #fafafa 0%, #f4f4f5 100%)',
  card: 'rgba(255, 255, 255, 0.9)',
  cardBorder: 'rgba(228, 228, 231, 1)',
  text: '#09090b',
  textSecondary: '#52525b',
  textMuted: '#a1a1aa',
  buttonPrimary: '#18181b',
  buttonPrimaryText: '#fafafa',
  codeBlock: 'rgba(250, 250, 250, 1)'
}
```

#### Dark Mode
```javascript
{
  bg: '#09090b',
  bgGradient: 'linear-gradient(180deg, #09090b 0%, #18181b 100%)',
  card: 'rgba(24, 24, 27, 0.9)',
  cardBorder: 'rgba(63, 63, 70, 0.5)',
  text: '#fafafa',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  buttonPrimary: '#fafafa',
  buttonPrimaryText: '#18181b',
  codeBlock: 'rgba(24, 24, 27, 0.8)'
}
```

### 7.3 Typography

- **Font Stack**: System fonts (no custom fonts loaded)
- **Headings**: `font-semibold`, sizes: 2xl (page), lg (section), base (card)
- **Body**: `text-sm` (14px), `leading-relaxed`
- **Code**: `font-mono`, `text-sm`
- **Labels**: `text-xs`, `font-medium`, `uppercase`, `tracking-wide`

### 7.4 Component Styles

#### GlassCard
```javascript
{
  background: 'rgba(255, 255, 255, 0.9)',  // Glassmorphic effect
  borderRadius: 'rounded-xl',              // 12px
  border: '1px solid rgba(228, 228, 231, 1)',
  padding: 'p-5',                          // 20px
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
}
```

#### Button
```javascript
// Primary
{ background: '#18181b', color: '#fafafa', borderRadius: 'rounded-lg' }

// Secondary
{ background: 'rgba(244, 244, 245, 1)', color: '#09090b' }

// Ghost
{ background: 'transparent', color: '#52525b' }
```

#### Tag
```javascript
{
  background: 'rgba(244, 244, 245, 1)',
  color: '#52525b',
  padding: 'px-2 py-0.5',
  borderRadius: 'rounded',
  fontSize: 'text-xs',
  fontWeight: 'font-medium'
}
```

### 7.5 Layout System

#### Standard Layout
- Max width: `max-w-7xl` (1280px)
- Horizontal padding: `p-4 md:p-6 lg:p-8`
- Gap: `gap-4` (cards), `gap-6` (sections)

#### Ultrawide Layout (32:9 detection)
```javascript
const checkUltrawide = () => setIsUltrawide(window.innerWidth / window.innerHeight >= 2.5);
```
- Input panel: `w-1/3`
- Results panel: `w-2/3`
- Layout: `flex-row gap-6`

#### Mobile Layout
- Single column
- Full width cards
- Reduced padding
- Bottom navigation

### 7.6 Iconography

All icons from **Lucide React** (https://lucide.dev):

| Context | Icon |
|---------|------|
| Templatize mode | `RefreshCw` |
| Expand mode | `PenLine` |
| Library | `Library` |
| Settings | `Settings` |
| Process | `FileInput` |
| Copy | `Copy` / `Check` |
| Delete | `Trash2` |
| Favorite | `Star` |
| Anthropic | `Brain` |
| Google | `Zap` |
| OpenAI | `Cpu` |
| Azure | `Server` |
| API Key | `Key` |
| Dark mode | `Moon` / `Sun` |
| Dropdown | `ChevronDown` |
| Alert | `AlertCircle` |
| Loading | `Loader2` |

### 7.7 Animation & Transitions

```css
/* Standard transition */
transition-all duration-150

/* Hover states */
hover:opacity-80

/* Active states */
active:scale-[0.98]

/* Loading spinner */
animate-spin

/* Progress dots */
transition-all duration-300
```

### 7.8 Copy Guidelines

**DO:**
- "Expand informal input into structured prompt specifications"
- "Convert detailed prompts into reusable template format"
- "API key required. Configure in Settings."
- "Processing..." / "Complete"

**DON'T:**
- "Transform your ideas into powerful prompts"
- "Let AI work its magic"
- "Enhance your prompts intelligently"
- "Your smart assistant is thinking..."

---

## 8. API Integration

### 8.1 Endpoint Reference

| Provider | Endpoint | Auth Method |
|----------|----------|-------------|
| Anthropic | `https://api.anthropic.com/v1/messages` | Native (Claude.ai) |
| Google | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` | Query param `?key=` |
| OpenAI | `https://api.openai.com/v1/chat/completions` | Header `Authorization: Bearer` |
| Azure | `{endpoint}/openai/deployments/{id}/chat/completions?api-version={version}` | Header `api-key` |

### 8.2 Request/Response Formats

#### Anthropic Request
```json
{
  "model": "claude-sonnet-4-5-20250929",
  "max_tokens": 16000,
  "messages": [{ "role": "user", "content": "..." }],
  "thinking": { "type": "enabled", "budget_tokens": 8000 }
}
```

#### Google Request
```json
{
  "contents": [{ "role": "user", "parts": [{ "text": "..." }] }],
  "generationConfig": {
    "maxOutputTokens": 16384,
    "thinkingConfig": { "thinkingBudget": 8192 }
  }
}
```

#### OpenAI Request (o-series)
```json
{
  "model": "o3-mini-2025-01-31",
  "max_completion_tokens": 16384,
  "messages": [
    { "role": "developer", "content": "System instruction" },
    { "role": "user", "content": "..." }
  ],
  "reasoning_effort": "medium"
}
```

### 8.3 Error Handling

```javascript
// Provider-level errors
if (data.error) {
  throw new Error(data.error.message || 'Provider API error');
}

// Missing content
if (!text) {
  throw new Error('No content in API response');
}

// UI error display
{(result?.error || generatedResult?.error) && (
  <GlassCard>
    <AlertCircle /> {result?.error || generatedResult?.error}
    <Button onClick={() => setView('settings')}>Configure Keys</Button>
  </GlassCard>
)}
```

---

## 9. Data Models & Storage

### 9.1 Prompt Library Item

```typescript
interface LibraryItem {
  id: string;                    // Unique identifier (timestamp + slug)
  title: string;                 // Primary title
  originalPrompt: string;        // User's input
  refactoredPrompt: string;      // Processed output (template or expanded)
  category: Category;            // Enum: Coding, Writing, etc.
  complexity: Complexity;        // Enum: Simple, Moderate, Complex, Expert
  tags: string[];                // Array of 5 tags
  createdAt: string;             // ISO 8601 timestamp
  version: string;               // "1.0"
  processedWith: {
    provider: string;            // "Anthropic", "Google", etc.
    model: string;               // "Claude Sonnet 4.5", etc.
    mode: string;                // "Extended Thinking", etc.
  };
  isGenerated: boolean;          // true = Expand mode, false = Templatize
}
```

### 9.2 Settings Object

```typescript
interface Settings {
  darkMode: boolean;
  providerKeys: {
    anthropic: { apiKey: string };
    google: { apiKey: string };
    openai: { apiKey: string; orgId: string };
    azure: { endpoint: string; apiKey: string; apiVersion: string };
  };
  azureDeployments: Array<{ name: string; id: string; description: string }>;
  favorites: string[];           // Array of prompt IDs
  providers: ProviderConfig;     // Model lists per provider
  lastSynced: string | null;     // ISO timestamp
}
```

### 9.3 Processing Result (Templatize)

```typescript
interface TemplatizeResult {
  id: string;
  originalPrompt: string;
  title: string;
  alternativeTitles: Array<{
    title: string;
    bestFor: string;
    reasoning: string;
  }>;
  recommendedReasoning: string;
  category: Category;
  complexity: Complexity;
  targetModel: string;
  tags: string[];
  tone: Tone;
  tokenEstimate: number;
  refactoredPrompt: string;      // Template with $VARIABLES
  processedWith: ProcessingInfo;
}
```

### 9.4 Processing Result (Expand)

```typescript
interface ExpandResult {
  id: string;
  originalIdea: string;
  title: string;
  titleRationale: string;
  alternativeTitles: Array<{
    title: string;
    emphasis: string;
  }>;
  category: Category;
  complexity: Complexity;
  estimatedTokens: number;
  tags: string[];
  generatedPrompt: string;       // Full comprehensive prompt
  keyEnhancements: string[];
  usageNotes: string;
  processedWith: ProcessingInfo;
}
```

### 9.5 Storage Keys

| Key | Content | Max Size |
|-----|---------|----------|
| `prompt-library-v3` | JSON array of LibraryItems | ~5MB per key limit |
| `prompt-refinery-settings` | JSON Settings object | <100KB typical |

---

## 10. Security & Privacy

### 10.1 Data Handling

- **Local-First**: All data stored in browser via `window.storage` API
- **No Server**: No backend server, no data transmission to Twindevs
- **No Telemetry**: No analytics or usage tracking
- **No Account Required**: Fully functional without authentication

### 10.2 API Key Security

- **Local Storage**: Keys stored in browser, never transmitted elsewhere
- **Masked Display**: Password fields with show/hide toggle
- **No Logging**: Keys not logged to console
- **User Responsibility**: Users manage their own API key security

### 10.3 Data Transmission

| Destination | Data Sent | Purpose |
|-------------|-----------|---------|
| Anthropic API | Prompt content | Native processing in Claude.ai |
| Google API | Prompt content + API key | Gemini processing |
| OpenAI API | Prompt content + API key | GPT processing |
| Azure API | Prompt content + API key | Azure OpenAI processing |

### 10.4 Export Considerations

- **JSON Export**: Contains all prompts including potentially sensitive content
- **User Responsibility**: Exported files should be handled securely
- **No Encryption**: Exports are plain JSON

---

## 11. Performance Considerations

### 11.1 Bundle Size

- **React**: Included in artifact environment
- **Lucide Icons**: Tree-shaken, ~50KB
- **Total Component**: ~70KB minified

### 11.2 API Latency

| Provider | Typical Latency | With Thinking |
|----------|-----------------|---------------|
| Anthropic | 2-5s | 5-15s |
| Google | 2-4s | 4-10s |
| OpenAI | 2-6s | 5-20s (o-series) |
| Azure | 2-6s | Varies |

### 11.3 Storage Performance

- **Read**: Instant (in-memory after initial load)
- **Write**: <100ms (async, non-blocking)
- **Library Size**: Tested up to 500 prompts without degradation

### 11.4 Rendering Optimization

- **Conditional Rendering**: Views render only when active
- **Memoization**: Not currently implemented (opportunity for optimization)
- **Virtual Scrolling**: Not implemented (opportunity for large libraries)

---

## 12. Limitations & Constraints

### 12.1 Platform Constraints

- **Claude.ai Only**: Requires Claude.ai artifact environment
- **No localStorage**: Must use `window.storage` API
- **No Backend**: Cannot store data externally without user configuration
- **Single User**: No multi-user or collaboration features

### 12.2 API Constraints

- **Rate Limits**: Subject to each provider's rate limits
- **Token Limits**: Max ~16K output tokens per request
- **Thinking Budgets**: Provider-specific maximums
- **Cost**: Users bear API costs for non-Anthropic providers

### 12.3 Functional Constraints

- **No Import**: Cannot import JSON back into library (export only)
- **No Versioning**: Prompts cannot be edited/versioned after saving
- **No Folders**: Flat library structure (no hierarchical organization)
- **No Sorting**: Fixed chronological order (newest first)

### 12.4 Browser Constraints

- **Modern Browsers Only**: Requires ES2020+ support
- **Clipboard API**: Requires secure context (HTTPS)
- **Storage Limits**: ~5MB per key in `window.storage`

---

## 13. Version History

| Version | Date | Changes |
|---------|------|---------|
| **1.0** | Nov 2025 | Initial build with basic refine functionality |
| **1.1** | Nov 2025 | Added multi-provider support (UI only) |
| **1.2** | Dec 2025 | Added API keys config, favorites system |
| **1.3** | Dec 2025 | Added Expand (generate) mode with extended thinking |
| **1.4** | Dec 2025 | Neutralized UI (removed "AI toy" aesthetics) |
| **1.5** | Jan 2026 | Updated model IDs to accurate versions |
| **1.6** | Jan 2026 | Added save-by-clicking-title feature |
| **1.7** | Jan 2026 | Fixed thinking budget error handling |
| **1.8** | Jan 2026 | Fixed `max_tokens > budget_tokens` constraint |
| **1.9** | Feb 2026 | **Full multi-provider API integration** (Google, OpenAI, Azure) |

### Version 1.9 Highlights

- Implemented `callGoogleAPI()` with Gemini endpoint
- Implemented `callOpenAIAPI()` with o-series reasoning support
- Implemented `callAzureAPI()` with deployment routing
- Added unified `callProviderAPI()` dispatcher
- Added `hasRequiredAPIKey()` validation
- Added `<APIKeyWarning>` banner component
- Updated model IDs (gemini-2.5-pro, o3-mini, etc.)
- Enhanced Settings page with configuration status badges

---

## 14. Future Roadmap

### 14.1 Short-Term (v2.0)

- [ ] **Import Functionality**: Upload JSON to restore library
- [ ] **Sorting Options**: Sort by date, name, category, complexity
- [ ] **Duplicate/Clone**: Copy existing prompts for modification
- [ ] **Keyboard Shortcuts**: Cmd+Enter to process, Cmd+S to save
- [ ] **Bulk Operations**: Select multiple prompts for delete/export

### 14.2 Medium-Term (v2.x)

- [ ] **Folders/Categories**: Hierarchical organization
- [ ] **Prompt Versioning**: Edit history and version comparison
- [ ] **Templates Library**: Pre-built prompt templates
- [ ] **Direct Notion Export**: One-click Notion database integration
- [ ] **Prompt Sharing**: Generate shareable links

### 14.3 Long-Term (v3.0)

- [ ] **Standalone Application**: Electron or Tauri desktop app
- [ ] **Cloud Sync**: Optional Supabase/Firebase backend
- [ ] **Team Features**: Shared libraries, permissions
- [ ] **Analytics**: Prompt usage statistics, model comparison
- [ ] **AI-Powered Organization**: Auto-categorization and tagging

### 14.4 Experimental

- [ ] **Voice Input**: Dictate prompts for expansion
- [ ] **Multi-Language**: i18n support
- [ ] **Prompt Chaining**: Sequential prompt workflows
- [ ] **A/B Testing**: Compare outputs across models
- [ ] **Fine-Tuning Integration**: Export for model training

---

## Appendix A: System Prompts

### Templatize Mode System Prompt

```
You are a Prompt Refinery AI. Analyze the following prompt and return ONLY valid JSON (no markdown, no backticks, no explanation).

PROMPT TO ANALYZE:
"""
{user_input}
"""

Return this exact JSON structure:
{
  "title": "A clear, descriptive title for this prompt",
  "alternativeTitles": [...],
  "recommendedReasoning": "Why the main title is recommended",
  "category": "One of: Coding, Writing, Analysis, Creative, Research, System, DevOps, Data, Design",
  "complexity": "One of: Simple, Moderate, Complex",
  "targetModel": "Best AI model for this prompt",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "tone": "One of: Formal, Technical, Casual, Instructional, Analytical",
  "tokenEstimate": 1500,
  "refactoredPrompt": "A generalized, templatized version with $VARIABLE_NAME placeholders..."
}
```

### Expand Mode System Prompt

```
You are an elite Prompt Engineer at Twindevs. Your task is to transform a user's brief, informal idea into a comprehensive, production-grade prompt...

USER'S BRIEF IDEA:
"""
{user_input}
"""

Generate a comprehensive, detailed prompt that:
1. Defines clear roles, context, and objectives
2. Specifies explicit deliverables with format requirements
3. Includes relevant constraints (technical, business, quality)
...

Return ONLY valid JSON:
{
  "title": "A comprehensive, descriptive title",
  "titleRationale": "2-3 sentences explaining why...",
  "alternativeTitles": [...],
  "category": "...",
  "complexity": "...",
  "estimatedTokens": 2500,
  "tags": [...],
  "generatedPrompt": "THE FULL COMPREHENSIVE PROMPT TEXT HERE...",
  "keyEnhancements": [...],
  "usageNotes": "..."
}
```

---

## Appendix B: Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| React | 18.x | UI framework |
| lucide-react | 0.263.1 | Icon library |

### Development Dependencies

None (runs in Claude.ai artifact environment)

### External APIs

| API | Documentation |
|-----|---------------|
| Anthropic Messages | https://docs.anthropic.com/en/api/messages |
| Google Gemini | https://ai.google.dev/gemini-api/docs |
| OpenAI Chat Completions | https://platform.openai.com/docs/api-reference/chat |
| Azure OpenAI | https://learn.microsoft.com/en-us/azure/ai-services/openai/reference |

---

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Templatize** | Process of converting a specific prompt into a reusable template with variables |
| **Expand** | Process of transforming a brief idea into a comprehensive prompt |
| **Extended Thinking** | AI reasoning mode with explicit thinking budget allocation |
| **Thinking Budget** | Token allocation for AI's internal reasoning process |
| **Provider** | AI service provider (Anthropic, Google, OpenAI, Azure) |
| **Mode** | Processing configuration (Standard, Thinking, Reasoning levels) |
| **Deployment** | Azure-specific term for a configured model instance |
| **Artifact** | Claude.ai's embedded React application environment |
| **GlassCard** | UI component with glassmorphic styling |

---

*Document generated for Prompt Refinery by Twindevs v1.9*  
*Last updated: February 2026*
