export const functionTools = [
  {
    name: "calcular_fallas_trabajador",
    description: "Calcula cantidad de fallas de un trabajador en un mes y año específico",
    parameters: {
      type: "object",
      properties: {
        rut: { type: "string", description: "documento identidad del trabajador" },
        mes: { type: "string", description: "mes donde están las fallas registradas (enero,febrero,marzo,abril,mayo,junio,julio,agosto,setiembre,octubre,noviembre,diciembre)" },
        año: { type: "number", description: "año donde están las fallas registradas (2025,2024,2023,...)" }
      },
      required: ["rut", "mes", "año"],
    }
  },
  {
    name: "calcular_fallas_centro",
    description: "Calcula cantidad de fallas agrupado por centro de trabajo durante un periodo",
    parameters: {
      type: "object",
      properties: {
        fecha_inicio: { type: "string", format: "date", description: "fecha donde se registró por primera vez la falla (YYYY-MM-DD)" },
        fecha_termino: { type: "string", format: "date", description: "fecha donde se registró por última vez la falla (YYYY-MM-DD)" }
      },
      required: ["fecha_inicio", "fecha_termino"]
    }
  },
  {
    name: "listar_fallas_fecha",
    description: "Calcular cantidad de personas que fallaron en una fecha específica",
    parameters: {
      type: "object",
      properties: {
        fecha_inicio: { type: "string", format: "date", description: "fecha donde se ha registrado la falla (YYYY-MM-DD)" }
      },
      required: ["fecha_inicio"]
    }
  },
  {
    name: "listar_centros_fallas",
    description: "Lista centros donde hubo fallas en fechas específicas",
    parameters: {
      type: "object",
      properties: {
        fecha_inicio: { type: "string", format: "date", description: "fecha donde se registró por primera vez la falla (YYYY-MM-DD)" },
        fecha_termino: { type: "string", format: "date", description: "fecha donde se registró por última vez la falla (YYYY-MM-DD)" }
      },
      required: ["fecha_inicio", "fecha_termino"]
    }
  },
  {
    name: "listar_trabajadores_centro",
    description: "Lista trabajadores de un centro específico",
    parameters: {
      type: "object",
      properties: {
        centro: { type: "string", description: "es el codigo del centro donde labora el trabajador (ejemplo: C468)" }
      },
      required: ["centro"]
    }
  },
  {
    name: "calcular_dias_trabajados",
    description: "Calcular días trabajados por centro (considerando 30 días menos fallas, licencias y permisos)",
    parameters: {
      type: "object",
      properties: {
        centro: { type: "string", description: "es el codigo del centro donde labora el trabajador (ejemplo: C468)" },
        mes: { type: "string", description: "mes donde están las fallas registradas (enero,febrero,marzo,abril,mayo,junio,julio,agosto,setiembre,octubre,noviembre,diciembre)" },
        año: { type: "number", description: "año donde están las fallas registradas (2025,2024,2023,...)" }
      },
      required: ["centro", "mes", "año"]
    }
  },
  {
    name: "contar_traslados",
    description: "Calcula cantidad de traslados en una fecha específica",
    parameters: {
      type: "object",
      properties: {
        fecha_inicio: { type: "string", format: "date", description: "fecha donde se registraron traslados (YYYY-MM-DD)" }
      },
      required: ["fecha_inicio"]
    }
  },
  {
    name: "contar_licencias",
    description: "Consultar cantidad de personas con licencia en un periodo",
    parameters: {
      type: "object",
      properties: {
        fecha_inicio: { type: "string", format: "date", description: "fecha donde se registró por primera vez la licencia (YYYY-MM-DD)" },
        fecha_termino: { type: "string", format: "date", description: "fecha donde se registró por última vez la licencia (YYYY-MM-DD)" }
      },
      required: ["fecha_inicio", "fecha_termino"]
    }
  },
  {
    name: "contar_vacaciones",
    description: "Calcula cantidad de personas de vacaciones en un periodo",
    parameters: {
      type: "object",
      properties: {
        fecha_inicio: { type: "string", format: "date", description: "fecha donde se registró por primera vez las vacaciones (YYYY-MM-DD)" },
        fecha_termino: { type: "string", format: "date", description: "fecha donde se registró por última vez las vacaciones (YYYY-MM-DD)" }
      },
      required: ["fecha_inicio", "fecha_termino"]
    }
  },
  {
    name: "total_dias_licencia",
    description: "Calcula total de días de licencia en un periodo específico",
    parameters: {
      type: "object",
      properties: {
        fecha_inicio: { type: "string", format: "date", description: "fecha donde se registró por primera vez la licencia (YYYY-MM-DD)" },
        fecha_termino: { type: "string", format: "date", description: "fecha donde se registró por última vez la licencia (YYYY-MM-DD)" }
      },
      required: ["fecha_inicio", "fecha_termino"]
    }
  }
];
