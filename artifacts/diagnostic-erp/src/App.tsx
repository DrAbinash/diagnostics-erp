import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ColorSchemeProvider } from "@/lib/colorScheme";
import Layout from "@/components/Layout";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { readStaffSession, canAccess, firstPermissionedPath, firstAllowedPath, longestMatchingNavPath, FULL_ACCESS_ROLES, normalizeRole } from "@/lib/staffSession";

import { RedirectToRadiologySettings } from "@/components/radiology/RedirectToRadiologySettings";

/** Legacy General Settings tab strip used ?tab=radiology — canonical home is Settings → Radiology. */
function SettingsPageOrRedirect() {
  if (typeof window !== "undefined") {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "radiology" || tab === "radiology-tools") {
      return <RedirectToRadiologySettings tab="productivity" />;
    }
  }
  return <Settings />;
}


const BillingDesk     = lazy(() => import("@/pages/BillingDesk"));
const Dashboard       = lazy(() => import("@/pages/Dashboard"));
const Diagnostics     = lazy(() => import("@/pages/Diagnostics"));
const BillingPeakMonitor = lazy(() => import("@/pages/BillingPeakMonitor"));
const MeasurementRegistryManager = lazy(() => import("@/pages/MeasurementRegistryManager"));
const PathologyRegistry = lazy(() => import("@/pages/PathologyRegistry"));
const Patients        = lazy(() => import("@/pages/Patients"));
const PatientDetail   = lazy(() => import("@/pages/PatientDetail"));
const PatientTimeline = lazy(() => import("@/pages/PatientTimeline"));
const Tests           = lazy(() => import("@/pages/Tests"));
const Orders          = lazy(() => import("@/pages/Orders"));
const OrderDetail     = lazy(() => import("@/pages/OrderDetail"));
const Billing         = lazy(() => import("@/pages/Billing"));
const BillDetail      = lazy(() => import("@/pages/BillDetail"));
const Payments        = lazy(() => import("@/pages/Payments"));
const Doctors         = lazy(() => import("@/pages/Doctors"));
const Reports         = lazy(() => import("@/pages/Reports"));
const ReportGenerator = lazy(() => import("@/pages/ReportGenerator"));
const Inventory       = lazy(() => import("@/pages/Inventory"));
const HopeReferrals   = lazy(() => import("@/pages/HopeReferrals"));
const HopeHospitalConnection = lazy(() => import("@/pages/HopeHospitalConnection"));
const IntegrationAdmin = lazy(() => import("@/pages/IntegrationAdmin"));
const WhatsAppIntegrationSettings = lazy(() => import("@/pages/WhatsAppIntegrationSettings"));
const Accounting      = lazy(() => import("@/pages/Accounting"));
const Banking         = lazy(() => import("@/pages/Banking"));
const Register        = lazy(() => import("@/pages/Register"));
const Settings        = lazy(() => import("@/pages/Settings"));
const SystemSettings  = lazy(() => import("@/pages/SystemSettings"));
const SystemUpdate    = lazy(() => import("@/pages/SystemUpdate"));
const Dues            = lazy(() => import("@/pages/Dues"));
const DicomNodes      = lazy(() => import("@/pages/DicomNodes"));
const Discounts       = lazy(() => import("@/pages/Discounts"));
const PACS            = lazy(() => import("@/pages/PACS"));
const Appointments    = lazy(() => import("@/pages/Appointments"));
const Packages        = lazy(() => import("@/pages/Packages"));
const Expenses        = lazy(() => import("@/pages/Expenses"));
const DayClose        = lazy(() => import("@/pages/DayClose"));
const MyDayClose      = lazy(() => import("@/pages/MyDayClose"));
const BooksSanity     = lazy(() => import("@/pages/BooksSanity"));
const ReconciliationCenter = lazy(() => import("@/pages/ReconciliationCenter"));
const Staff           = lazy(() => import("@/pages/Staff"));
const People          = lazy(() => import("@/pages/People"));
const AttendanceDevices = lazy(() => import("@/pages/AttendanceDevices"));
const Performance     = lazy(() => import("@/pages/Performance"));
const MyPortal        = lazy(() => import("@/pages/MyPortal"));
const Leave           = lazy(() => import("@/pages/Leave"));
const Roster          = lazy(() => import("@/pages/Roster"));
const Disciplinary    = lazy(() => import("@/pages/Disciplinary"));
const Appraisals      = lazy(() => import("@/pages/Appraisals"));
const Allowances      = lazy(() => import("@/pages/Allowances"));
const Awards          = lazy(() => import("@/pages/Awards"));
const ReportDeliveryTracking = lazy(() => import("@/pages/ReportDeliveryTracking"));
const Recall          = lazy(() => import("@/pages/Recall"));
const FeedbackDashboard = lazy(() => import("@/pages/FeedbackDashboard"));
const PaymentLinks    = lazy(() => import("@/pages/PaymentLinks"));
const AbdmConsent     = lazy(() => import("@/pages/AbdmConsent"));
const OpsCockpit      = lazy(() => import("@/pages/OpsCockpit"));
const HRForms         = lazy(() => import("@/pages/HRForms"));
const QueuePage       = lazy(() => import("@/pages/Queue"));
const Radiology       = lazy(() => import("@/pages/Radiology"));
const RadiologyLegacy = lazy(() => import("@/pages/RadiologyLegacy"));
const RadiologyWorklist = lazy(() => import("@/pages/RadiologyWorklist"));
const RadiologyOpenRedirect = lazy(() => import("@/pages/RadiologyOpenRedirect"));
const RadiologyReportEditor = lazy(() => import("@/pages/RadiologyReportEditor"));
const RadiologyReportGen = lazy(() => import("@/pages/RadiologyReportGenerator"));
const RadiologyReportBuilder = lazy(() => import("@/pages/RadiologyReportBuilder"));
const RadiologyFindingsManager = lazy(() => import("@/pages/RadiologyFindingsManager"));
const RadiologyReportingWorkspace = lazy(() => import("@/pages/RadiologyReportingWorkspace"));
const PacsDashboard         = lazy(() => import("@/pages/PacsDashboard"));
const RadiologySettingsCenter = lazy(() => import("@/pages/RadiologySettingsCenter"));
const RadiologyFlightDeck = lazy(() => import("@/pages/RadiologyFlightDeck"));
const ScannerSettings = lazy(() => import("@/pages/ScannerSettings"));
const RadiologyQuickSelectSettings = lazy(() => import("@/pages/RadiologyQuickSelectSettings"));
const RadiologyOperationsDashboard = lazy(() => import("@/pages/RadiologyOperationsDashboard"));
const OperationalHealth = lazy(() => import("@/pages/OperationalHealth"));
const ElectronicFilmSettings = lazy(() => import("@/pages/ElectronicFilmSettings"));
const RadiologyKnowledgePackManager = lazy(() => import("@/pages/RadiologyKnowledgePackManager"));
const RadiologyCatalogAdmin = lazy(() => import("@/pages/RadiologyCatalogAdmin"));
const ClinicalRecommendationRegistryManager = lazy(() => import("@/pages/ClinicalRecommendationRegistryManager"));
const ClinicalContentCoverage = lazy(() => import("@/pages/ClinicalContentCoverage"));
const ClinicalContentValidatorPage = lazy(() => import("@/pages/ClinicalContentValidatorPage"));
const MyReportingAnalytics         = lazy(() => import("@/pages/MyReportingAnalytics"));
const AiPromptTemplates     = lazy(() => import("@/pages/AiPromptTemplates"));
const AiPromptManager       = lazy(() => import("@/pages/AiPromptManager"));
const AiComparisonWorkspace = lazy(() => import("@/pages/AiComparisonWorkspace"));
const MissedFindingDetector = lazy(() => import("@/pages/MissedFindingDetector"));
const ImageReviewAssistant  = lazy(() => import("@/pages/ImageReviewAssistant"));
const ProviderFallback      = lazy(() => import("@/pages/ProviderFallback"));
const TeachingFiles         = lazy(() => import("@/pages/TeachingFiles"));
const TeachingCaseDetail    = lazy(() => import("@/pages/TeachingCaseDetail"));
const TeachingCollections   = lazy(() => import("@/pages/TeachingCaseCollections"));
const TeachingFavorites     = lazy(() => import("@/pages/TeachingFavorites"));
const TeachingAIAssistant   = lazy(() => import("@/pages/TeachingAIAssistant"));
const TeachingResearchMode  = lazy(() => import("@/pages/TeachingResearchMode"));
const TeachingMode          = lazy(() => import("@/pages/TeachingMode"));
const TeachingAnalytics     = lazy(() => import("@/pages/TeachingAnalytics"));
const TeachingPresentationMode = lazy(() => import("@/pages/TeachingPresentationMode"));
const RadiologyProductivity   = lazy(() => import("@/pages/RadiologyProductivity"));
const AiModelRouting        = lazy(() => import("@/pages/AiModelRouting"));
const ReportTemplatesPage   = lazy(() => import("@/pages/ReportTemplates"));
const AiAuditLog            = lazy(() => import("@/pages/AiAuditLog"));
const AiEgressInspector     = lazy(() => import("@/pages/AiEgressInspector"));
const AiQualityScores       = lazy(() => import("@/pages/AiQualityScores"));
const AiPromptEffectiveness = lazy(() => import("@/pages/AiPromptEffectiveness"));
const AiDicomFindings       = lazy(() => import("@/pages/AiDicomFindings"));
const RagVectorStore        = lazy(() => import("@/pages/RagVectorStore"));
const AiSearchRetrieval     = lazy(() => import("@/pages/AiSearchRetrieval"));
const AnomalyAlerts         = lazy(() => import("@/pages/AnomalyAlerts"));
const ReportDiffViewer      = lazy(() => import("@/pages/ReportDiffViewer"));
const FeedbackLoopAnalytics = lazy(() => import("@/pages/FeedbackLoopAnalytics"));
const TemplateVersions      = lazy(() => import("@/pages/TemplateVersions"));
const AiBillingSuggestions  = lazy(() => import("@/pages/AiBillingSuggestions"));
const PeerReviewAssignments = lazy(() => import("@/pages/PeerReviewAssignments"));
const TurnaroundTimeAnalytics = lazy(() => import("@/pages/TurnaroundTimeAnalytics"));
const TrainingDataExports   = lazy(() => import("@/pages/TrainingDataExports"));
const ReportQualityGates    = lazy(() => import("@/pages/ReportQualityGates"));
const CriticalFindings      = lazy(() => import("@/pages/CriticalFindings"));
const ProviderHealthMonitor = lazy(() => import("@/pages/ProviderHealthMonitor"));
const VoiceDictation        = lazy(() => import("@/pages/VoiceDictation"));
const PatientCommunication  = lazy(() => import("@/pages/PatientCommunication"));
const NormalReportTemplates = lazy(() => import("@/pages/NormalReportTemplates"));
const DicomViewer           = lazy(() => import("@/pages/DicomViewer"));
const AgentSetup            = lazy(() => import("@/pages/AgentSetup"));
const PacsLogs              = lazy(() => import("@/pages/PacsLogs"));
const DicomAgentDashboard   = lazy(() => import("@/pages/DicomAgentDashboard"));
const ModalityManagement    = lazy(() => import("@/pages/ModalityManagement"));
const AiReportingSettings   = lazy(() => import("@/pages/AiReportingSettings"));
const KnowledgeBaseManager  = lazy(() => import("@/pages/KnowledgeBaseManager"));
const AiCallerCredentials   = lazy(() => import("@/pages/AiCallerCredentials"));
const ReceptionCommandCenter = lazy(() => import("@/pages/ReceptionCommandCenter"));
const MyCollection          = lazy(() => import("@/pages/MyCollection"));
const PacsArchiveLifecycle  = lazy(() => import("@/pages/PacsArchiveLifecycle"));
const PacsWatchdogDashboard = lazy(() => import("@/pages/PacsWatchdogDashboard"));
const AiInferenceSettings   = lazy(() => import("@/pages/AiInferenceSettings"));
const Hl7Settings           = lazy(() => import("@/pages/Hl7Settings"));
const BackupReplication     = lazy(() => import("@/pages/BackupReplication"));
const UsgMeasurementReview  = lazy(() => import("@/pages/UsgMeasurementReview"));
const UsgAdminSettings      = lazy(() => import("@/pages/UsgAdminSettings"));
const UsgAdminReadiness     = lazy(() => import("@/pages/UsgAdminReadiness"));
const UsgDemoMode           = lazy(() => import("@/pages/UsgDemoMode"));
const UsgDoppler            = lazy(() => import("@/pages/UsgDoppler"));
const UsgReporting          = lazy(() => import("@/pages/UsgReporting"));
const UsgDopplerReporting   = lazy(() => import("@/pages/UsgDopplerReporting"));
const UsgKeyImagesGallery   = lazy(() => import("@/pages/UsgKeyImagesGallery"));
const UsgCriticalAlerts     = lazy(() => import("@/pages/UsgCriticalAlerts"));
const UsgAnalytics          = lazy(() => import("@/pages/UsgAnalytics"));
const PregnancyDashboard    = lazy(() => import("@/pages/PregnancyDashboard"));
const ReportHub       = lazy(() => import("@/pages/ReportHub"));
const Machines        = lazy(() => import("@/pages/Machines"));
const FormF           = lazy(() => import("@/pages/FormF"));
const Website         = lazy(() => import("@/pages/Website"));
const WhatsAppChatbot = lazy(() => import("@/pages/WhatsAppChatbot"));
const Portal          = lazy(() => import("@/pages/Portal"));
const VerifyReceipt   = lazy(() => import("@/pages/VerifyReceipt"));
const ShareBillPage   = lazy(() => import("@/pages/SharePages").then((m) => ({ default: m.ShareBillPage })));
const ShareReportPage = lazy(() => import("@/pages/SharePages").then((m) => ({ default: m.ShareReportPage })));
const PaymentQrDisplay = lazy(() => import("@/pages/PaymentQrDisplay"));
const OnlineBookings  = lazy(() => import("@/pages/OnlineBookings"));
const TechnicianWorkflow    = lazy(() => import("@/pages/TechnicianWorkflow"));
const AiExtractionReview    = lazy(() => import("@/pages/AiExtractionReview"));
const HangingProtocols      = lazy(() => import("@/pages/HangingProtocols"));
const TeleradiologyPortal = lazy(() => import("@/pages/TeleradiologyPortal"));
const MobileViewer    = lazy(() => import("@/pages/MobileViewer"));
const DailySummary    = lazy(() => import("@/pages/DailySummary"));
const MyDailySummary  = lazy(() => import("@/pages/MyDailySummary"));
const OutsourcedLabs       = lazy(() => import("@/pages/OutsourcedLabs"));
const OutsourcedCostReport = lazy(() => import("@/pages/OutsourcedCostReport"));
const OutsourceSettings       = lazy(() => import("@/pages/OutsourceSettings"));
const OutsourceRateCards      = lazy(() => import("@/pages/OutsourceRateCards"));
const OutsourceWorklist       = lazy(() => import("@/pages/OutsourceWorklist"));
const OutsourceReconciliation = lazy(() => import("@/pages/OutsourceReconciliation"));
const OutsourceLedger         = lazy(() => import("@/pages/OutsourceLedger"));
const OutsourceDashboard      = lazy(() => import("@/pages/OutsourceDashboard"));
const Samples              = lazy(() => import("@/pages/Samples"));
const ScanStation     = lazy(() => import("@/pages/ScanStation"));
const ReportDelivery  = lazy(() => import("@/pages/ReportDelivery"));
const Kiosk           = lazy(() => import("@/pages/Kiosk"));
const NotFound        = lazy(() => import("@/pages/not-found"));
const NetworkControlCenter = lazy(() => import("@/pages/NetworkControlCenter"));
const RadiologyCommandCenter = lazy(() => import("@/pages/RadiologyCommandCenter"));
const RadiologyAdvancedTools = lazy(() => import("@/pages/RadiologyAdvancedTools"));
const AcquisitionGateway     = lazy(() => import("@/pages/AcquisitionGateway"));
const MwlManager             = lazy(() => import("@/pages/MwlManager"));
const MwlDashboard           = lazy(() => import("@/pages/MwlDashboard"));
const StudyAccessLogs        = lazy(() => import("@/pages/StudyAccessLogs"));
const AiPipelineManager      = lazy(() => import("@/pages/AiPipelineManager"));
const CriticalAlertsManager  = lazy(() => import("@/pages/CriticalAlertsManager"));
const StorageLifecycle       = lazy(() => import("@/pages/StorageLifecycle"));
const RadiologistTools       = lazy(() => import("@/pages/RadiologistTools"));
const EchoCardiology         = lazy(() => import("@/pages/EchoCardiology"));
const FetalEcho              = lazy(() => import("@/pages/FetalEcho"));
const FetalUsgLevel4         = lazy(() => import("@/pages/FetalUsgLevel4"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      // CRITICAL: Do NOT set a global refetchInterval — it causes EVERY query
      // in the app (feature-flags, sync/status, clinic-settings, doctors, tests,
      // etc.) to refetch every 60 seconds. With multiple staff on multiple tabs,
      // this creates 300+ requests/minute of pure polling overhead that starves
      // real requests (bill saves, patient searches). API logs showed 34,452
      // feature-flag polls in 2 hours (76% of all requests) — many taking 3-5s
      // each because the server was overloaded.
      //
      // Queries that genuinely need polling (sync status, connectivity, display
      // board) set their own refetchInterval explicitly in their useQuery call.
      // The global default is now "no auto-refetch" — queries refetch only on
      // window focus, reconnect, or manual invalidation.
      refetchInterval: false,
      refetchIntervalInBackground: false,
    },
  },
});

