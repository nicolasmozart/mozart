# API de Disponibilidad del Doctor

Esta documentación describe los endpoints para manejar la disponibilidad de los doctores, incluyendo la configuración semanal y las excepciones de fechas específicas.

## Estructura de Datos

### Disponibilidad Semanal
```typescript
interface DisponibilidadDia {
  dia: string;           // 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'
  horaInicio: string;    // '08:00'
  horaFin: string;       // '17:00'
  activo: boolean;       // true/false
  intervalos: Intervalo[];
}

interface Intervalo {
  inicio: string;        // '08:00'
  fin: string;           // '08:30'
  disponible: boolean;   // true/false
}
```

### Excepción de Fecha
```typescript
interface ExcepcionFecha {
  fecha: Date;           // Fecha específica
  horaInicio: string;    // '09:00'
  horaFin: string;       // '15:00'
  intervalos: Intervalo[];
}
```

## Endpoints

### 1. Guardar Disponibilidad Semanal
**POST** `/api/doctor/disponibilidad`

Guarda la disponibilidad semanal del doctor y genera automáticamente los intervalos basados en la duración de cita.

**Body:**
```json
{
  "disponibilidad": [
    {
      "dia": "lunes",
      "horaInicio": "08:00",
      "horaFin": "17:00",
      "activo": true
    },
    {
      "dia": "martes",
      "horaInicio": "08:00",
      "horaFin": "17:00",
      "activo": true
    }
  ],
  "duracionCita": 30,
  "userId": "doctor_user_id"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Disponibilidad guardada correctamente",
  "disponibilidad": [...]
}
```

### 2. Obtener Disponibilidad del Doctor
**GET** `/api/doctor/disponibilidad/:userId`

Obtiene la disponibilidad semanal y excepciones de un doctor específico.

**Respuesta:**
```json
{
  "success": true,
  "disponibilidad": [...],
  "excepcionesFechas": [...],
  "duracionCita": 30,
  "doctorName": "Dr. Juan Pérez"
}
```

### 3. Agregar Excepción de Fecha
**POST** `/api/doctor/disponibilidad/excepcion`

Agrega una excepción para una fecha específica (ej: vacaciones, horario especial).

**Body:**
```json
{
  "fecha": "2024-01-15",
  "horaInicio": "09:00",
  "horaFin": "15:00",
  "duracionCita": 30,
  "userId": "doctor_user_id"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Excepción de fecha agregada correctamente",
  "excepcion": {...}
}
```

### 4. Eliminar Excepción de Fecha
**DELETE** `/api/doctor/disponibilidad/excepcion`

Elimina una excepción de fecha específica.

**Body:**
```json
{
  "excepcionId": "excepcion_id",
  "userId": "doctor_user_id"
}
```

### 5. Consultar Disponibilidad para Fecha Específica
**GET** `/api/doctor/:doctorId/disponibilidad-fecha?fecha=2024-01-15`

Consulta la disponibilidad de un doctor para una fecha específica (útil para agendar citas).

**Query Parameters:**
- `fecha`: Fecha en formato YYYY-MM-DD

**Respuesta:**
```json
{
  "success": true,
  "disponibilidad": {
    "doctorId": "doctor_id",
    "doctorName": "Dr. Juan Pérez",
    "fecha": "2024-01-15",
    "diaSemana": "lunes",
    "duracionCita": 30,
    "horariosDisponibles": [
      {
        "inicio": "08:00",
        "fin": "08:30",
        "disponible": true
      }
    ],
    "tieneExcepcion": false,
    "excepcion": null
  }
}
```

## Generación Automática de Intervalos

El sistema genera automáticamente los intervalos de tiempo basándose en:
- `horaInicio` y `horaFin` del día
- `duracionCita` configurada

**Ejemplo:**
- Si configuras lunes de 10:00 a 12:00 con duración de cita de 30 minutos
- Se generarán automáticamente 4 intervalos:
  - 10:00 - 10:30
  - 10:30 - 11:00
  - 11:00 - 11:30
  - 11:30 - 12:00

## Prioridad de Disponibilidad

1. **Excepciones de fecha**: Tienen prioridad sobre la disponibilidad semanal
2. **Disponibilidad semanal**: Se usa cuando no hay excepción para esa fecha
3. **Día inactivo**: Si el día está marcado como `activo: false`, no hay disponibilidad

## Casos de Uso

### Configuración Inicial
1. El doctor configura su disponibilidad semanal
2. El sistema genera automáticamente los intervalos
3. Se almacena en la base de datos

### Excepciones
1. El doctor marca un día específico como no disponible
2. O cambia el horario para una fecha específica
3. Se crea una excepción que sobrescribe la disponibilidad semanal

### Consulta para Citas
1. El paciente selecciona una fecha
2. El sistema consulta la disponibilidad del doctor
3. Se muestran solo los horarios disponibles
4. Se puede agendar la cita en cualquier intervalo disponible

## Notas Importantes

- Los intervalos se generan automáticamente para evitar crear miles de objetos
- Las excepciones tienen prioridad sobre la disponibilidad semanal
- La duración de cita se puede configurar por doctor
- Todos los endpoints requieren autenticación del tenant
- Se mantiene un log de todas las operaciones realizadas
