export interface ChartSeries {
  name: string;
  data: number[];
  color?: string | null;
}

export type EncodingType = 'temporal' | 'nominal' | 'ordinal' | 'quantitative';
export interface EncodingAxis {
  type: EncodingType;
  format?: string;
  unit?: string;
}

export interface ChartSpec {
  type?: 'bar' | 'line' | 'pie' | 'scatter';
  mark?: 'bar' | 'line' | 'area' | 'pie' | 'scatter';
  encoding?: { x: EncodingAxis; y: EncodingAxis };

  title?: string | null;
  labels: string[];
  series: ChartSeries[];
  meta?: Record<string, any> | null;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  type: 'user' | 'assistant' | 'function' | 'error';
  content: string;
  chart?: string | string[];
  chartSpec?: ChartSpec;
  createdAt: Date | string;
  updatedAt?: Date | string; // Timestamp de cuando el mensaje fue actualizado
  name?: string;
  functionName?: string;
  functionDetails?: any;
  errorDetails?: any;
  error?: string; // Campo para almacenar el mensaje de error detallado
  _skipEditorUI?: boolean; // Bandera para indicar si se debe saltar la UI del editor antiguo
  isEdited?: boolean; // Indica si el mensaje fue editado
  isUpdatedResponse?: boolean; // Indica si es una respuesta actualizada a un mensaje editado
  knowledgeUsed?: boolean; // Indica si la respuesta utilizó archivos de conocimiento
}

export interface FunctionCallResult {
  resultado: string | Record<string, number>;
  detalle: Record<string, any>;
}

export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  inputValue?: string;
  setInputValue?: React.Dispatch<React.SetStateAction<string>>;
  suggestedPrompts?: string[];
}

export interface MessageListProps {
  messages: Message[];
  isTyping?: boolean;
  messagesEndRef?: React.RefObject<HTMLDivElement>;
  onEditMessage: (message: Message) => void;
  onDeleteMessage: (id: string) => void;
  onCopyMessage?: (content: string) => void;
}

export interface ChatHeaderProps {
  username: string;
  onToggleSidebar?: () => void;
}

export interface FeatureButtonsProps {
  onSuggestionClick?: (suggestion: string) => void;
}

export interface MessageProps {
  message: Message;
}

export interface WorkflowResult {
  message: string;
  functionDetails?: FunctionCallResult;
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: Message[];
}

export interface ChatSidebarProps {
  visible: boolean;
  onToggle: () => void;
  activeConversationId?: string;
  conversations: Conversation[];
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation?: (conversationId: string) => void;
  onRenameConversation?: (conversationId: string, newTitle: string) => void;
  onClearAllConversations?: () => void;
  onShowTutorial?: () => void;
  className?: string;
  clientName?: string;
  chatbotName?: string;
  productId?: string;
  userId?: string;
  // User Navigation Props
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  onLogout?: () => void;
  onProfileClick?: () => void;
}
