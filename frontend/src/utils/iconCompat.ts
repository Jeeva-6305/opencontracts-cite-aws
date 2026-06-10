/**
 * Icon compatibility layer for Semantic UI → Lucide migration.
 *
 * Provides an explicit KNOWN_ICONS map for the ~100 icons originally migrated
 * from SUI.  For dynamic resolution of the full Lucide catalog (used by the
 * icon picker and DynamicIcon), see `resolvePickerIcon.ts` in the icon-picker
 * feature directory.
 */

import type { LucideIcon } from "lucide-react";

import {
  Activity,
  AlertTriangle,
  AlignLeft,
  Archive,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  BarChart2,
  BarChart3,
  Bold,
  BookOpen,
  Bot,
  Bug,
  Cable,
  Calculator,
  Calendar,
  CalendarCheck,
  CalendarX,
  Check,
  CheckCircle,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Circle,
  CircleAlert,
  Clock,
  Cloud,
  CloudDownload,
  CloudUpload,
  Code,
  Cog,
  Copy,
  Cpu,
  Database,
  Download,
  Edit,
  Ellipsis,
  ExternalLink,
  Eye,
  EyeOff,
  Factory,
  FileArchive,
  FileText,
  Filter,
  Folder,
  FolderOpen,
  Forward,
  GitBranch,
  Globe,
  Grid3X3,
  Hash,
  HelpCircle,
  History,
  Home,
  Info,
  Italic,
  Layers,
  LayoutGrid,
  Lightbulb,
  Link,
  List,
  ListOrdered,
  Loader,
  Lock,
  Mail,
  MessageCircle,
  MessageSquare,
  Microscope,
  MousePointer,
  Pencil,
  Play,
  Plus,
  PlusCircle,
  Redo,
  RefreshCw,
  Save,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  StickyNote,
  Tag,
  Tags,
  Target,
  ThumbsUp,
  ToggleRight,
  Trash,
  Trash2,
  Trophy,
  Type,
  Undo,
  Upload,
  User,
  UserCircle,
  UserPlus,
  Users,
  X,
  XCircle,
  Zap,
} from "lucide-react";

/**
 * Map of known Lucide icon kebab-case names to their component.
 * This covers the original SUI-migrated icons with explicit imports.
 */
const KNOWN_ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  "alert-triangle": AlertTriangle,
  "align-left": AlignLeft,
  archive: Archive,
  "arrow-left": ArrowLeft,
  "arrow-left-right": ArrowLeftRight,
  "arrow-right": ArrowRight,
  "bar-chart-2": BarChart2,
  "bar-chart-3": BarChart3,
  bold: Bold,
  "book-open": BookOpen,
  bot: Bot,
  bug: Bug,
  cable: Cable,
  calculator: Calculator,
  calendar: Calendar,
  "calendar-check": CalendarCheck,
  "calendar-x": CalendarX,
  check: Check,
  "check-circle": CheckCircle,
  "check-square": CheckSquare,
  "chevron-down": ChevronDown,
  "chevron-up": ChevronUp,
  circle: Circle,
  "circle-alert": CircleAlert,
  clock: Clock,
  cloud: Cloud,
  "cloud-download": CloudDownload,
  "cloud-upload": CloudUpload,
  code: Code,
  cog: Cog,
  copy: Copy,
  cpu: Cpu,
  database: Database,
  download: Download,
  edit: Edit,
  ellipsis: Ellipsis,
  "external-link": ExternalLink,
  eye: Eye,
  "eye-off": EyeOff,
  factory: Factory,
  "file-archive": FileArchive,
  "file-text": FileText,
  filter: Filter,
  folder: Folder,
  "folder-open": FolderOpen,
  forward: Forward,
  "git-branch": GitBranch,
  globe: Globe,
  "grid-3x3": Grid3X3,
  hash: Hash,
  "help-circle": HelpCircle,
  history: History,
  home: Home,
  info: Info,
  italic: Italic,
  layers: Layers,
  "layout-grid": LayoutGrid,
  lightbulb: Lightbulb,
  link: Link,
  list: List,
  "list-ordered": ListOrdered,
  loader: Loader,
  lock: Lock,
  mail: Mail,
  "message-circle": MessageCircle,
  "message-square": MessageSquare,
  microscope: Microscope,
  "mouse-pointer": MousePointer,
  pencil: Pencil,
  play: Play,
  plus: Plus,
  "plus-circle": PlusCircle,
  redo: Redo,
  "refresh-cw": RefreshCw,
  save: Save,
  search: Search,
  settings: Settings,
  shield: Shield,
  sparkles: Sparkles,
  star: Star,
  "sticky-note": StickyNote,
  tag: Tag,
  tags: Tags,
  target: Target,
  "thumbs-up": ThumbsUp,
  "toggle-right": ToggleRight,
  trash: Trash,
  "trash-2": Trash2,
  trophy: Trophy,
  type: Type,
  undo: Undo,
  upload: Upload,
  user: User,
  "user-circle": UserCircle,
  "user-plus": UserPlus,
  users: Users,
  x: X,
  "x-circle": XCircle,
  zap: Zap,
};

/**
 * Mapping from Semantic UI icon names to Lucide kebab-case names.
 *
 * Entries are sorted alphabetically by SUI name.
 * Multiple SUI aliases may map to the same Lucide icon.
 */
