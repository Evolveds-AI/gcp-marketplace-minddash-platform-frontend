import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExportMessage {
  role: string;
  content: string;
  createdAt: Date | string;
}

interface ExportConversation {
  id: string;
  title: string;
  timestamp: Date | string;
  messages: ExportMessage[];
}

/**
 * Export a single conversation as a TXT file
 */
export function exportConversationAsTxt(conversation: ExportConversation) {
  const lines: string[] = [];
  lines.push(`═══════════════════════════════════════════`);
  lines.push(`  ${conversation.title}`);
  lines.push(`  ${format(new Date(conversation.timestamp), "d 'de' MMMM yyyy, HH:mm", { locale: es })}`);
  lines.push(`═══════════════════════════════════════════`);
  lines.push('');

  for (const msg of conversation.messages) {
    const time = format(new Date(msg.createdAt), 'HH:mm', { locale: es });
    const sender = msg.role === 'user' ? '👤 Tú' : '🤖 Asistente';
    lines.push(`[${time}] ${sender}:`);
    lines.push(msg.content);
    lines.push('');
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `conversacion-${sanitizeFilename(conversation.title)}.txt`);
}

/**
 * Export multiple conversations as a single CSV file
 */
export function exportConversationsAsCsv(conversations: ExportConversation[]) {
  const rows: string[][] = [
    ['Conversación', 'Fecha', 'Hora', 'Rol', 'Mensaje']
  ];

  for (const conv of conversations) {
    for (const msg of conv.messages) {
      const date = new Date(msg.createdAt);
      rows.push([
        conv.title,
        format(date, 'yyyy-MM-dd'),
        format(date, 'HH:mm:ss'),
        msg.role === 'user' ? 'Usuario' : 'Asistente',
        msg.content
      ]);
    }
  }

  const csvContent = rows.map(row =>
    row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const bom = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  downloadBlob(blob, `historial-conversaciones-${dateStr}.csv`);
}

/**
 * Export a single conversation as CSV
 */
export function exportConversationAsCsv(conversation: ExportConversation) {
  exportConversationsAsCsv([conversation]);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
    .toLowerCase();
}
