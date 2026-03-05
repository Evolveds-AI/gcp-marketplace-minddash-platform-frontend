'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  BanknoteArrowUp,
  Bot,
  Calculator,
  ChartNoAxesCombined,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LifeBuoy,
  Loader2,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { toast } from 'sonner';

import { Orb } from '@/components/ui/orb';
import { ShimmeringText } from '@/components/ui/shimmering-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type WizardPreset = {
  id: string;
  name: string;
  short: string;
  long: string;
  orb: {
    colors: [string, string];
    seed: number;
  };
  avatar: {
    label: string;
    className: string;
  };
  welcomeMessage: string;
  systemContext: string;
  customPrompt: string;
};

type OrganizationOption = {
  id: string;
  name: string;
};

type ProjectOption = {
  id: string;
  name: string;
  organization_id: string | null;
};

type RagDocument = {
  id: string;
  filename: string;
  status: string;
  created_at?: string;
};

type WizardDraftV1 = {
  v: 1;
  step: number;
  presetId: string;
  chatbotName: string;
  chatbotDescription: string;
  chatbotType: 'chatbot' | 'api' | 'web';
  organizationId: string;
  projectId: string;
  createOrgOpen: boolean;
  createProjectOpen: boolean;
  newOrgName: string;
  newOrgCompanyName: string;
  newOrgCountry: string;
  newOrgDescription: string;
  newProjectName: string;
  newProjectDescription: string;
  welcomeMessage: string;
  enableRag: boolean;
  enableAlerts: boolean;
  enableInsight: boolean;
  systemContext: string;
  customPrompt: string;
};

const WIZARD_DRAFT_STORAGE_KEY = 'create-chatbot-wizard:draft:v1';

const PRESETS: WizardPreset[] = [
  {
    id: 'analyst',
    name: 'Analista de datos',
    short: 'Responde con insights claros y gráficos cuando aplique.',
    long:
      'Ideal para analizar métricas, interpretar resultados y ayudarte a entender tus datos con explicaciones simples.',
    orb: { colors: ['#CADCFC', '#A0B9D1'], seed: 1000 },
    avatar: { label: 'AD', className: 'bg-purple-600 text-white' },
    welcomeMessage: 'Hola, soy tu analista de datos. ¿Qué querés analizar hoy?',
    systemContext:
      'Eres un asistente experto en análisis de datos. Responde en español, con claridad y sin tecnicismos innecesarios. Cuando falten datos, pide lo mínimo necesario.',
    customPrompt:
      'Tu objetivo es ayudar al usuario a analizar sus datos y obtener conclusiones accionables. Si es útil, sugiere gráficos y resúmenes por secciones.',
  },
  {
    id: 'sales',
    name: 'Asistente de ventas',
    short: 'Ayuda a entender ventas, clientes y oportunidades.',
    long:
      'Enfocado en performance comercial: ventas por período, por zona, por producto y recomendaciones para mejorar.',
    orb: { colors: ['#A7F3D0', '#10B981'], seed: 2000 },
    avatar: { label: 'VE', className: 'bg-emerald-600 text-white' },
    welcomeMessage: 'Hola, soy tu asistente de ventas. ¿Qué métricas querés revisar?',
    systemContext:
      'Eres un asistente especializado en ventas. Responde en español. Prioriza respuestas accionables y fáciles de ejecutar.',
    customPrompt:
      'Ayuda al usuario a entender el estado de sus ventas, detectar tendencias, comparar períodos y proponer próximos pasos concretos.',
  },
  {
    id: 'bonus',
    name: 'Calculadora de gratificación',
    short: 'Guía cálculos y reglas de negocio paso a paso.',
    long:
      'Útil para modelar escenarios, calcular bonificaciones/comisiones y explicar el resultado en términos simples.',
    orb: { colors: ['#93C5FD', '#2563EB'], seed: 3000 },
    avatar: { label: 'CG', className: 'bg-blue-600 text-white' },
    welcomeMessage: 'Hola, te ayudo a calcular gratificaciones. ¿Qué datos tenés?',
    systemContext:
      'Eres un asistente que ayuda a calcular gratificaciones/comisiones. Explica con pasos claros, valida supuestos y evita errores.',
    customPrompt:
      'Si el usuario pide cálculos, primero confirma los valores necesarios (período, ventas, reglas) y luego devuelve el cálculo desglosado.',
  },
  {
    id: 'support',
    name: 'Soporte y preguntas frecuentes',
    short: 'Responde consultas habituales con tono amable.',
    long:
      'Perfecto para atención al usuario: preguntas frecuentes, procesos, guías y resolución de problemas comunes.',
    orb: { colors: ['#E5E7EB', '#6B7280'], seed: 4000 },
    avatar: { label: 'SF', className: 'bg-slate-700 text-white' },
    welcomeMessage: 'Hola, estoy para ayudarte. ¿Cuál es tu consulta?',
    systemContext:
      'Eres un asistente de soporte. Responde en español, con tono amable, usando pasos numerados cuando corresponda.',
    customPrompt:
      'Prioriza resolver rápido. Si no tienes información suficiente, pide datos concretos y ofrece alternativas.',
  },
  {
    id: 'custom',
    name: 'Crear desde cero',
    short: 'La defino yo.',
    long: 'No uses una plantilla. Vas a poder escribir tus propias instrucciones y contexto.',
    orb: { colors: ['#F3F4F6', '#9CA3AF'], seed: 5000 },
    avatar: { label: 'YO', className: 'bg-slate-900 text-white' },
    welcomeMessage: 'Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte?',
    systemContext: '',
    customPrompt: '',
  },
];

const PRESET_ICONS = {
  analyst: ChartNoAxesCombined,
  sales: BanknoteArrowUp,
  bonus: Calculator,
  support: LifeBuoy,
  custom: Sparkles,
} as const;

const ADMIN_ROLE_ID = 'ee7376a8-d934-4936-91fa-2bda2949b5b8';
const CREATE_ORG_VALUE = '__create_org__';
const CREATE_PROJECT_VALUE = '__create_project__';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getApiErrorMessage(data: unknown, fallback: string): string {
  if (!isRecord(data)) return fallback;
  const raw = data.message ?? data.error ?? data.detail;
  if (typeof raw === 'string' && raw.trim()) return raw;
  return fallback;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

function Keycap({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border bg-muted/30 px-1.5 font-mono text-[11px] text-muted-foreground shadow-sm">
      {children}
    </kbd>
  );
}

function PresetIcon({ presetId, className }: { presetId: string; className: string }) {
  const Icon = PRESET_ICONS[presetId as keyof typeof PRESET_ICONS];
  if (!Icon) return null;
  return <Icon className={className} strokeWidth={2.2} />;
}

function ConfettiBurst({ burstKey }: { burstKey: string }) {
  const particles = useMemo(() => {
    const colors = ['#34D399', '#60A5FA', '#F472B6', '#FBBF24', '#A78BFA', '#22C55E'];
    return Array.from({ length: 22 }, (_, idx) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 90 + Math.random() * 130;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - (40 + Math.random() * 40);
      const size = 6 + Math.random() * 5;
      return {
        id: `${burstKey}-${idx}`,
        dx,
        dy,
        size,
        rotate: (Math.random() * 240 - 120) * (Math.random() > 0.5 ? 1 : -1),
        delay: Math.random() * 0.12,
        color: colors[idx % colors.length],
        radius: Math.random() > 0.6 ? 999 : 3,
      };
    });
  }, [burstKey]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute left-1/2 top-1/2"
          style={{
            width: p.size,
            height: p.size,
            borderRadius: p.radius,
            backgroundColor: p.color,
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.6, rotate: 0 }}
          animate={{ x: p.dx, y: p.dy, opacity: [0, 1, 0], scale: [0.6, 1, 1], rotate: p.rotate }}
          transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1], delay: p.delay }}
        />
      ))}
    </div>
  );
}

