// Consolidated icon exports to reduce bundle size
// Using only Feather Icons (fi) and Tabler Icons (tb) for consistency

import {
  // Navigation & UI
  Menu as FiMenu,
  X as FiX,
  ChevronLeft as FiChevronLeft,
  ChevronRight as FiChevronRight,
  ChevronDown as FiChevronDown,
  ChevronUp as FiChevronUp,
  ChevronsLeft as FiChevronsLeft,
  ChevronsRight as FiChevronsRight,
  ArrowRight as FiArrowRight,
  ArrowLeft as FiArrowLeft,
  Home as FiHome,

  // Actions
  Send as FiSend,
  Search as FiSearch,
  Filter as FiFilter,
  Edit as FiEdit,
  Pencil as FiEdit2,
  Pause as FiPause,
  Trash2 as FiTrash2,
  Copy as FiCopy,
  Check as FiCheck,
  Plus as FiPlus,
  Download as FiDownload,
  Upload as FiUpload,
  RefreshCw as FiRefreshCw,
  Save as FiSave,

  // Communication
  MessageSquare as FiMessageSquare,
  MessageCircle as FiMessageCircle,
  MessageCircleOff as FiMessageCircleOff,
  Mail as FiMail,

  // User & Auth
  User as FiUser,
  UserPlus as FiUserPlus,
  Users as FiUsers,
  Lock as FiLock,
  Eye as FiEye,
  EyeOff as FiEyeOff,
  LogOut as FiLogOut,

  // Status & Feedback
  CheckCircle as FiCheckCircle,
  XCircle as FiXCircle,
  AlertTriangle as FiAlertTriangle,
  AlertCircle as FiAlertCircle,
  BellOff as FiBellOff,
  Activity as FiActivity,
  Loader2 as FiLoader,

  // Media
  Volume2 as FiVolume2,

  // Media & Files
  Paperclip as FiPaperclip,
  Image as FiImage,
  File as FiFile,
  FilePlus as FiFilePlus,
  FileText as FiFileText,
  Cloud as FiCloud,

  // Layout
  Maximize2 as FiMaximize2,
  Minimize2 as FiMinimize2,
  Layers as FiLayers,
  LayoutGrid as FiGrid,
  List as FiList,

  // Admin & Management
  Settings as FiSettings,
  BarChart3 as FiBarChart,
  BarChart2 as FiBarChart2,
  PieChart as FiPieChart,
  Database as FiDatabase,
  Shield as FiShield,
  MoreVertical as FiMoreVertical,
  TrendingUp as FiTrendingUp,
  TrendingDown as FiTrendingDown,
  Key as FiKey,

  // Misc
  HelpCircle as FiHelpCircle,
  Clock as FiClock,
  Calendar as FiCalendar,
  Info as FiInfo,
  Sun as FiSun,
  Moon as FiMoon,
  BookOpen as FiBookOpen,
  Globe as FiGlobe,
  Slack as FiSlack,
  Tag as FiTag,
  Code as FiCode,
  ExternalLink as FiExternalLink,
  Server as FiServer,
  Target as FiTarget,
  Zap as FiZap,
  Play as FiPlay,
  Package as FiPackage,
  Star as FiStar,
  FolderPlus as FiFolderPlus,
  CreditCard as FiCreditCard,

  // Data & Flows
  Link as FiLink,
  GitBranch as FiGitBranch,

  // Toggles
  ToggleLeft as FiToggleLeft,
  ToggleRight as FiToggleRight,

  // Tabler-style aliases
  MessagesSquare as TbMessages,
  MessageCircle as TbMessageDots,
  MessageSquarePlus as TbMessagePlus,
  Bell as TbBell,
  UserPlus as TbUserPlus,
  ChevronLeft as TbChevronLeft,
  Trash as TbTrash,
  Search as TbSearch,
  Filter as TbFilterSearch,
  SlidersHorizontal as TbAdjustmentsHorizontal,
  Bot as TbRobot,
  Send as TbSend,
} from 'lucide-react';

const FiEdit3 = FiEdit2;

export {
  FiMenu,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiChevronUp,
  FiChevronsLeft,
  FiChevronsRight,
  FiArrowRight,
  FiArrowLeft,
  FiHome,
  FiSend,
  FiSearch,
  FiFilter,
  FiEdit,
  FiEdit2,
  FiEdit3,
  FiPause,
  FiTrash2,
  FiCopy,
  FiCheck,
  FiPlus,
  FiDownload,
  FiUpload,
  FiRefreshCw,
  FiSave,
  FiMessageSquare,
  FiMessageCircle,
  FiMessageCircleOff,
  FiMail,
  FiUser,
  FiUserPlus,
  FiUsers,
  FiLock,
  FiEye,
  FiEyeOff,
  FiLogOut,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiAlertCircle,
  FiBellOff,
  FiActivity,
  FiLoader,
  FiVolume2,
  FiPaperclip,
  FiImage,
  FiFile,
  FiFilePlus,
  FiFileText,
  FiCloud,
  FiMaximize2,
  FiMinimize2,
  FiLayers,
  FiGrid,
  FiList,
  FiSettings,
  FiBarChart,
  FiBarChart2,
  FiPieChart,
  FiDatabase,
  FiShield,
  FiMoreVertical,
  FiTrendingUp,
  FiTrendingDown,
  FiKey,
  FiHelpCircle,
  FiClock,
  FiCalendar,
  FiInfo,
  FiSun,
  FiMoon,
  FiBookOpen,
  FiGlobe,
  FiSlack,
  FiTag,
  FiCode,
  FiExternalLink,
  FiServer,
  FiTarget,
  FiZap,
  FiPlay,
  FiPackage,
  FiStar,
  FiFolderPlus,
  FiCreditCard,
  FiLink,
  FiGitBranch,
  FiToggleLeft,
  FiToggleRight,
  TbMessages,
  TbMessageDots,
  TbMessagePlus,
  TbBell,
  TbUserPlus,
  TbChevronLeft,
  TbTrash,
  TbSearch,
  TbFilterSearch,
  TbAdjustmentsHorizontal,
  TbRobot,
  TbSend,
};

// Custom icon mappings for replaced icons
// These provide alternatives using our consolidated icon sets
export const IconMappings = {
  // Replace HiOutlineOfficeBuilding with FiSettings (building concept)
  Building: FiSettings,
  
  // Replace BsArrowUp with FiArrowRight (directional)
  ArrowUp: FiArrowRight,
  
  // Replace BsEmojiSmile with FiMessageSquare (communication)
  Emoji: FiMessageSquare,
  
  // Replace BsLink45Deg with FiPaperclip (attachment concept)
  Link: FiPaperclip,
  
  // Replace BsMic with FiMessageSquare (voice input)
  Microphone: FiMessageSquare,
  
  // Replace HiOutlineLightBulb with FiInfo (information/idea)
  Lightbulb: FiInfo,
  
  // Replace BiBuildingHouse with FiUser (building/organization)
  BuildingHouse: FiUser,
  
  // Replace BiUser with FiUser (same concept)
  UserAlt: FiUser,
  
  // Replace BiCalendarCheck with FiCalendar (calendar concept)
  CalendarCheck: FiCalendar,
  
  // Replace IoMdList with FiMenu (list/menu concept)
  List: FiMenu
};