# Sistema de Logs Consolidado

## Descripción
Este sistema de logs ha sido configurado para consolidar todos los logs en un solo archivo en lugar de crear archivos por fecha.

## Archivos de Log
- **`mozart.log`** - Logs principales (info, warn, debug)
- **`errors.log`** - Solo errores
- **`exceptions.log`** - Excepciones no capturadas

## Configuración
- **Tamaño máximo**: 50MB para logs principales, 20MB para errores, 10MB para excepciones
- **Archivos**: Solo 1 archivo por tipo (no más rotación diaria)
- **Retención**: 30 días

## Comandos Disponibles

### Consolidar Logs Existentes
```bash
npm run consolidate-logs
```

Este comando:
1. Lee todos los archivos de log existentes
2. Los consolida en archivos únicos
3. Elimina los archivos antiguos por fecha
4. Crea archivos consolidados:
   - `mozart-consolidated.log`
   - `errors-consolidated.log`
   - `exceptions-consolidated.log`

### Limpieza Automática
El sistema automáticamente:
- Mantiene solo 1 archivo por tipo
- Limpia logs antiguos después de 30 días
- Gestiona el tamaño de archivos

## Ventajas del Sistema Consolidado
✅ **Un solo archivo** por tipo de log  
✅ **No más archivos por fecha**  
✅ **Fácil búsqueda** en logs históricos  
✅ **Menor fragmentación** de archivos  
✅ **Gestión automática** de tamaño  

## Migración
Si tienes archivos de log antiguos por fecha, ejecuta:
```bash
npm run consolidate-logs
```

Esto consolidará todos los logs existentes y eliminará los archivos antiguos.

## Notas Técnicas
- Los logs se escriben en formato JSON estructurado
- Cada entrada incluye timestamp, nivel, mensaje y metadatos
- El sistema es compatible con herramientas de análisis de logs
- Los logs se ordenan cronológicamente automáticamente
