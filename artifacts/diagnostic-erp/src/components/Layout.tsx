import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Activity,
  ShieldAlert,
  Usb,
  Users,
  FlaskConical,
  ClipboardList,
  CreditCard,
  BarChart3,
  Stethoscope,
  Menu,
  X,
  FilePen,
  Package,
  BookOpen,
  UserPlus,
  Settings2,
  KeyRound,
  Inbox,
  Plug,
  Tag,
  Ticket,
  Monitor,
  CalendarDays,
  Boxes,
  TrendingUp,
  TrendingDown,
  Zap,
  Fingerprint,
  Maximize2,
  Minimize2,
  FileText,
  Waypoints,
  LayoutTemplate,
  LogOut,
  AlertCircle,
  CheckCircle,
  Receipt,
  Server,
  Radio,
  Wrench,
  Globe,
  Download,
  ChevronRight,
  MessageSquare,
  ShoppingCart,
  BarChart2,
  Building2,
  IndianRupee,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  WifiOff,
  ScanSearch,
  Archive,
  Database,
  ShieldCheck,
  Terminal,
  Cpu,
  Search,
  Lock,
  Clock,
  HandCoins,
  ListChecks,
  Wallet,
  BrainCircuit,
  Landmark,
  TestTube,
  Network,
  DatabaseBackup,
  Waves,
  ActivitySquare,
  ClipboardCheck,
  Microscope,
  Eye,
  ScanLine,
  Workflow,
  ImagePlus,
  Scan,
  Keyboard,
  HardDrive,
  AlertTriangle,
  Send,
  Bell,
  Star,
  Heart,
  Baby,
  GraduationCap,
  Gauge,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { useServerFeatureFlags } from "@/hooks/useServerFeatureFlags";
import { useCareTime } from "@/hooks/useCareTime";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useGlobalScanner } from "@/hooks/useGlobalScanner";
import { api } from "@/lib/fetchApi";
import { isClinicPeakHours } from "@/lib/clinicPeakHours";
import { applyNameGenderExtras, parseNameGenderExtraList } from "@/lib/nameGender";
import { pickNameGenderExtra } from "@/components/NameGenderExtrasPanel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SyncPanel, SyncBadge } from "@/components/SyncPanel";
import { OfflineBillingSyncNotifier } from "@/components/OfflineBillingSyncNotifier";
import { ConnectivityStatusBanner } from "@/components/ConnectivityStatusBanner";
import GlobalCommandPalette from "@/components/GlobalCommandPalette";
import { isOnLanErpOrigin } from "@/lib/erpConnectivity";
import { readStaffSession, clearStaffSession, canAccess, FULL_ACCESS_ROLES, isFeatureEnabled, normalizeRole } from "@/lib/staffSession";
import { useUserTheme, clearUserTheme } from "@/lib/userTheme";
import { ThemeSelector } from "@/components/ThemeSelector";
import {
  getStoredUsbKey,
  storeUsbKey,
  clearUsbKey,
  verifyUsbKey,
  fetchUsbGateEnforced,
  onUsbKeyChange,
  readKeyFile,
  isFsAccessSupported,
  hasPairedPenDriveSync,
  preloadPairedDirHandle,
  beginPairPenDrive,
  unpairPenDrive,
  tryReadKeyFromPairedDir,
  beginEnsurePairedDirPermission,
  tryReadApiFromPairedDir,
  openSuperAdminPortal,
} from "@/lib/usbKey";
import { SIDEBAR_THEMES, DEFAULT_THEME, resolveTheme } from "@/lib/sidebarThemes";
import {
  capturePreFocusCollapsed,
  isReportingWorkspaceLocation,
  shouldRestoreSidebarAfterFocus,
} from "@/lib/reportingWorkspaceSidebarFocus";

type NavLeaf = { path: string; icon: typeof Zap; label: string; ownerOnly?: boolean; staffOnly?: boolean; featureFlag?: string };
// A subgroup nests one level inside a top-level NavGroup (e.g. "USG Reporting ▼"
// inside "Radiology & Imaging") — modality-specific submenus without a second
// top-level entry per modality. Subgroups don't nest further.
type NavSubGroup = { id: string; icon: typeof Zap; label: string; children: NavLeaf[] };
type NavChild = NavLeaf | NavSubGroup;
type NavGroup = { id: string; icon: typeof Zap; label: string; children: NavChild[] };
type NavEntry = NavLeaf | NavGroup;

const isGroup = (n: NavEntry): n is NavGroup => "children" in n;
const isSubGroup = (n: NavChild): n is NavSubGroup => "children" in n;
const childLeaves = (c: NavChild): NavLeaf[] => (isSubGroup(c) ? c.children : [c]);
// A few USG Reporting leaves point at the existing worklist/workspace pages
// with a `?modality=USG` query string (reuse, not a new route) — strip it
// before comparing against `location` (which carries no query string) so
// active-state highlighting still matches.
const pathOnly = (path: string) => path.split("?")[0];
const isLeafActive = (path: string, location: string) => {
  const p = pathOnly(path);
  return p === "/" ? location === "/" : location === p || location.startsWith(p + "/");
};

// Sidebar layout — flat items + collapsible groups. Routes/permissions are
// unchanged; only the visual grouping is consolidated to reduce clutter.
// Admin/integration/radiology-config pages live under Settings (hub tabs /
// Radiology Settings Center) so the left rail stays operational.
const navItems: NavEntry[] = [
  { path: "/", icon: Zap, label: "Billing Desk" },
  { path: "/my-daily-summary", icon: BarChart2, label: "My Daily Summary" },
  // Per-user drawer close — top-level so cashiers find it (not buried under Administration).
  // Owners don't hand over cash to themselves, so for admin/super_admin this is
  // replaced by the all-staff "Day Close" entry below.
  { path: "/my-day-close", icon: Lock, label: "My Day Close", staffOnly: true },
  { path: "/hope-referrals", icon: Inbox, label: "HOPE Referrals", featureFlag: "ff_hope_care_referrals" },
  {
    id: "billing-grp",
    icon: Receipt,
    label: "Billing & Payments",
    children: [
      { path: "/billing", icon: Receipt, label: "Bills" },
      { path: "/dues", icon: AlertCircle, label: "Due Payments" },
      { path: "/payments", icon: CreditCard, label: "Payments" },
      { path: "/payment-links", icon: Wallet, label: "Payment Links", featureFlag: "ff_online_payment_links" },
      { path: "/orders", icon: ClipboardList, label: "Orders" },
    ],
  },
  {