export const SEMANTIC_TO_LUCIDE: Record<string, string> = {
  // A
  "align left": "align-left",
  "arrow left": "arrow-left",
  "arrow right": "arrow-right",

  // B
  book: "book-open",
  bot: "bot",
  box: "archive",
  bug: "bug",
  bullseye: "target",

  // C
  calculator: "calculator",
  calendar: "calendar",
  "calendar alternate outline": "calendar",
  "calendar check": "calendar-check",
  "calendar times": "calendar-x",
  cancel: "x-circle",
  "chart bar": "bar-chart-3",
  "chart line": "activity",
  check: "check",
  "check circle": "check-circle",
  "check square": "check-square",
  "check square outline": "check-square",
  checkmark: "check",
  "chevron down": "chevron-down",
  "chevron up": "chevron-up",
  circle: "circle",
  clock: "clock",
  "clock outline": "clock",
  close: "x",
  cloud: "cloud",
  "cloud download": "cloud-download",
  "cloud upload": "cloud-upload",
  code: "code",
  "code branch": "git-branch",
  cog: "cog",
  cogs: "settings",
  comment: "message-square",
  "comment alternate outline": "message-circle",
  comments: "message-square",
  computer: "cpu",
  conversation: "message-square",
  copy: "copy",

  // D
  database: "database",
  description: "file-text",
  "dot circle": "circle",
  download: "download",

  // E
  edit: "edit",
  "edit outline": "edit",
  envelope: "mail",
  "exclamation circle": "circle-alert",
  "exclamation triangle": "alert-triangle",
  exchange: "arrow-left-right",
  external: "external-link",
  eye: "eye",
  "eye slash": "eye-off",

  // F
  factory: "factory",
  file: "file-text",
  "file alternate outline": "file-text",
  "file archive": "file-archive",
  "file archive outline": "file-archive",
  "file outline": "file-text",
  "file pdf outline": "file-text",
  "file text": "file-text",
  filter: "filter",
  folder: "folder",
  "folder open": "folder-open",
  font: "type",
  fork: "git-branch",
  forward: "forward",

  // G
  globe: "globe",
  "grid layout": "layout-grid",

  // H
  hashtag: "hash",
  history: "history",
  home: "home",

  // I
  "info circle": "info",
  instructions: "file-text",

  // L
  "layer group": "layers",
  lightning: "zap",
  linkify: "link",
  list: "list",
  "list ul": "list",
  lock: "lock",

  // M
  magic: "sparkles",
  mail: "mail",
  marker: "tag",
  microchip: "cpu",
  "mouse pointer": "mouse-pointer",

  // P
  pencil: "pencil",
  play: "play",
  plus: "plus",

  // Q
  "question circle outline": "help-circle",

  // R
  redo: "redo",
  refresh: "refresh-cw",
  remove: "x",
  "remove circle": "x-circle",
  robots: "bot",

  // S
  save: "save",
  search: "search",
  settings: "settings",
  shield: "shield",
  "sort numeric down": "list-ordered",
  // SUI's "spinner" maps to Lucide's Loader icon
  spinner: "loader",
  star: "star",
  "sticky note outline": "sticky-note",

  // T
  table: "layout-grid",
  tag: "tag",
  tags: "tags",
  "thumbs up": "thumbs-up",
  times: "x",
  title: "type",
  "toggle on": "toggle-right",
  trash: "trash",
  "trash alternate outline": "trash-2",
  trophy: "trophy",

  // U
  undo: "undo",
  // SUI's upload icon visually includes a cloud, so cloud-upload is the closer match
  upload: "cloud-upload",
  user: "user",
  "user circle": "user-circle",
  "user plus": "user-plus",
  users: "users",

  // W
  warning: "alert-triangle",
  "warning circle": "circle-alert",
  "warning sign": "alert-triangle",

  // Z
  zip: "file-archive",
};

/**
 * Normalize an icon name: lowercase, trim, collapse whitespace.
 */
export function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Look up a Lucide icon component by its kebab-case name
 * in the explicit KNOWN_ICONS map.
 */
function lookupIcon(kebabName: string): LucideIcon | undefined {
  return KNOWN_ICONS[kebabName];
}

/**
 * Resolve a Semantic UI icon name to the equivalent Lucide kebab-case name.
 *
 * - If `name` is a known SUI name it is mapped to the Lucide equivalent.
 * - If `name` is already a valid Lucide kebab-case name it passes through.
 * - Otherwise returns `"help-circle"` (fallback).
 */
export function resolveIconName(name: string): string {
  const key = normalize(name);

  // Check SUI mapping first
  const mapped = SEMANTIC_TO_LUCIDE[key];
  if (mapped) return mapped;

  // Passthrough if already a known Lucide name (explicit or dynamic)
  if (lookupIcon(key)) return key;

  // Fallback
  return "help-circle";
}

/**
 * Resolve a Semantic UI or Lucide icon name to the actual Lucide component.
 *
 * Returns `HelpCircle` for any name that cannot be resolved.
 */
export function resolveIcon(name: string): LucideIcon {
  const lucideName = resolveIconName(name);
  return lookupIcon(lucideName) ?? HelpCircle;
}
