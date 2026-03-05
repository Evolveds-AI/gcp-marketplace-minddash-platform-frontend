// Detecta si un mensaje contiene una tabla en formato markdown
export function isTableMessage(message) {
    // Busca patrones típicos de tabla markdown
    const tablePatterns = [
        /\|.*\|.*\|/g, // Líneas con pipes múltiples
        /\|.*:[-]+.*\|/g, // Líneas de separación con :---
        /^\|.*\|$/gm // Líneas que empiezan y terminan con pipe
    ];

    return tablePatterns.some(pattern => pattern.test(message));
}

// Separa un mensaje en texto inicial, tabla y pie descriptivo
export function separateTableMessage(message) {
    const lines = message.split('\n');
    let textoInicial = '';
    let tablaLineas = [];
    let pieDescriptivo = '';

    let enTabla = false;
    let tablaTerminada = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Detectar inicio de tabla (línea con |)
        if (!enTabla && line.includes('|')) {
            enTabla = true;
            tablaLineas.push(lines[i]);
        }
        // Si estamos en tabla, continuar agregando líneas con |
        else if (enTabla && line.includes('|')) {
            tablaLineas.push(lines[i]);
        }
        // Si estamos en tabla pero la línea no tiene |, tabla terminó
        else if (enTabla && !line.includes('|')) {
            enTabla = false;
            tablaTerminada = true;
            // Si hay contenido después de la tabla, es pie descriptivo
            if (line) {
                pieDescriptivo += lines[i] + '\n';
            }
        }
        // Texto después de la tabla
        else if (tablaTerminada) {
            pieDescriptivo += lines[i] + '\n';
        }
        // Texto antes de la tabla
        else if (!enTabla && !tablaTerminada) {
            textoInicial += lines[i] + '\n';
        }
    }

    // Limpiar espacios extra
    textoInicial = textoInicial.trim();
    pieDescriptivo = pieDescriptivo.trim();
    const soloTabla = tablaLineas.join('\n');

    return {
        textoInicial,
        soloTabla,
        pieDescriptivo
    };
}

// Parsea una tabla markdown y la convierte en un array de objetos
export function parseMarkdownTable(tableText) {
    const lines = tableText.split('\n').filter(line => line.trim());
    const tableLines = lines.filter(line => line.includes('|'));

    if (tableLines.length < 2) return null;

    // Extraer headers (primera línea con |)
    const headerLine = tableLines[0];
    const headers = headerLine.split('|')
        .map(h => h.trim())
        .filter(h => h && h !== ':---' && h !== ':' && !h.match(/^:?-+:?$/));

    // Extraer filas (saltar la línea de separación)
    const dataLines = tableLines.slice(2); // Saltar header y separator
    const rows = dataLines.map(line => {
        const cells = line.split('|')
            .map(c => c.trim())
            .filter(c => c);

        const row = {};
        headers.forEach((header, index) => {
            row[header] = cells[index] || '';
        });
        return row;
    });

    return { headers, rows };
}

// Formato de tarjetas
export function formatAsCards(tableData, title = '') {
    if (!tableData || !tableData.rows) return '';

    let formatted = '';

    // Agregar título si existe
    if (title) {
        formatted += `📊 *${title}*\n\n`;
    }

    // Formatear cada fila como una tarjeta
    tableData.rows.forEach((row, index) => {
        formatted += `┌─ *${index + 1}.* ─────────────\n`;

        Object.entries(row).forEach(([key, value]) => {
            formatted += `│ *${key}:* ${value}\n`;
        });

        formatted += `└─────────────────\n\n`;
    });

    return formatted.trim();
}

// Formato de lista
export function formatAsList(tableData, title = '') {
    if (!tableData || !tableData.rows) return '';

    let formatted = '';

    // Agregar título si existe
    if (title) {
        formatted += `📊 *${title}*\n\n`;
    }

    // Formatear cada fila como elemento de lista
    tableData.rows.forEach((row) => {
        formatted += `🔸 *${Object.values(row)[0]}*\n`;

        // Agregar el resto de las columnas con indentación
        Object.entries(row).slice(1).forEach(([key, value]) => {
            formatted += `   • *${key}:* ${value}\n`;
        });

        formatted += '\n';
    });

    return formatted.trim();
}


// Función principal que formatea una tabla detectada automáticamente
export function formatTableMessage(message, format = 'cards') {
    if (!isTableMessage(message)) {
        return message; // Devolver el mensaje original si no es tabla
    }

    // Extraer el título (texto antes de la tabla)
    const parts = message.split('\n\n');
    const title = parts[0]?.replace(/[#*]/g, '').trim() || '';

    // Parsear tabla
    const tableData = parseMarkdownTable(message);

    if (!tableData) {
        return message; // Devolver original si no se puede parsear
    }

    // Formatear según el tipo elegido
    switch (format) {
        case 'list':
            return formatAsList(tableData, title);
        case 'cards':
        default:
            return formatAsCards(tableData, title);
    }
} 