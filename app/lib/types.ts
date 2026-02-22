// ============================================================================
// Prompt Chronicle — Type Definitions
// ============================================================================
// These interfaces serve as documentation and IDE hints for the zero-build
// CDN-based app. Vite transforms TSX at dev/build time; no runtime TS needed.
// ============================================================================


// ----------------------------------------------------------------------------
// Core — Processing Metadata
// ----------------------------------------------------------------------------

/** Provider/model/mode info attached when a prompt is processed. */
export interface ProcessedWith {
  provider: string;
  model: string;
  mode: string;
}


// ----------------------------------------------------------------------------
// Core — Library Item (Phase 1 + future phase extensions)
// ----------------------------------------------------------------------------

/** A saved prompt in the library — the central data model. */
export interface LibraryItem {
  /** Unique id: `${Date.now()}-${slugifiedTitle}` */
  id: string;
  title: string;
  originalPrompt: string;
  refactoredPrompt: string;
  category: string;
  complexity: string;
  tags: string[];
  /** ISO 8601 timestamp */
  createdAt: string;
  /** Semantic version string, e.g. "1.0" */
  version: string;
  processedWith: ProcessedWith;
  /** true when created via the "Generate" flow rather than "Refine" */
  isGenerated: boolean;

  // -- Phase 1: Version chain fields ----------------------------------------
  /** Id of the parent version this was derived from */
  parentId?: string;
  /** Id of the root item in the version chain */
  rootId?: string;
  /** "major.minor" format, e.g. "1.0", "1.1", "2.0" */
  versionNumber?: string;

  // -- Phase 2: SHA-256 Chronicle audit log ---------------------------------
  /** Ordered list of immutable chronicle entries (append-only) */
  chronicle?: ChronicleEntry[];
  /** Working changes before the next chronicle commit */
  stagedChanges?: Partial<LibraryItem>;

  // -- Phase 3: Organization ------------------------------------------------
  /** Collection (folder) this item belongs to */
  collectionId?: string;
  /** References to Tag ids for structured tagging */
  tagIds?: string[];
}


// ----------------------------------------------------------------------------
// Diff — Inline comparison segments
// ----------------------------------------------------------------------------

/** A single segment in an inline diff between two prompt versions. */
export interface DiffSegment {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}


// ----------------------------------------------------------------------------
// Phase 2 — SHA-256 Chronicle (immutable audit log)
// ----------------------------------------------------------------------------

/** Snapshot of the fields tracked by a chronicle entry. */
export interface ChronicleSnapshot {
  originalPrompt: string;
  refactoredPrompt: string;
  tags: string[];
  category: string;
}

/** A single immutable entry in a LibraryItem's chronicle. */
export interface ChronicleEntry {
  /** SHA-256 hex digest of the snapshot + parentHash */
  hash: string;
  /** ISO 8601 timestamp of when this entry was committed */
  timestamp: string;
  /** Optional human-readable commit note */
  note?: string;
  /** Hash of the previous chronicle entry (forms the chain) */
  parentHash?: string;
  /** The frozen field values at this point in time */
  snapshot: ChronicleSnapshot;
}


// ----------------------------------------------------------------------------
// Phase 3 — Collections & Tags
// ----------------------------------------------------------------------------

/** A user-created folder for organizing library items. */
export interface Collection {
  id: string;
  name: string;
  /** Parent collection id for nesting */
  parentId?: string;
  /** Hex color for the collection badge, e.g. "#6366f1" */
  color?: string;
  /** Emoji or icon identifier */
  icon?: string;
  /** ISO 8601 timestamp */
  createdAt: string;
}

/** A reusable tag with a fixed color. */
export interface Tag {
  id: string;
  name: string;
  /** Hex color for the tag pill, e.g. "#10b981" */
  color: string;
}

/** A dynamic collection whose membership is determined by a filter. */
export interface SmartCollection {
  id: string;
  name: string;
  /** Emoji or icon identifier */
  icon: string;
  filter: FilterCriteria;
}


// ----------------------------------------------------------------------------
// Phase 3/4 — Filtering & Search
// ----------------------------------------------------------------------------

/** Criteria used by smart collections, search, and advanced filters. */
export interface FilterCriteria {
  /** Free-text search query */
  query?: string;
  /** Tag ids to match */
  tags?: string[];
  /** Collection ids to match */
  collections?: string[];
  /** Provider names to match */
  providers?: string[];
  /** Processing mode names to match */
  modes?: string[];
  /** Date range filter (ISO 8601 strings) */
  dateRange?: {
    start?: string;
    end?: string;
  };
  /** Only items that have version history */
  hasVersions?: boolean;
  /** Only favorited items */
  isFavorite?: boolean;
}


// ----------------------------------------------------------------------------
// Phase 5 — PRB (Prompt Refinery Bundle) Import/Export
// ----------------------------------------------------------------------------

/** Serialized bundle format for exporting and importing library data. */
export interface PRBBundle {
  /** Bundle format version */
  version: '1.0';
  /** ISO 8601 timestamp of bundle creation */
  created: string;
  /** Number of LibraryItems in the bundle */
  itemCount: number;
  /** Whether the payload is AES-GCM encrypted */
  encrypted: boolean;
  /** Whether the payload is gzip compressed */
  compressed: boolean;
  /** Base64-encoded PBKDF2 salt (present when encrypted) */
  salt?: string;
  /** Base64-encoded AES-GCM IV (present when encrypted) */
  iv?: string;
  /** JSON string (possibly compressed/encrypted) of LibraryItem[] */
  payload: string;
}