const ERP_NAV_ORDER = [
  "/", "/dashboard", "/my-daily-summary", "/my-day-close", "/reception-command-center", "/daily-summary", "/patients", "/register", "/appointments", "/queue", "/online-bookings",
  "/orders", "/tests", "/packages", "/billing", "/payments", "/reports",
  "/report-generator", "/report-hub", "/inventory", "/expenses", "/staff", "/people", "/performance", "/attendance-devices", "/my-portal", "/leave", "/roster", "/disciplinary", "/appraisals", "/allowances", "/awards", "/referrals",
  "/accounting", "/discounts", "/form-f", "/machines", "/hr-forms", "/website", "/whatsapp-chatbot", "/settings", "/pathology-registry", "/knowledge-base", "/ai-caller-credentials",
  "/samples",
  "/outsource/settings", "/outsource/rate-cards", "/outsource/worklist", "/outsource/reconciliation", "/outsource/ledger", "/outsource/dashboard",
];

function PermissionGuard() {
  const [location, navigate] = useLocation();
  useEffect(() => {
    const session = readStaffSession();
    if (!session) {
      navigate("/portal", { replace: true });
      return;
    }
    // Owner Dashboard is admin/super_admin only — redirect others to My Daily Summary.
    const normalizedRole = normalizeRole(session.user.role);
    if ((location === "/dashboard" || location === "/diagnostics" || location === "/billing-performance" || location === "/measurement-registry" || location === "/pathology-registry") && !FULL_ACCESS_ROLES.has(normalizedRole)) {
      navigate("/my-daily-summary", { replace: true });
      return;
    }
    // Super Admin Portal is a Zero-Trace full-page bootstrap served by the API
    // (/super-admin-portal/), NOT an ERP SPA route. Any leftover SPA navigation
    // must hard-redirect to the real portal document (login), never bounce to
    // "/" (which shows the ERP left sidebar).
    if (location.startsWith("/super-admin-portal")) {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      window.location.replace(`/super-admin-portal/${hash}`);
      return;
    }
    // Redirect root "/" to user's default start page if configured and allowed
    if (location === "/" && session.user.defaultStartPage && session.user.defaultStartPage !== "/" && canAccess(session, session.user.defaultStartPage)) {
      navigate(session.user.defaultStartPage, { replace: true });
      return;
    }
    const matched = longestMatchingNavPath(location, ERP_NAV_ORDER);
    const pathToCheck = matched ?? location;
    if (!canAccess(session, pathToCheck)) {
      let target = "/";
      if (session.user.defaultStartPage && canAccess(session, session.user.defaultStartPage)) {
        target = session.user.defaultStartPage;
      } else {
        target = firstPermissionedPath(session, ERP_NAV_ORDER) ?? firstAllowedPath(session, ERP_NAV_ORDER);
      }
      navigate(target, { replace: true });
    }
  }, [location, navigate]);
  return null;
}

