# 🚀 Configuración de Subdominios Locales para Desarrollo

## 📋 **Paso 1: Configurar Archivo Hosts**

### **Windows:**
1. Abrir como administrador: `C:\Windows\System32\drivers\etc\hosts`
2. Agregar estas líneas:

```bash
127.0.0.1 localhost
127.0.0.1 prueba.localhost
127.0.0.1 hospital.localhost
127.0.0.1 clinica.localhost
```

### **macOS/Linux:**
1. Abrir: `/etc/hosts`
2. Agregar estas líneas:

```bash
127.0.0.1 localhost
127.0.0.1 prueba.localhost
127.0.0.1 hospital.localhost
127.0.0.1 clinica.localhost
```

## 🌐 **Paso 2: URLs de Prueba**

### **Para probar diferentes clientes:**
```bash
# Cliente "prueba"
http://prueba.localhost:3000

# Cliente "hospital"  
http://hospital.localhost:3000

# Cliente "clinica"
http://clinica.localhost:3000
```

## 🔧 **Paso 3: Configuración del Navegador**

### **Chrome/Edge:**
- Los subdominios `.localhost` funcionan automáticamente
- No requiere configuración adicional

### **Firefox:**
- Puede requerir configurar `network.dns.localDomains` en `about:config`

## 📱 **Paso 4: Alternativas de Prueba**

### **Opción 1: Query Parameters**
```bash
http://localhost:3000?tenant=prueba
http://localhost:3000?tenant=hospital
http://localhost:3000?tenant=clinica
```

### **Opción 2: Headers Personalizados**
```bash
# Usar Postman o similar
X-Tenant: prueba
X-Tenant: hospital
X-Tenant: clinica
```

## 🧪 **Paso 5: Probar el Sistema**

### **1. Verificar detección de tenant:**
```bash
GET http://prueba.localhost:3000/tenant/info
```

### **2. Probar login:**
```bash
POST http://prueba.localhost:3000/tenant/login
{
  "email": "admin@prueba.com",
  "password": "password123"
}
```

## ⚠️ **Notas Importantes**

- **Reiniciar navegador** después de cambiar el archivo hosts
- **Limpiar cache DNS** si hay problemas: `ipconfig /flushdns` (Windows)
- **Verificar que el cliente existe** en la base de datos principal
- **Dominio debe coincidir** exactamente con el campo `domain` del cliente

## 🔍 **Debugging**

### **Verificar en consola del servidor:**
```
✅ Tenant detectado: Hospital de Prueba (prueba)
✅ Conectado a BD del cliente: prueba
```

### **Verificar en Network tab del navegador:**
- Request headers deben incluir el host correcto
- Response debe incluir información del tenant