function readAuthToken(): string | null {
  try {
    const raw = localStorage.getItem('evolve-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.accessToken ?? null;
  } catch {
    return null;
  }
}

function readAuthSession(): { accessToken: string; userId: string | null } | null {
  try {
    const raw = localStorage.getItem('evolve-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const accessToken = typeof parsed?.accessToken === 'string' ? parsed.accessToken : '';
    const userId = typeof parsed?.userId === 'string' ? parsed.userId : null;
    if (!accessToken) return null;
    return { accessToken, userId };
  } catch {
    return null;
  }
}

function mapDocumentsResponse(data: unknown): RagDocument[] {
  let items: unknown = data;

  if (isRecord(data) && Array.isArray(data.data)) items = data.data;
  if (isRecord(data) && Array.isArray(data.documents)) items = data.documents;
  if (!Array.isArray(items)) return [];

  return items
    .map((raw) => {
      if (!isRecord(raw)) return null;
      const id =
        (typeof raw.id === 'string' && raw.id) ||
        (typeof raw.document_id === 'string' && raw.document_id) ||
        '';
      const filename =
        (typeof raw.filename === 'string' && raw.filename) ||
        (typeof raw.name === 'string' && raw.name) ||
        'Sin nombre';
      const status = (typeof raw.status === 'string' && raw.status) || 'PENDING';
      const created_at =
        (typeof raw.created_at === 'string' && raw.created_at) ||
        (typeof raw.createdAt === 'string' && raw.createdAt) ||
        undefined;

      const doc: RagDocument = { id, filename, status, created_at };
      return doc;
    })
    .filter((d): d is RagDocument => Boolean(d && d.id));
}

function getStatusBadge(status: string): { label: string; className: string } {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'DONE') {
    return {
      label: 'Listo',
      className: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-700/30 dark:text-emerald-200 dark:border-emerald-600/60',
    };
  }
  if (normalized === 'ERROR') {
    return {
      label: 'Error',
      className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-700/30 dark:text-red-200 dark:border-red-600/60',
    };
  }
  if (normalized === 'RUNNING' || normalized === 'IN_PROGRESS') {
    return {
      label: 'Procesando',
      className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-700/30 dark:text-blue-200 dark:border-blue-600/60',
    };
  }
  return {
    label: 'Pendiente',
    className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-700/30 dark:text-slate-200 dark:border-slate-600/60',
  };
}

const STEPPER_LABELS = ['Asistente', 'Detalles', 'Proyecto', 'Instrucciones', 'Finalizar'] as const;

const STEP_CONTAINER_VARIANTS = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0,
    },
  },
} as const;

const STEP_ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 8, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.26, ease: [0.16, 1, 0.3, 1] },
  },
} as const;

 const PRESET_LIST_VARIANTS = {
   hidden: {},
   show: {
     transition: {
       staggerChildren: 0.07,
       delayChildren: 0.32,
     },
   },
 } as const;

 const PRESET_CARD_VARIANTS = {
   hidden: { opacity: 0, scale: 0.5 },
   show: {
     opacity: 1,
     scale: 1,
     transition: {
       duration: 0.8,
       ease: [0, 0.71, 0.2, 1.01],
     },
   },
 } as const;