function Router() {
  const [location] = useLocation();

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/portal" component={Portal} />
        <Route path="/portal/:rest*" component={Portal} />
        <Route path="/erp/portal" component={Portal} />
        <Route path="/erp/portal/:rest*" component={Portal} />
        {/* Routing fix (July 2026): the ERP has no historically-canonical
            "/login" path — staff sign in via the Portal landing page at
            /erp/portal(/staff-login). These aliases make /erp/login and
            /erp/login/* work directly, per the required public routing
            contract (public website "Staff Login" button → /erp/login).
            wouter's base="/erp" already strips the prefix before matching,
            so the reachable route in production is the plain "/login" one;
            the "/erp/login" duplicate mirrors the existing /erp/portal
            pattern for dev-mode (BASE_URL="/") parity. */}
        <Route path="/login" component={Portal} />
        <Route path="/login/:rest*" component={Portal} />
        <Route path="/erp/login" component={Portal} />
        <Route path="/erp/login/:rest*" component={Portal} />
        <Route path="/verify-receipt/:billId" component={VerifyReceipt} />
        <Route path="/display/payment-qr/:counterKey" component={PaymentQrDisplay} />
        {/* Bare URL defaults to counter1 inside the component — kept for
            any already-configured single-counter setups. */}
        <Route path="/display/payment-qr" component={PaymentQrDisplay} />
        {/* Queue-display TV boards live on the public site (clinic-site's
            /queue/:roomKey), served at the bare caredeoghar.com origin —
            NOT under this app's /erp/ base path. The old duplicate copies
            here (Display.tsx, QueueDisplay.tsx) were unreachable at their
            documented TV URLs and were removed; see clinic-site instead. */}
        <Route path="/kiosk" component={Kiosk} />
        <Route path="/share/bill/:token" component={ShareBillPage} />
        <Route path="/share/report/:token" component={ShareReportPage} />
        <Route>
          <PermissionGuard />
          <Layout>
            <ModuleErrorBoundary resetKey={location}>
            <Switch>
              <Route path="/home" component={BillingDesk} />
              <Route path="/" component={BillingDesk} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/hope-referrals" component={HopeReferrals} />
              <Route path="/hope-connection" component={HopeHospitalConnection} />
              <Route path="/diagnostic-integration" component={IntegrationAdmin} />
              <Route path="/admin/integrations/whatsapp" component={WhatsAppIntegrationSettings} />
              <Route path="/diagnostics" component={Diagnostics} />
              <Route path="/billing-performance" component={BillingPeakMonitor} />
              <Route path="/settings/performance" component={BillingPeakMonitor} />
              <Route path="/measurement-registry" component={MeasurementRegistryManager} />
              <Route path="/pathology-registry" component={PathologyRegistry} />
              <Route path="/patients" component={Patients} />
              <Route path="/patients/:id/timeline" component={PatientTimeline} />
              <Route path="/patients/:id">
                {(params) => <PatientDetail id={Number(params.id)} />}
              </Route>
              <Route path="/tests" component={Tests} />
              <Route path="/orders" component={Orders} />
              <Route path="/orders/:id">
                {(params) => <OrderDetail id={Number(params.id)} />}
              </Route>
              <Route path="/billing" component={Billing} />
              <Route path="/billing/:id">
                {(params) => <BillDetail id={Number(params.id)} />}
              </Route>
              <Route path="/payments" component={Payments} />
              <Route path="/dues" component={Dues} />
              <Route path="/doctors" component={Doctors} />
              <Route path="/reports" component={Reports} />
              <Route path="/report-generator" component={ReportGenerator} />
              <Route path="/report-hub" component={ReportHub} />
              <Route path="/inventory" component={Inventory} />
              {/* Referral commission lives only in the USB-gated Super Admin
                  portal, so /referrals is simply the Doctors directory. */}
              <Route path="/referrals" component={Doctors} />
              <Route path="/accounting" component={Accounting} />
              <Route path="/banking" component={Banking} />
              <Route path="/register" component={Register} />
              <Route path="/discounts" component={Discounts} />
              <Route path="/appointments" component={Appointments} />
              <Route path="/daily-summary" component={DailySummary} />
              <Route path="/my-daily-summary" component={MyDailySummary} />
              <Route path="/online-bookings" component={OnlineBookings} />
              <Route path="/queue" component={QueuePage} />
              <Route path="/reception-command-center" component={ReceptionCommandCenter} />
              <Route path="/daily-summary" component={DailySummary} />
              <Route path="/my-daily-summary" component={MyDailySummary} />
              <Route path="/online-bookings" component={OnlineBookings} />
              <Route path="/packages" component={Packages} />
              <Route path="/expenses" component={Expenses} />
              <Route path="/my-day-close" component={MyDayClose} />
              <Route path="/day-close" component={DayClose} />
              <Route path="/books-sanity" component={BooksSanity} />
              <Route path="/reconciliation" component={ReconciliationCenter} />
              <Route path="/staff" component={Staff} />
              <Route path="/people" component={People} />
              <Route path="/attendance-devices" component={AttendanceDevices} />
              <Route path="/performance" component={Performance} />
              <Route path="/my-portal" component={MyPortal} />
              <Route path="/leave" component={Leave} />
              <Route path="/roster" component={Roster} />
              <Route path="/disciplinary" component={Disciplinary} />
              <Route path="/appraisals" component={Appraisals} />
              <Route path="/allowances" component={Allowances} />
              <Route path="/awards" component={Awards} />
              <Route path="/report-delivery-tracking" component={ReportDeliveryTracking} />
              <Route path="/recall" component={Recall} />
              <Route path="/feedback" component={FeedbackDashboard} />
              <Route path="/payment-links" component={PaymentLinks} />
              <Route path="/abdm-abha" component={AbdmConsent} />
              <Route path="/ops-cockpit" component={OpsCockpit} />
              <Route path="/hr-forms" component={HRForms} />
              <Route path="/form-f" component={FormF} />
              <Route path="/machines" component={Machines} />
              <Route path="/website" component={Website} />
              <Route path="/outsourced-labs" component={OutsourcedLabs} />
              <Route path="/outsourced-cost-report" component={OutsourcedCostReport} />
              <Route path="/outsource/settings" component={OutsourceSettings} />
              <Route path="/outsource/rate-cards" component={OutsourceRateCards} />
              <Route path="/outsource/worklist" component={OutsourceWorklist} />
              <Route path="/outsource/reconciliation" component={OutsourceReconciliation} />
              <Route path="/outsource/ledger" component={OutsourceLedger} />
              <Route path="/outsource/dashboard" component={OutsourceDashboard} />
              <Route path="/samples" component={Samples} />
              <Route path="/scan-station" component={ScanStation} />
              <Route path="/report-delivery" component={ReportDelivery} />
              <Route path="/settings" component={SettingsPageOrRedirect} />
              <Route path="/system-settings" component={SystemSettings} />
              <Route path="/whatsapp-chatbot" component={WhatsAppChatbot} />
              <Route path="/system-update" component={SystemUpdate} />
              <Route component={NotFound} />
            </Switch>
            </ModuleErrorBoundary>
          </Layout>
        </Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ColorSchemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ColorSchemeProvider>
  );
}

export default App;