export function CreateChatbotWizardDialog({ triggerClassName }: { triggerClassName?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = '/dashboard/admin';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const shakeControls = useAnimationControls();
  const mountedRef = useRef(false);
  const finalizeRunIdRef = useRef(0);
  const finalizeIntervalRef = useRef<number | null>(null);
  const nameCheckRunIdRef = useRef(0);
  const nameCheckTimeoutRef = useRef<number | null>(null);
  const autosaveTimeoutRef = useRef<number | null>(null);
  const restoredDraftRef = useRef<WizardDraftV1 | null>(null);
  const welcomeEditedRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const [validationError, setValidationError] = useState<{
    step: number;
    message: string;
    fieldId?: string;
  } | null>(null);

  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loadingContext, setLoadingContext] = useState(false);

  const [presetId, setPresetId] = useState<string>('');
  const preset = useMemo(() => {
    if (!presetId) return null;
    return PRESETS.find((p) => p.id === presetId) ?? null;
  }, [presetId]);

  const [chatbotName, setChatbotName] = useState('');
  const [checkingNameAvailability, setCheckingNameAvailability] = useState(false);
  const [chatbotNameTaken, setChatbotNameTaken] = useState(false);
  const [chatbotDescription, setChatbotDescription] = useState('');
  const [chatbotType, setChatbotType] = useState<'chatbot' | 'api' | 'web'>('chatbot');

  const [organizationId, setOrganizationId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');

  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);

  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCompanyName, setNewOrgCompanyName] = useState('');
  const [newOrgCountry, setNewOrgCountry] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [enableRag, setEnableRag] = useState(false);
  const [enableAlerts, setEnableAlerts] = useState(false);
  const [enableInsight, setEnableInsight] = useState(false);

  const [systemContext, setSystemContext] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  const [creating, setCreating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeMessageIndex, setFinalizeMessageIndex] = useState(0);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const [postCreateReady, setPostCreateReady] = useState(false);

  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId]
  );

  const nameTakenMessage = useMemo(() => {
    return 'Ya existe un chatbot con ese nombre.';
  }, []);

  const navOrgId = useMemo(() => organizationId || selectedProject?.organization_id || '', [organizationId, selectedProject]);

  const filteredProjects = useMemo(() => {
    const orgId = organizationId || null;
    if (!orgId) return projects;
    return projects.filter((p) => p.organization_id === orgId);
  }, [projects, organizationId]);

  const totalSteps = 5;

  const isFieldInvalid = (fieldId: string) =>
    validationError?.step === step && validationError.fieldId === fieldId;

  const canGoNext = useMemo(() => {
    if (step === 0) {
      return Boolean(presetId);
    }
    if (step === 1) {
      return Boolean(chatbotName.trim());
    }
    if (step === 2) {
      return Boolean(projectId) && !checkingNameAvailability && !chatbotNameTaken;
    }
    if (step === 3) {
      return Boolean(customPrompt.trim());
    }
    return true;
  }, [step, presetId, chatbotName, projectId, customPrompt, checkingNameAvailability, chatbotNameTaken]);

  const maxUnlockedStep = useMemo(() => {
    if (postCreateReady) return totalSteps - 1;
    const step0Complete = Boolean(presetId);
    const step1Complete = step0Complete && Boolean(chatbotName.trim());
    const step2Complete =
      step1Complete && Boolean(projectId) && !checkingNameAvailability && !chatbotNameTaken;
    const step3Complete = step2Complete && Boolean(customPrompt.trim());

    if (step3Complete) return 4;
    if (step2Complete) return 3;
    if (step1Complete) return 2;
    if (step0Complete) return 1;
    return 0;
  }, [postCreateReady, totalSteps, presetId, chatbotName, projectId, checkingNameAvailability, chatbotNameTaken, customPrompt]);

  const resetWizard = () => {
    if (nameCheckTimeoutRef.current) {
      window.clearTimeout(nameCheckTimeoutRef.current);
      nameCheckTimeoutRef.current = null;
    }
    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
    if (finalizeIntervalRef.current) {
      window.clearInterval(finalizeIntervalRef.current);
      finalizeIntervalRef.current = null;
    }
    setStep(0);
    setPresetId('');
    setChatbotName('');
    setCheckingNameAvailability(false);
    setChatbotNameTaken(false);
    setChatbotDescription('');
    setChatbotType('chatbot');
    setOrganizationId('');
    setProjectId('');
    setCreateOrgOpen(false);
    setCreateProjectOpen(false);
    setCreatingOrg(false);
    setCreatingProject(false);
    setNewOrgName('');
    setNewOrgCompanyName('');
    setNewOrgCountry('');
    setNewOrgDescription('');
    setNewProjectName('');
    setNewProjectDescription('');
    setWelcomeMessage('');
    setEnableRag(false);
    setEnableAlerts(false);
    setEnableInsight(false);
    setSystemContext('');
    setCustomPrompt('');
    setCreating(false);
    setFinalizing(false);
    setFinalizeMessageIndex(0);
    setCreatedProductId(null);
    setPostCreateReady(false);
    setDocuments([]);
    setLoadingDocs(false);
    setUploading(false);
    setDeletingDocId(null);
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!postCreateReady) return;
    if (!createdProductId) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();

      if (e.shiftKey) {
        const target = navOrgId && projectId
          ? `${basePath}/organizations/${navOrgId}/projects/${projectId}/chatbots/${createdProductId}?section=general`
          : `${basePath}/chatbots`;
        router.push(target);
        setOpen(false);
        return;
      }

      window.open(`/chatbot/${createdProductId}`, '_blank', 'noopener,noreferrer');
      setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, postCreateReady, createdProductId, navOrgId, projectId, router, basePath]);

  useEffect(() => {
    if (!open) return;

    let restored: WizardDraftV1 | null = null;
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(WIZARD_DRAFT_STORAGE_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (isRecord(parsed) && parsed.v === 1) {
          restored = parsed as WizardDraftV1;
        }
      } catch {
        restored = null;
      }
    }

    restoredDraftRef.current = restored;
    {
      const restoredWelcome = restored?.welcomeMessage?.trim() ?? '';
      const restoredPreset = restored?.presetId
        ? PRESETS.find((p) => p.id === restored.presetId) ?? null
        : null;
      const matchesDefault = restoredPreset
        ? restoredWelcome === (restoredPreset.welcomeMessage ?? '')
        : false;
      welcomeEditedRef.current = Boolean(restoredWelcome) && !matchesDefault;
    }
    resetWizard();

    if (restored) {
      setStep(Math.max(0, Math.min(totalSteps - 1, restored.step)));
      setPresetId(restored.presetId || '');
      setChatbotName(restored.chatbotName || '');
      setChatbotDescription(restored.chatbotDescription || '');
      setChatbotType(restored.chatbotType || 'chatbot');
      setOrganizationId(restored.organizationId || '');
      setProjectId(restored.projectId || '');
      setCreateOrgOpen(Boolean(restored.createOrgOpen));
      setCreateProjectOpen(Boolean(restored.createProjectOpen));
      setNewOrgName(restored.newOrgName || '');
      setNewOrgCompanyName(restored.newOrgCompanyName || '');
      setNewOrgCountry(restored.newOrgCountry || '');
      setNewOrgDescription(restored.newOrgDescription || '');
      setNewProjectName(restored.newProjectName || '');
      setNewProjectDescription(restored.newProjectDescription || '');
      setWelcomeMessage(restored.welcomeMessage || '');
      setEnableRag(Boolean(restored.enableRag));
      setEnableAlerts(Boolean(restored.enableAlerts));
      setEnableInsight(Boolean(restored.enableInsight));
      setSystemContext(restored.systemContext || '');
      setCustomPrompt(restored.customPrompt || '');
    }

    const token = readAuthToken();
    if (!token) {
      toast.error('Sesión expirada');
      setOpen(false);
      return;
    }

    const load = async () => {
      try {
        setLoadingContext(true);

        const [orgRes, projectRes] = await Promise.all([
          fetch('/api/admin-client/organizations/stats', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }),
          fetch('/api/admin-client/projects', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }),
        ]);

        const orgData: unknown = await orgRes.json().catch(() => null);
        const projectData: unknown = await projectRes.json().catch(() => null);

        if (!orgRes.ok) {
          throw new Error(getApiErrorMessage(orgData, 'No se pudieron cargar organizaciones'));
        }
        if (!projectRes.ok) {
          throw new Error(getApiErrorMessage(projectData, 'No se pudieron cargar proyectos'));
        }

        let orgs: OrganizationOption[] = [];
        if (isRecord(orgData) && Array.isArray(orgData.organizations)) {
          orgs = orgData.organizations
            .map((raw) => {
              if (!isRecord(raw)) return null;
              const id = typeof raw.id === 'string' ? raw.id : '';
              const name = typeof raw.name === 'string' ? raw.name : '';
              if (!id || !name) return null;
              return { id, name };
            })
            .filter((o): o is OrganizationOption => Boolean(o));
        }

        let projs: ProjectOption[] = [];
        if (isRecord(projectData) && Array.isArray(projectData.projects)) {
          projs = projectData.projects
            .map((raw) => {
              if (!isRecord(raw)) return null;
              const id = typeof raw.id === 'string' ? raw.id : '';
              const name = typeof raw.name === 'string' ? raw.name : '';
              const organization_id =
                typeof raw.organization_id === 'string' ? raw.organization_id : null;
              if (!id || !name) return null;
              const project: ProjectOption = { id, name, organization_id };
              return project;
            })
            .filter((p): p is ProjectOption => Boolean(p));
        }

        setOrganizations(orgs);
        setProjects(projs);

        const restoredDraft = restoredDraftRef.current;
        const draftOrgId = restoredDraft?.organizationId || '';
        const draftProjectId = restoredDraft?.projectId || '';

        const validOrgId = draftOrgId && orgs.some((o) => o.id === draftOrgId) ? draftOrgId : '';
        const validProject = draftProjectId ? projs.find((p) => p.id === draftProjectId) ?? null : null;

        const firstOrgId = orgs[0]?.id ?? '';
        const firstProj = projs.find((p) => (firstOrgId ? p.organization_id === firstOrgId : true)) ?? projs[0];

        const nextOrgId =
          validOrgId ||
          validProject?.organization_id ||
          firstOrgId ||
          firstProj?.organization_id ||
          '';

        const nextProjectId = validProject?.id || firstProj?.id || '';

        setOrganizationId((prev) => prev || nextOrgId);
        setProjectId((prev) => prev || nextProjectId);
      } catch (e: unknown) {
        toast.error(getErrorMessage(e, 'Error cargando contexto'));
      } finally {
        setLoadingContext(false);
      }
    };

    void load();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!presetId) return;
    const nextPreset = PRESETS.find((p) => p.id === presetId) ?? null;
    if (!nextPreset) return;
    setSystemContext(nextPreset.systemContext);
    setCustomPrompt(nextPreset.customPrompt);
    if (!welcomeEditedRef.current) {
      setWelcomeMessage(nextPreset.welcomeMessage);
    }
  }, [open, presetId]);

  const checkChatbotNameTaken = async (name: string, prjId: string) => {
    const token = readAuthToken();
    if (!token) return null;

    const trimmed = name.trim();
    if (!trimmed || !prjId) return null;

    const runId = nameCheckRunIdRef.current + 1;
    nameCheckRunIdRef.current = runId;
    setCheckingNameAvailability(true);

    try {
      const response = await fetch(
        `/api/backend/products/exists?project_id=${encodeURIComponent(prjId)}&name=${encodeURIComponent(trimmed)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !isRecord(data) || data.success !== true) {
        return null;
      }

      const exists = typeof data.exists === 'boolean' ? data.exists : false;

      if (nameCheckRunIdRef.current === runId) {
        setChatbotNameTaken(exists);
        if (exists && step === 2) {
          setValidationError({
            step: 2,
            message: 'Ya existe un chatbot con ese nombre en el proyecto seleccionado.',
            fieldId: 'wizard-project',
          });
        }
      }

      return exists;
    } finally {
      if (nameCheckRunIdRef.current === runId) {
        setCheckingNameAvailability(false);
      }
    }
  };

  useEffect(() => {
    if (!open) return;
    if (createdProductId) return;

    if (step !== 2) {
      if (nameCheckTimeoutRef.current) {
        window.clearTimeout(nameCheckTimeoutRef.current);
        nameCheckTimeoutRef.current = null;
      }
      setCheckingNameAvailability(false);
      setChatbotNameTaken(false);
      return;
    }

    const trimmed = chatbotName.trim();
    if (!trimmed || !projectId) {
      setCheckingNameAvailability(false);
      setChatbotNameTaken(false);
      return;
    }

    if (nameCheckTimeoutRef.current) {
      window.clearTimeout(nameCheckTimeoutRef.current);
    }

    nameCheckTimeoutRef.current = window.setTimeout(() => {
      void checkChatbotNameTaken(trimmed, projectId);
    }, 450);

    return () => {
      if (nameCheckTimeoutRef.current) {
        window.clearTimeout(nameCheckTimeoutRef.current);
        nameCheckTimeoutRef.current = null;
      }
    };
  }, [open, step, chatbotName, projectId, createdProductId]);

  useEffect(() => {
    if (!open) return;
    if (postCreateReady && createdProductId) {
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(WIZARD_DRAFT_STORAGE_KEY);
        } catch {
          null;
        }
      }
    }
  }, [open, postCreateReady, createdProductId]);

  useEffect(() => {
    if (!open) return;
    if (finalizing) return;
    if (postCreateReady) return;

    const draft: WizardDraftV1 = {
      v: 1,
      step,
      presetId,
      chatbotName,
      chatbotDescription,
      chatbotType,
      organizationId,
      projectId,
      createOrgOpen,
      createProjectOpen,
      newOrgName,
      newOrgCompanyName,
      newOrgCountry,
      newOrgDescription,
      newProjectName,
      newProjectDescription,
      welcomeMessage,
      enableRag,
      enableAlerts,
      enableInsight,
      systemContext,
      customPrompt,
    };

    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = window.setTimeout(() => {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(WIZARD_DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch {
        null;
      }
    }, 450);

    return () => {
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
    };
  }, [
    open,
    finalizing,
    postCreateReady,
    step,
    presetId,
    chatbotName,
    chatbotDescription,
    chatbotType,
    organizationId,
    projectId,
    createOrgOpen,
    createProjectOpen,
    newOrgName,
    newOrgCompanyName,
    newOrgCountry,
    newOrgDescription,
    newProjectName,
    newProjectDescription,
    welcomeMessage,
    enableRag,
    enableAlerts,
    enableInsight,
    systemContext,
    customPrompt,
  ]);

  const createChatbot = async ({ silentToast }: { silentToast?: boolean } = {}) => {
    if (createdProductId) return createdProductId;

    const token = readAuthToken();
    if (!token) {
      toast.error('Sesión expirada');
      return null;
    }

    if (!projectId) {
      toast.error('Selecciona un proyecto');
      return null;
    }

    if (!chatbotName.trim()) {
      toast.error('El nombre es requerido');
      return null;
    }

    if (!customPrompt.trim()) {
      toast.error('Agrega instrucciones para el asistente');
      return null;
    }

    try {
      setCreating(true);

      const selectedTypeLabel =
        chatbotType === 'api' ? 'API' : chatbotType === 'web' ? 'Web App' : 'Chatbot';

      const response = await fetch('/api/backend/products', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          name: chatbotName.trim(),
          description: chatbotDescription?.trim() || null,
          language: 'es',
          tipo: chatbotType,
          config: {
            systemContext: systemContext.trim() || null,
            customPrompt: customPrompt.trim(),
            presetId: presetId || null,
            welcomeMessage:
              welcomeMessage?.trim() || preset?.welcomeMessage || 'Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte?',
          },
          welcome_message:
            welcomeMessage?.trim() || preset?.welcomeMessage || 'Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte?',
          label: selectedTypeLabel,
          max_users: 100,
          is_active_rag: enableRag,
          is_active_alerts: enableAlerts,
          is_active_insight: enableInsight,
        }),
      });

      const data: unknown = await response.json().catch(() => null);

      const okFlag = isRecord(data) && data.success === true;
      if (!response.ok || !okFlag) {
        throw new Error(getApiErrorMessage(data, 'No se pudo crear el chatbot'));
      }

      const productId =
        isRecord(data) && isRecord(data.data)
          ? (typeof data.data.id_product === 'string' && data.data.id_product) ||
            (typeof data.data.product_id === 'string' && data.data.product_id) ||
            null
          : null;
      if (!productId) {
        throw new Error('El servidor no devolvió el ID del chatbot');
      }

      setCreatedProductId(productId);
      if (!silentToast) {
        toast.success('Chatbot creado');
      }

      return String(productId);
    } catch (e: unknown) {
      const message = getErrorMessage(e, 'Error al crear chatbot');
      if (/ya existe un chatbot con ese nombre/i.test(message)) {
        setChatbotNameTaken(true);
        setValidationError({
          step: 2,
          message: 'Ya existe un chatbot con ese nombre en el proyecto seleccionado. Cambia el nombre o elige otro proyecto.',
          fieldId: 'wizard-project',
        });
        setStep(2);
        requestAnimationFrame(() => {
          const el = document.getElementById('wizard-project');
          if (el instanceof HTMLElement) el.focus();
        });
      }
      toast.error(message);
      return null;
    } finally {
      setCreating(false);
    }
  };

  const loadDocuments = async (productId: string) => {
    try {
      const token = readAuthToken();
      if (!token) return;
      setLoadingDocs(true);

      const response = await fetch(`/api/backend/rag/documents?product_id=${encodeURIComponent(productId)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setDocuments([]);
        return;
      }

      setDocuments(mapDocumentsResponse(data));
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (!createdProductId) return;
    if (!enableRag) return;
    void loadDocuments(createdProductId);
  }, [open, createdProductId, enableRag]);

  const handleUpload = async (file: File) => {
    const productId = createdProductId;
    if (!productId) return;

    const token = readAuthToken();
    if (!token) {
      toast.error('Sesión expirada');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/backend/rag/upload?product_id=${encodeURIComponent(productId)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, 'Error al subir documento'));
      }

      toast.success('Documento subido');
      await loadDocuments(productId);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Error al subir documento'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    const productId = createdProductId;
    if (!productId) return;

    const token = readAuthToken();
    if (!token) {
      toast.error('Sesión expirada');
      return;
    }

    try {
      setDeletingDocId(docId);

      const response = await fetch(`/api/backend/rag/documents/${encodeURIComponent(docId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, 'Error al eliminar documento'));
      }

      toast.success('Documento eliminado');
      await loadDocuments(productId);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Error al eliminar documento'));
    } finally {
      setDeletingDocId(null);
    }
  };

  const onNext = async () => {
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  };

  const onBack = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleCreateOrganization = async () => {
    if (creatingOrg) return;

    const session = readAuthSession();
    if (!session) {
      toast.error('Sesión expirada');
      return;
    }

    const name = newOrgName.trim();
    const company_name = newOrgCompanyName.trim();
    const country = newOrgCountry.trim();
    const description = newOrgDescription.trim();

    if (!name || !company_name || !country || !description) {
      setValidationError({ step: 2, message: 'Completa los datos para crear la organización.' });
      return;
    }

    try {
      setCreatingOrg(true);

      const response = await fetch('/api/backend/organizations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, company_name, country, description }),
      });

      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, 'No se pudo crear la organización'));
      }
      if (!isRecord(data) || data.success !== true) {
        throw new Error(getApiErrorMessage(data, 'No se pudo crear la organización'));
      }

      const createdId =
        isRecord(data.data) && typeof data.data.id_organization === 'string' ? data.data.id_organization : '';
      if (!createdId) throw new Error('No se pudo obtener el ID de la organización creada');

      if (session.userId) {
        await fetch('/api/backend/organizations/access', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ organization_id: createdId, user_id: session.userId, role_id: ADMIN_ROLE_ID }),
        }).catch(() => null);
      }

      setOrganizations((prev) => (prev.some((o) => o.id === createdId) ? prev : [...prev, { id: createdId, name }]));
      setOrganizationId(createdId);
      setProjectId('');
      setCreateOrgOpen(false);
      setCreateProjectOpen(true);
      setNewProjectName('');
      setNewProjectDescription('');
      setValidationError(null);
      toast.success('Organización creada');
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Error al crear la organización'));
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleCreateProject = async () => {
    if (creatingProject) return;

    const session = readAuthSession();
    if (!session) {
      toast.error('Sesión expirada');
      return;
    }

    const orgId = organizationId;
    const name = newProjectName.trim();
    const description = newProjectDescription.trim();

    if (!orgId) {
      setValidationError({ step: 2, message: 'Selecciona una organización antes de crear un proyecto.' });
      return;
    }
    if (!name) {
      setValidationError({ step: 2, message: 'Ingresa un nombre para el proyecto.' });
      return;
    }

    try {
      setCreatingProject(true);

      const response = await fetch('/api/backend/projects/create', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_id: orgId,
          name,
          description: description || null,
          label: null,
          label_color: null,
        }),
      });

      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, 'No se pudo crear el proyecto'));
      }
      if (!isRecord(data) || data.success !== true) {
        throw new Error(getApiErrorMessage(data, 'No se pudo crear el proyecto'));
      }

      const projectIdCreated =
        isRecord(data.project) && typeof data.project.project_id === 'string' ? data.project.project_id : '';
      if (!projectIdCreated) throw new Error('No se pudo obtener el ID del proyecto creado');

      if (session.userId) {
        await fetch('/api/backend/projects/access', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ project_id: projectIdCreated, user_id: session.userId, role_id: ADMIN_ROLE_ID }),
        }).catch(() => null);
      }

      setProjects((prev) =>
        prev.some((p) => p.id === projectIdCreated) ? prev : [...prev, { id: projectIdCreated, name, organization_id: orgId }]
      );
      setProjectId(projectIdCreated);
      setCreateProjectOpen(false);
      setValidationError(null);
      toast.success('Proyecto creado');
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Error al crear el proyecto'));
    } finally {
      setCreatingProject(false);
    }
  };

  const attemptNext = async () => {
    if (creating) return;

    if (!canGoNext) {
      const nextError =
        step === 0
          ? { step, message: 'Selecciona una personalidad para continuar.' }
          : step === 1
            ? { step, message: 'Ingresa un nombre para continuar.', fieldId: 'chatbot-name' }
            : step === 2
              ? checkingNameAvailability
                ? { step, message: 'Verificando disponibilidad del nombre…', fieldId: 'wizard-project' }
                : chatbotNameTaken
                  ? {
                      step,
                      message: 'Ya existe un chatbot con ese nombre en el proyecto seleccionado.',
                      fieldId: 'wizard-project',
                    }
                  : { step, message: 'Selecciona un proyecto para continuar.', fieldId: 'wizard-project' }
              : step === 3
                ? { step, message: 'Agrega instrucciones para continuar.', fieldId: 'custom-prompt' }
                : { step, message: 'Completa los datos requeridos para continuar.' };

      setValidationError(nextError);

      void shakeControls.start({
        x: [0, -8, 8, -6, 6, 0],
        transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
      });

      if (nextError.fieldId) {
        requestAnimationFrame(() => {
          const el = document.getElementById(nextError.fieldId);
          if (el instanceof HTMLElement) el.focus();
        });
      }

      return;
    }

    setValidationError(null);
    await onNext();
  };

  const finalizeMessages = useMemo(() => {
    const messages: string[] = [
      'Creando tu chatbot…',
      'Configurando ajustes iniciales…',
      'Aplicando tus instrucciones…',
    ];

    if (enableRag || enableAlerts || enableInsight) {
      messages.push('Activando funcionalidades…');
    }

    messages.push('Guardando configuración…');
    messages.push('Listo. Abriendo tu chatbot…');
    return messages;
  }, [enableRag, enableAlerts, enableInsight]);

  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const onFinish = async () => {
    if (finalizing) return;
    if (postCreateReady) return;

    if (!chatbotName.trim()) {
      setValidationError({ step: 1, message: 'Ingresa un nombre para continuar.', fieldId: 'chatbot-name' });
      setStep(1);
      requestAnimationFrame(() => {
        const el = document.getElementById('chatbot-name');
        if (el instanceof HTMLElement) el.focus();
      });
      return;
    }

    if (!projectId) {
      setValidationError({ step: 2, message: 'Selecciona un proyecto para continuar.', fieldId: 'wizard-project' });
      setStep(2);
      requestAnimationFrame(() => {
        const el = document.getElementById('wizard-project');
        if (el instanceof HTMLElement) el.focus();
      });
      return;
    }

    if (checkingNameAvailability) {
      setValidationError({
        step: 2,
        message: 'Verificando disponibilidad del nombre…',
        fieldId: 'wizard-project',
      });
      setStep(2);
      return;
    }

    if (chatbotNameTaken) {
      setValidationError({
        step: 2,
        message: 'Ya existe un chatbot con ese nombre en el proyecto seleccionado.',
        fieldId: 'wizard-project',
      });
      setStep(2);
      requestAnimationFrame(() => {
        const el = document.getElementById('wizard-project');
        if (el instanceof HTMLElement) el.focus();
      });
      return;
    }

    const preflightTaken = await checkChatbotNameTaken(chatbotName, projectId);
    if (preflightTaken) {
      setValidationError({
        step: 2,
        message: 'Ya existe un chatbot con ese nombre en el proyecto seleccionado.',
        fieldId: 'wizard-project',
      });
      setStep(2);
      requestAnimationFrame(() => {
        const el = document.getElementById('wizard-project');
        if (el instanceof HTMLElement) el.focus();
      });
      return;
    }

    const runId = finalizeRunIdRef.current + 1;
    finalizeRunIdRef.current = runId;

    setFinalizing(true);
    setFinalizeMessageIndex(0);

    const shouldShowCreatedToast = !createdProductId;

    const cycleLen = Math.max(1, finalizeMessages.length - 1);
    if (finalizeIntervalRef.current) {
      window.clearInterval(finalizeIntervalRef.current);
      finalizeIntervalRef.current = null;
    }

    if (cycleLen > 1) {
      finalizeIntervalRef.current = window.setInterval(() => {
        setFinalizeMessageIndex((prev) => (prev + 1) % cycleLen);
      }, 3000);
    }

    try {
      const productId = createdProductId
        ? createdProductId
        : await createChatbot({ silentToast: true });

      if (!mountedRef.current || finalizeRunIdRef.current !== runId) return;

      if (!productId) {
        setFinalizing(false);
        return;
      }

      const lastIdx = Math.max(0, finalizeMessages.length - 1);
      setFinalizeMessageIndex(lastIdx);
      await sleep(800);

      if (shouldShowCreatedToast) {
        toast.success('Chatbot creado');
      }

      setPostCreateReady(true);
      setFinalizing(false);
    } finally {
      if (finalizeIntervalRef.current) {
        window.clearInterval(finalizeIntervalRef.current);
        finalizeIntervalRef.current = null;
      }
    }
  };

  const currentStepTitle =
    step === 0
      ? 'Elegí un asistente'
      : step === 1
      ? 'Datos básicos'
      : step === 2
      ? 'Proyecto'
      : step === 3
      ? 'Instrucciones'
      : 'Documentos (opcional)';

  const currentStepDescription =
    step === 0
      ? 'Elegí una personalidad.'
      : step === 1
      ? 'Nombre y descripción.'
      : step === 2
      ? 'Organización y proyecto.'
      : step === 3
      ? 'Define instrucciones.'
      : 'Documentos (opcional).';

  return (
    <>
      <Button onClick={() => setOpen(true)} className={cn('gap-2', triggerClassName)}>
        <Plus className="h-4 w-4" />
        Crear chatbot
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (finalizing) return;
          setOpen(next);
        }}
      >
        <DialogContent className="max-w-5xl h-[90vh] max-h-[90vh] overflow-hidden p-0 border-0 bg-transparent shadow-none">
          <motion.div
            animate={shakeControls}
            className="flex h-full flex-col bg-white p-6 shadow-lg dark:bg-[#141414] border border-gray-200 dark:border-gray-800 sm:rounded-lg"
          >
            <div className="space-y-3 shrink-0">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Crear un chatbot
                </DialogTitle>
                <DialogDescription>{currentStepDescription}</DialogDescription>
              </DialogHeader>

              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{currentStepTitle}</div>
                  <div className="text-xs text-muted-foreground">
                    Paso {step + 1} de {totalSteps}
                  </div>
                  {validationError && validationError.step === step ? (
                    <motion.div
                      key={`${step}-${validationError.message}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-destructive"
                    >
                      {validationError.message}
                    </motion.div>
                  ) : null}
                </div>

                <div className="flex items-center justify-end">
                  <div
                    className="flex items-center gap-1 rounded-full border bg-muted/30 p-1"
                    aria-label={`Paso ${step + 1} de ${totalSteps}`}
                  >
                    {STEPPER_LABELS.slice(0, totalSteps).map((label, idx) => {
                      const done = idx < maxUnlockedStep;
                      const current = idx === step;
                      const canNavigate = idx <= maxUnlockedStep && !creating && !finalizing && !postCreateReady;

                      return (
                        <div key={label} className="relative">
                          {current ? (
                            <motion.div
                              layoutId="wizard-stepper-pill"
                              className="pointer-events-none absolute inset-0 rounded-full bg-background shadow-sm"
                            />
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              if (!canNavigate) return;
                              setValidationError(null);
                              setStep(idx);
                            }}
                            disabled={!canNavigate}
                            className={cn(
                              'relative z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                              done || current ? 'text-foreground' : 'text-muted-foreground',
                              canNavigate ? 'cursor-pointer hover:bg-muted/40' : 'cursor-default'
                            )}
                            aria-current={current ? 'step' : undefined}
                            aria-label={label}
                            aria-disabled={!canNavigate}
                          >
                            {done ? (
                              <Check className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <div
                                className={cn(
                                  'h-2 w-2 rounded-full',
                                  current ? 'bg-primary' : 'bg-muted-foreground/40'
                                )}
                              />
                            )}
                            <span className={cn('hidden sm:inline', current ? 'sm:inline' : 'sm:hidden')}>
                              {label}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className={cn('flex-1 min-h-0', step === 0 ? 'overflow-y-hidden' : 'overflow-y-auto px-1')}>
              {loadingContext ? (
                <div className="flex h-full min-h-[520px] flex-col items-center justify-center text-center">
                  <div className="min-h-[28px]">
                    <ShimmeringText
                      text="Preparando todo…"
                      className="text-lg font-semibold"
                      duration={2.4}
                      repeatDelay={0.4}
                      repeat={true}
                      startOnView={false}
                      spread={1.2}
                      color="hsl(var(--muted-foreground))"
                      shimmerColor="hsl(var(--foreground) / 0.85)"
                    />
                  </div>
                </div>
              ) : (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={step}
                    className="h-full min-h-[520px]"
                    initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {step === 0 ? (
                      <div className="flex h-full flex-col gap-6 py-1">
                        <div className="flex items-center justify-center">
                          <Card className="w-full max-w-2xl p-6">
                            <div className="flex flex-col items-center gap-4 text-center">
                              <div className="bg-muted relative h-44 w-44 rounded-full p-1.5 shadow-[inset_0_2px_12px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_2px_12px_rgba(0,0,0,0.55)]">
                                <div className="bg-background h-full w-full overflow-hidden rounded-full shadow-[inset_0_0_18px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_0_18px_rgba(0,0,0,0.35)]">
                                  {preset ? (
                                    <Orb
                                      key={`${preset.id}-${preset.orb.seed}`}
                                      className="pointer-events-none relative h-full w-full"
                                      colors={preset.orb.colors}
                                      seed={preset.orb.seed}
                                      agentState={preset.id === 'custom' ? null : 'listening'}
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                      <Sparkles className="h-12 w-12 text-muted-foreground/60" />
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-2">
                                {preset ? (
                                  <>
                                    <div className="flex items-center justify-center gap-2 text-lg font-semibold leading-tight">
                                      <PresetIcon
                                        presetId={preset.id}
                                        className="h-[1em] w-[1em] shrink-0 text-muted-foreground/90"
                                      />
                                      <span className="leading-none">{preset.name}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">{preset.long}</div>
                                    {preset.id === 'custom' ? (
                                      <div className="text-xs text-muted-foreground">
                                        En el siguiente paso vas a poder escribir tus instrucciones.
                                      </div>
                                    ) : null}
                                  </>
                                ) : (
                                  <>
                                    <div className="text-lg font-semibold leading-tight">Elegí una personalidad</div>
                                    <div className="text-sm text-muted-foreground">
                                      Selecciona una opción de abajo para continuar.
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </Card>
                        </div>

                        <fieldset className="space-y-3">
                          <legend className="text-sm font-medium">Personalidad</legend>
                          <motion.div
                            variants={PRESET_LIST_VARIANTS}
                            initial="hidden"
                            animate="show"
                            className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                          >
                            {PRESETS.map((p) => {
                              const selected = p.id === presetId;
                              return (
                                <motion.label
                                  key={p.id}
                                  variants={PRESET_CARD_VARIANTS}
                                  className={cn(
                                    'shrink-0 w-[160px] cursor-pointer rounded-lg border p-3 transition-colors sm:w-[180px]',
                                    selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                                  )}
                                >
                                  <input
                                    type="radio"
                                    name="wizard-preset"
                                    value={p.id}
                                    checked={selected}
                                    onChange={() => {
                                      setPresetId(p.id);
                                      setValidationError(null);
                                    }}
                                    className="sr-only"
                                  />
                                  <div className="flex flex-col items-center gap-2 text-center">
                                    <div className="bg-muted relative h-14 w-14 rounded-full p-0.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]">
                                      {selected ? (
                                        <motion.div
                                          layoutId="wizard-preset-ring"
                                          className="pointer-events-none absolute -inset-1 rounded-full ring-2 ring-primary ring-offset-2 ring-offset-background"
                                        />
                                      ) : null}
                                      <div className="bg-background h-full w-full overflow-hidden rounded-full shadow-[inset_0_0_12px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_12px_rgba(0,0,0,0.3)]">
                                        <Orb
                                          key={`${p.id}-${p.orb.seed}`}
                                          className="pointer-events-none relative h-full w-full"
                                          colors={p.orb.colors}
                                          seed={p.orb.seed}
                                          agentState={selected ? 'thinking' : null}
                                        />
                                      </div>
                                    </div>
                                    <div className="flex items-start justify-center gap-1.5 text-xs font-medium">
                                      <PresetIcon
                                        presetId={p.id}
                                        className="mt-[0.1em] h-[1em] w-[1em] shrink-0 text-muted-foreground/90"
                                      />
                                      <span className="leading-[1.15]">{p.name}</span>
                                    </div>
                                  </div>
                                </motion.label>
                              );
                            })}
                          </motion.div>
                        </fieldset>
                      </div>
                    ) : null}

                    {step === 1 ? (
                      <motion.div
                        variants={STEP_CONTAINER_VARIANTS}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 gap-4"
                      >
                        <motion.div variants={STEP_ITEM_VARIANTS} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="chatbot-name">Nombre *</Label>
                            <Input
                              id="chatbot-name"
                              value={chatbotName}
                              onChange={(e) => {
                                setChatbotName(e.target.value);
                                setChatbotNameTaken(false);
                                setCheckingNameAvailability(false);
                                setValidationError(null);
                              }}
                              placeholder="Ej: Asistente de Ventas"
                              autoFocus
                              className={cn(
                                isFieldInvalid('chatbot-name')
                                  ? 'border-destructive focus-visible:ring-destructive'
                                  : null
                              )}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Tipo</Label>
                            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-foreground">Chatbot</div>
                          </div>
                        </motion.div>

                        <motion.div variants={STEP_ITEM_VARIANTS} className="space-y-2">
                          <Label htmlFor="chatbot-desc">Descripción</Label>
                          <Textarea
                            id="chatbot-desc"
                            value={chatbotDescription}
                            onChange={(e) => {
                              setChatbotDescription(e.target.value);
                              setValidationError(null);
                            }}
                            placeholder="Ej: Ayuda a analizar ventas y detectar oportunidades."
                            rows={4}
                          />
                        </motion.div>
                      </motion.div>
                    ) : null}

                    {step === 2 ? (
                      <motion.div
                        variants={STEP_CONTAINER_VARIANTS}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 gap-4"
                      >
                        <motion.div variants={STEP_ITEM_VARIANTS} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="wizard-organization">Organización</Label>
                            <Select
                              value={organizationId}
                              onValueChange={(v) => {
                                setValidationError(null);
                                if (v === CREATE_ORG_VALUE) {
                                  setCreateOrgOpen(true);
                                  setCreateProjectOpen(false);
                                  return;
                                }
                                setOrganizationId(v);
                                setCreateOrgOpen(false);
                                const nextProject = projects.find((p) => p.organization_id === v);
                                setProjectId(nextProject?.id ?? '');
                              }}
                            >
                              <SelectTrigger id="wizard-organization">
                                <SelectValue placeholder="Selecciona una organización" />
                              </SelectTrigger>
                              <SelectContent>
                                {organizations.map((org) => (
                                  <SelectItem key={org.id} value={org.id}>
                                    {org.name}
                                  </SelectItem>
                                ))}
                                <SelectSeparator />
                                <SelectItem value={CREATE_ORG_VALUE}>Crear nueva organización…</SelectItem>
                              </SelectContent>
                            </Select>
                            {organizations.length === 0 ? (
                              <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/10 px-3 py-2">
                                <div className="text-xs text-muted-foreground">No hay organizaciones.</div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    setCreateOrgOpen(true);
                                    setCreateProjectOpen(false);
                                  }}
                                >
                                  Crear organización
                                </Button>
                              </div>
                            ) : null}

                            <AnimatePresence initial={false}>
                              {createOrgOpen ? (
                                <motion.div
                                  key="create-org"
                                  initial={{ opacity: 0, y: 8, height: 0 }}
                                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                                  exit={{ opacity: 0, y: 8, height: 0 }}
                                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                                  className="rounded-lg border bg-muted/20 p-3"
                                >
                                  <div className="space-y-3">
                                    <div className="text-sm font-semibold">Nueva organización</div>
                                    <div className="space-y-2">
                                      <Label htmlFor="new-org-name">Nombre</Label>
                                      <Input
                                        id="new-org-name"
                                        value={newOrgName}
                                        onChange={(e) => {
                                          setNewOrgName(e.target.value);
                                          setValidationError(null);
                                        }}
                                        placeholder="Ej: ACME"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="new-org-company">Razón social</Label>
                                      <Input
                                        id="new-org-company"
                                        value={newOrgCompanyName}
                                        onChange={(e) => {
                                          setNewOrgCompanyName(e.target.value);
                                          setValidationError(null);
                                        }}
                                        placeholder="Ej: ACME S.A."
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="new-org-country">País</Label>
                                      <Input
                                        id="new-org-country"
                                        value={newOrgCountry}
                                        onChange={(e) => {
                                          setNewOrgCountry(e.target.value);
                                          setValidationError(null);
                                        }}
                                        placeholder="Ej: Argentina"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="new-org-desc">Descripción</Label>
                                      <Textarea
                                        id="new-org-desc"
                                        value={newOrgDescription}
                                        onChange={(e) => {
                                          setNewOrgDescription(e.target.value);
                                          setValidationError(null);
                                        }}
                                        placeholder="Breve descripción…"
                                        rows={3}
                                      />
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setCreateOrgOpen(false)}
                                        disabled={creatingOrg}
                                      >
                                        Cancelar
                                      </Button>
                                      <Button
                                        type="button"
                                        onClick={() => void handleCreateOrganization()}
                                        disabled={creatingOrg}
                                      >
                                        {creatingOrg ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Crear
                                      </Button>
                                    </div>
                                  </div>
                                </motion.div>
                              ) : null}
                            </AnimatePresence>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="wizard-project">Proyecto *</Label>
                            <Select
                              value={projectId}
                              onValueChange={(v) => {
                                setValidationError(null);
                                setChatbotNameTaken(false);
                                setCheckingNameAvailability(false);
                                if (v === CREATE_PROJECT_VALUE) {
                                  if (!organizationId) {
                                    setValidationError({
                                      step: 2,
                                      message: 'Selecciona una organización antes de crear un proyecto.',
                                      fieldId: 'wizard-organization',
                                    });
                                    requestAnimationFrame(() => {
                                      const el = document.getElementById('wizard-organization');
                                      if (el instanceof HTMLElement) el.focus();
                                    });
                                    return;
                                  }
                                  setCreateProjectOpen(true);
                                  setCreateOrgOpen(false);
                                  return;
                                }
                                setProjectId(v);
                                setCreateProjectOpen(false);
                                const p = projects.find((proj) => proj.id === v);
                                if (!organizationId && p?.organization_id) {
                                  setOrganizationId(p.organization_id);
                                }
                              }}
                            >
                              <SelectTrigger
                                id="wizard-project"
                                className={cn(
                                  isFieldInvalid('wizard-project')
                                    ? 'border-destructive focus:ring-destructive'
                                    : null
                                )}
                              >
                                <SelectValue placeholder="Selecciona un proyecto" />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredProjects.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                                <SelectSeparator />
                                <SelectItem value={CREATE_PROJECT_VALUE}>Crear nuevo proyecto…</SelectItem>
                              </SelectContent>
                            </Select>
                            {filteredProjects.length === 0 ? (
                              <div className="text-xs text-muted-foreground">
                                No hay proyectos disponibles para esta organización.
                              </div>
                            ) : null}

                            <AnimatePresence initial={false}>
                              {createProjectOpen ? (
                                <motion.div
                                  key="create-project"
                                  initial={{ opacity: 0, y: 8, height: 0 }}
                                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                                  exit={{ opacity: 0, y: 8, height: 0 }}
                                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                                  className="rounded-lg border bg-muted/20 p-3"
                                >
                                  <div className="space-y-3">
                                    <div className="text-sm font-semibold">Nuevo proyecto</div>
                                    <div className="space-y-2">
                                      <Label htmlFor="new-project-name">Nombre</Label>
                                      <Input
                                        id="new-project-name"
                                        value={newProjectName}
                                        onChange={(e) => {
                                          setNewProjectName(e.target.value);
                                          setValidationError(null);
                                        }}
                                        placeholder="Ej: Ventas Q4"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="new-project-desc">Descripción (opcional)</Label>
                                      <Textarea
                                        id="new-project-desc"
                                        value={newProjectDescription}
                                        onChange={(e) => {
                                          setNewProjectDescription(e.target.value);
                                          setValidationError(null);
                                        }}
                                        placeholder="Breve descripción…"
                                        rows={3}
                                      />
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setCreateProjectOpen(false)}
                                        disabled={creatingProject}
                                      >
                                        Cancelar
                                      </Button>
                                      <Button
                                        type="button"
                                        onClick={() => void handleCreateProject()}
                                        disabled={creatingProject}
                                      >
                                        {creatingProject ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Crear
                                      </Button>
                                    </div>
                                  </div>
                                </motion.div>
                              ) : null}
                            </AnimatePresence>
                          </div>
                        </motion.div>

                        <motion.div variants={STEP_ITEM_VARIANTS} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="welcome-message">Mensaje de bienvenida</Label>
                            <Textarea
                              id="welcome-message"
                              value={welcomeMessage}
                              onChange={(e) => {
                                welcomeEditedRef.current = true;
                                setWelcomeMessage(e.target.value);
                                setValidationError(null);
                              }}
                              placeholder="Ej: ¡Hola! ¿Qué te gustaría analizar hoy?"
                              rows={3}
                            />
                          </div>

                          <div className="rounded-lg border p-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="text-sm font-semibold">Documentos</div>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Si lo activas, podrás subir archivos (PDF/CSV/XLSX/TXT) para que el chatbot los use como conocimiento.
                              </div>
                              <motion.label
                                htmlFor="enable-rag"
                                className={cn(
                                  'mt-2 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors',
                                  enableRag ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/10 hover:bg-muted/20'
                                )}
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.99 }}
                                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                              >
                                <Checkbox
                                  id="enable-rag"
                                  checked={enableRag}
                                  onCheckedChange={(v) => {
                                    setEnableRag(Boolean(v));
                                    setValidationError(null);
                                  }}
                                />
                                <span className="text-sm font-medium">Activar documentos</span>
                              </motion.label>
                            </div>
                          </div>
                        </motion.div>

                        <motion.div variants={STEP_ITEM_VARIANTS} className="rounded-lg border p-4">
                          <div className="flex items-center gap-2">
                            <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="text-sm font-semibold">Opciones</div>
                          </div>
                          <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <motion.label
                              className={cn(
                                'flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 transition-colors',
                                enableAlerts ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/10 hover:bg-muted/20'
                              )}
                              whileHover={{ y: -1 }}
                              whileTap={{ scale: 0.99 }}
                              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            >
                              <Checkbox
                                checked={enableAlerts}
                                onCheckedChange={(v) => {
                                  setEnableAlerts(Boolean(v));
                                  setValidationError(null);
                                }}
                                className="mt-0.5"
                              />
                              <span>
                                <div className="text-sm font-medium">Activar alertas</div>
                                <div className="text-xs text-muted-foreground">
                                  Permite configurar alertas automáticas más adelante.
                                </div>
                              </span>
                            </motion.label>
                            <motion.label
                              className={cn(
                                'flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 transition-colors',
                                enableInsight ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/10 hover:bg-muted/20'
                              )}
                              whileHover={{ y: -1 }}
                              whileTap={{ scale: 0.99 }}
                              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            >
                              <Checkbox
                                checked={enableInsight}
                                onCheckedChange={(v) => {
                                  setEnableInsight(Boolean(v));
                                  setValidationError(null);
                                }}
                                className="mt-0.5"
                              />
                              <span>
                                <div className="text-sm font-medium">Activar insights</div>
                                <div className="text-xs text-muted-foreground">
                                  Habilita funcionalidades de insights del producto.
                                </div>
                              </span>
                            </motion.label>
                          </div>
                        </motion.div>
                      </motion.div>
                    ) : null}

                    {step === 3 ? (
                      <motion.div
                        variants={STEP_CONTAINER_VARIANTS}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 gap-4"
                      >
                        <motion.div variants={STEP_ITEM_VARIANTS} className="space-y-2">
                          <Label htmlFor="custom-prompt">Instrucciones para el asistente *</Label>
                          <Textarea
                            id="custom-prompt"
                            value={customPrompt}
                            onChange={(e) => {
                              setCustomPrompt(e.target.value);
                              setValidationError(null);
                            }}
                            placeholder="Ej: Ayuda a analizar ventas, explica en pasos simples y sugiere gráficos si aporta valor."
                            rows={6}
                            className={cn(
                              isFieldInvalid('custom-prompt')
                                ? 'border-destructive focus-visible:ring-destructive'
                                : null
                            )}
                          />
                          <div className="text-xs text-muted-foreground">
                            Consejo: escribe como si se lo explicaras a una persona del equipo.
                          </div>
                        </motion.div>

                        <motion.div variants={STEP_ITEM_VARIANTS} className="space-y-2">
                          <Label htmlFor="system-context">Contexto del negocio (opcional)</Label>
                          <Textarea
                            id="system-context"
                            value={systemContext}
                            onChange={(e) => {
                              setSystemContext(e.target.value);
                              setValidationError(null);
                            }}
                            placeholder="Ej: Somos una empresa de… Nuestros KPIs principales son…"
                            rows={4}
                          />
                        </motion.div>

                        <motion.div variants={STEP_ITEM_VARIANTS} className="rounded-lg border p-3">
                          <div className="text-sm font-semibold">Antes de continuar</div>
                          <div className="text-sm text-muted-foreground">
                            En el próximo paso vamos a crear el chatbot.
                          </div>
                        </motion.div>
                      </motion.div>
                    ) : null}

                    {step === 4 ? (
                      <motion.div
                        variants={STEP_CONTAINER_VARIANTS}
                        initial="hidden"
                        animate="show"
                        className="space-y-4"
                      >
                        {finalizing ? (
                          <motion.div
                            variants={STEP_ITEM_VARIANTS}
                            className="flex flex-col items-center justify-center py-16 text-center"
                          >
                            <div className="bg-muted relative h-36 w-36 rounded-full p-1.5 shadow-[inset_0_2px_12px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_2px_12px_rgba(0,0,0,0.55)]">
                              <div className="bg-background h-full w-full overflow-hidden rounded-full shadow-[inset_0_0_18px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_0_18px_rgba(0,0,0,0.35)]">
                                <Orb
                                  className="pointer-events-none relative h-full w-full"
                                  colors={preset?.orb.colors}
                                  seed={preset?.orb.seed}
                                  agentState="thinking"
                                />
                              </div>
                            </div>

                            <div className="mt-6 min-h-[28px]">
                              <ShimmeringText
                                text={finalizeMessages[finalizeMessageIndex] ?? 'Procesando…'}
                                className="text-lg font-semibold"
                                duration={3.8}
                                repeatDelay={0.2}
                                repeat={true}
                                startOnView={false}
                                spread={1.4}
                                color="hsl(var(--muted-foreground))"
                                shimmerColor="hsl(var(--foreground) / 0.85)"
                              />
                            </div>
                            {chatbotName ? (
                              <div className="mt-2 text-sm text-muted-foreground">{chatbotName}</div>
                            ) : null}
                          </motion.div>
                        ) : postCreateReady && createdProductId ? (
                          <motion.div
                            variants={STEP_ITEM_VARIANTS}
                            className="relative flex flex-col items-center justify-center py-10 text-center"
                          >
                            <ConfettiBurst burstKey={createdProductId} />
                            <div className="bg-muted relative h-28 w-28 rounded-full p-1.5 shadow-[inset_0_2px_12px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_2px_12px_rgba(0,0,0,0.55)]">
                              <div className="bg-background h-full w-full overflow-hidden rounded-full shadow-[inset_0_0_18px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_0_18px_rgba(0,0,0,0.35)]">
                                <Orb
                                  className="pointer-events-none relative h-full w-full"
                                  colors={preset?.orb.colors}
                                  seed={preset?.orb.seed}
                                  agentState="listening"
                                />
                              </div>
                            </div>

                            <div className="mt-6 space-y-2">
                              <div className="text-lg font-semibold">Tu chatbot está listo</div>
                              <div className="text-sm text-muted-foreground">
                                ¿Querés probarlo ahora o seguir configurándolo más en detalle?
                              </div>
                            </div>

                            <div className="mt-6 grid w-full max-w-xs grid-cols-1 gap-2 mx-auto">
                              <Button
                                type="button"
                                className="gap-2"
                                onClick={() => {
                                  window.open(`/chatbot/${createdProductId}`, '_blank', 'noopener,noreferrer');
                                  setOpen(false);
                                }}
                              >
                                <ExternalLink className="h-4 w-4" />
                                Probar ahora
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                className="gap-2"
                                onClick={() => {
                                  const base = navOrgId && projectId
                                    ? `${basePath}/organizations/${navOrgId}/projects/${projectId}/chatbots/${createdProductId}?section=general`
                                    : `${basePath}/chatbots`;
                                  router.push(base);
                                  setOpen(false);
                                }}
                              >
                                <SlidersHorizontal className="h-4 w-4" />
                                Configuración avanzada
                              </Button>
                            </div>

                            <div className="mt-10 flex items-center justify-center gap-2 text-[11px] text-muted-foreground/70">
                              <span className="inline-flex items-center gap-1.5">
                                <Keycap>
                                  <span aria-hidden>↵</span>
                                </Keycap>
                                <span>Probar</span>
                              </span>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="inline-flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1">
                                  <Keycap>
                                    <span aria-hidden>⇧</span>
                                  </Keycap>
                                  <Keycap>
                                    <span aria-hidden>↵</span>
                                  </Keycap>
                                </span>
                                <span>Configuración</span>
                              </span>
                            </div>
                          </motion.div>
                        ) : (
                          <>
                            <motion.div variants={STEP_ITEM_VARIANTS} className="rounded-lg border p-4">
                              <div className="text-sm font-semibold">Resumen</div>
                              <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-muted-foreground md:grid-cols-2">
                                <div>
                                  <span className="text-foreground">Asistente:</span> {preset?.name}
                                </div>
                                <div>
                                  <span className="text-foreground">Tipo:</span> {chatbotType}
                                </div>
                                <div className="md:col-span-2">
                                  <span className="text-foreground">Nombre:</span> {chatbotName || '—'}
                                </div>
                                <div className="md:col-span-2">
                                  <span className="text-foreground">Proyecto:</span> {selectedProject?.name || '—'}
                                </div>
                                <div>
                                  <span className="text-foreground">Documentos:</span> {enableRag ? 'Sí' : 'No'}
                                </div>
                                <div>
                                  <span className="text-foreground">Alertas:</span> {enableAlerts ? 'Sí' : 'No'}
                                </div>
                                <div>
                                  <span className="text-foreground">Insights:</span> {enableInsight ? 'Sí' : 'No'}
                                </div>
                              </div>
                            </motion.div>

                            {creating ? (
                              <motion.div
                                variants={STEP_ITEM_VARIANTS}
                                className="flex items-center justify-center py-10 text-sm text-muted-foreground"
                              >
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creando chatbot…
                              </motion.div>
                            ) : !enableRag ? (
                              <motion.div variants={STEP_ITEM_VARIANTS} className="rounded-lg border p-4">
                                <div className="text-sm font-semibold">Listo</div>
                                <div className="text-sm text-muted-foreground">
                                  No activaste documentos. Puedes finalizar y ajustar más opciones desde la pantalla del chatbot.
                                </div>
                              </motion.div>
                            ) : !createdProductId ? (
                              <motion.div variants={STEP_ITEM_VARIANTS} className="rounded-lg border p-4 space-y-3">
                                <div>
                                  <div className="text-sm font-semibold">Crear chatbot para subir documentos</div>
                                  <div className="text-sm text-muted-foreground">
                                    Para habilitar la carga de archivos necesitamos crear el chatbot primero.
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    onClick={() => void createChatbot()}
                                    disabled={creating}
                                    className="gap-2"
                                  >
                                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    Crear chatbot
                                  </Button>
                                  <div className="text-xs text-muted-foreground">
                                    O puedes finalizar ahora y subir documentos más tarde.
                                  </div>
                                </div>
                              </motion.div>
                            ) : (
                              <>
                                <motion.div
                                  variants={STEP_ITEM_VARIANTS}
                                  className="flex items-center justify-between gap-3"
                                >
                                  <div>
                                    <div className="text-sm font-semibold">Sube documentos</div>
                                    <div className="text-sm text-muted-foreground">
                                      Arrastra y suelta un archivo o elige uno. Se procesará en segundo plano.
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      ref={fileInputRef}
                                      type="file"
                                      className="hidden"
                                      accept=".pdf,.csv,.xlsx,.txt,text/plain,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) void handleUpload(file);
                                      }}
                                    />
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      disabled={uploading}
                                      onClick={() => fileInputRef.current?.click()}
                                      className="gap-2"
                                    >
                                      {uploading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Upload className="h-4 w-4" />
                                      )}
                                      Elegir archivo
                                    </Button>
                                  </div>
                                </motion.div>

                                <motion.div
                                  variants={STEP_ITEM_VARIANTS}
                                  className={cn(
                                    'rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground transition-colors',
                                    uploading ? 'opacity-60' : 'hover:bg-accent'
                                  )}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const file = e.dataTransfer.files?.[0];
                                    if (file) void handleUpload(file);
                                  }}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      fileInputRef.current?.click();
                                    }
                                  }}
                                >
                                  Arrastra y suelta aquí
                                </motion.div>

                                <motion.div variants={STEP_ITEM_VARIANTS} className="rounded-lg border p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="text-sm font-semibold">Documentos subidos</div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => createdProductId && loadDocuments(createdProductId)}
                                      disabled={loadingDocs}
                                    >
                                      {loadingDocs ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Actualizar'}
                                    </Button>
                                  </div>

                                  {loadingDocs ? (
                                    <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Cargando…
                                    </div>
                                  ) : documents.length === 0 ? (
                                    <div className="py-6 text-sm text-muted-foreground">Aún no subiste documentos.</div>
                                  ) : (
                                    <div className="mt-3 space-y-2">
                                      {documents.slice(0, 8).map((doc) => {
                                        const badge = getStatusBadge(doc.status);
                                        return (
                                          <div
                                            key={doc.id}
                                            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                                          >
                                            <div className="min-w-0">
                                              <div className="truncate text-sm font-medium">{doc.filename}</div>
                                              <div className="mt-1">
                                                <Badge variant="outline" className={badge.className}>
                                                  {badge.label}
                                                </Badge>
                                              </div>
                                            </div>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              disabled={deletingDocId === doc.id}
                                              onClick={() => void handleDeleteDoc(doc.id)}
                                              aria-label="Eliminar documento"
                                            >
                                              {deletingDocId === doc.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                              ) : (
                                                <X className="h-4 w-4" />
                                              )}
                                            </Button>
                                          </div>
                                        );
                                      })}
                                      {documents.length > 8 ? (
                                        <div className="text-xs text-muted-foreground">
                                          Mostrando 8 de {documents.length}. Puedes ver el resto en la pantalla del chatbot.
                                        </div>
                                      ) : null}
                                    </div>
                                  )}
                                </motion.div>
                              </>
                            )}
                          </>
                        )}
                      </motion.div>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            <DialogFooter className="shrink-0 gap-2 sm:gap-2">
              {!postCreateReady ? (
                <motion.div
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        try {
                          window.localStorage.removeItem(WIZARD_DRAFT_STORAGE_KEY);
                        } catch {
                          null;
                        }
                      }
                      setOpen(false);
                    }}
                    disabled={creating || finalizing}
                  >
                    Cancelar
                  </Button>
                </motion.div>
              ) : null}
              <div className="flex-1" />
              {step > 0 && !postCreateReady ? (
                <motion.div
                  whileHover={creating || finalizing ? undefined : { y: -1 }}
                  whileTap={creating || finalizing ? undefined : { scale: 0.98 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setValidationError(null);
                      onBack();
                    }}
                    disabled={creating || finalizing}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Atrás
                  </Button>
                </motion.div>
              ) : null}

              {step < totalSteps - 1 && !postCreateReady ? (
                <motion.div
                  whileHover={creating || finalizing ? undefined : { y: -1 }}
                  whileTap={creating || finalizing ? undefined : { scale: 0.98 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Button
                    type="button"
                    onClick={() => void attemptNext()}
                    disabled={creating || finalizing || !canGoNext}
                    aria-disabled={!canGoNext}
                    className={cn('gap-2', !canGoNext ? 'opacity-80' : null)}
                  >
                    Continuar
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              ) : step === totalSteps - 1 && !postCreateReady ? (
                <motion.div
                  whileHover={creating || finalizing ? undefined : { y: -1 }}
                  whileTap={creating || finalizing ? undefined : { scale: 0.98 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Button
                    type="button"
                    onClick={() => void onFinish()}
                    disabled={creating || finalizing}
                    className="gap-2"
                  >
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Finalizar
                  </Button>
                </motion.div>
              ) : postCreateReady ? (
                <motion.div
                  whileHover={creating || finalizing ? undefined : { y: -1 }}
                  whileTap={creating || finalizing ? undefined : { scale: 0.98 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Button type="button" onClick={() => setOpen(false)} disabled={creating || finalizing}>
                    Cerrar
                  </Button>
                </motion.div>
              ) : null}
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
}
