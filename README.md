# Sistema de Gestión de Asistencia y Nómina v2.0

Este proyecto es un sistema integral de gestión de asistencia y nómina para empresas. Incluye control de asistencia mediante dispositivos biométricos, gestión de turnos rotativos, generación automática de nómina y un panel administrativo moderno. El proyecto está desarrollado en español y parece estar orientado al mercado latinoamericano (con referencias a DNI, ubigeo, etc.).

## 📋 Descripción General

- **Full-stack**: Separación clara entre backend (API REST) y frontend (SPA).
- **Base de datos**: MySQL con un esquema bien estructurado.
- **Autenticación**: JWT con roles de usuario.
- **Integración**: Dispositivos biométricos para marcación de asistencia.

## 🚀 Tecnologías Utilizadas

### Frontend (React)
- **React 18**: Biblioteca base para la interfaz.
- **Vite**: Herramienta de construcción ultra rápida.
- **Tailwind CSS v4**: Motor de estilos de última generación para un diseño premium.
- **Framer Motion**: Animaciones fluidas y micro-interacciones.
- **Lucide React**: Set de iconos modernos de alta calidad.
- **React Router DOM**: Routing para navegación SPA.
- **React Hot Toast**: Notificaciones de usuario.
- **Axios**: Cliente HTTP para comunicación con la API.

### Backend (Node.js/Express)
- **Express.js v5.2.1**: Framework web robusto.
- **MySQL2 v3.19.0**: Cliente MySQL para Node.js.
- **JWT (jsonwebtoken)**: Autenticación basada en tokens.
- **bcryptjs**: Hashing seguro de contraseñas.
- **express-rate-limit**: Protección contra ataques de fuerza bruta.
- **PDFKit**: Generación de documentos PDF (boletas de pago).
- **CORS, dotenv**: Configuración y seguridad.

## 🏗️ Arquitectura del Sistema

### Backend
- **Rutas**: Módulos separados para cada funcionalidad (biométrico, nómina, empleados, etc.)
- **Controladores**: Lógica de negocio organizada por entidad
- **Servicios**: Capa de servicios para operaciones complejas (asistencia, auditoría, nómina, PDFs)
- **Middlewares**: Autenticación y control de roles
- **Configuración**: Conexión a base de datos centralizada

### Frontend
- **Componentes**: Layout administrativo, componentes UI reutilizables
- **Páginas**: Dashboard, empleados, asistencia, nómina, configuración, etc.
- **Contexto**: AuthContext para gestión de estado de autenticación
- **API**: Cliente centralizado para comunicación con backend

### Base de Datos
El esquema incluye tablas principales como:
- `usuarios`: Gestión de usuarios del sistema
- `empleados`: Información de empleados (DNI, salario, etc.)
- `dispositivos`: Dispositivos biométricos conectados
- `asistencia_raw`: Registros crudos de marcaciones (inmutable)
- `turnos`: Configuración de turnos de trabajo
- `nomina`: Cálculos de nómina
- `roles`: Sistema de permisos

## ✨ Funcionalidades Principales

1. **Control de Asistencia**: Integración con dispositivos biométricos
2. **Gestión de Empleados**: CRUD completo con información personal
3. **Turnos Rotativos**: Configuración y asignación de horarios
4. **Nómina Automática**: Cálculo y generación de boletas PDF
5. **Dashboard**: Panel con métricas y reportes
6. **Auditoría**: Servicio de logging de acciones
7. **Configuración**: Parámetros del sistema
8. **Portal de Empleado**: Vista limitada para empleados

## 🛠️ Instalación y Configuración

### Requisitos Previos
- Node.js (v16 o superior)
- MySQL (XAMPP o servidor independiente)
- NPM o Yarn

### 1. Configuración de la Base de Datos
1. Importa el archivo `sistema_asistencia_nomina.sql` en tu servidor MySQL.
2. Asegúrate de configurar las credenciales en el backend.

### 2. Configuración del Backend
```bash
cd backend
npm install
```

Crea un archivo `.env` en la carpeta `backend` con lo siguiente:
```env
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=sistema_asistencia_nomina
PORT=4000
JWT_SECRET=tu_secreto_super_seguro
```

### 3. Configuración del Frontend
```bash
cd frontend
npm install
```

## 🏃 Ejecución del Proyecto

### Iniciar Backend
```bash
cd backend
npm start
```
_El servidor correrá en [http://localhost:4000](http://localhost:4000)_

### Iniciar Frontend (Modo Desarrollo)
```bash
cd frontend
npm run dev
```
_La aplicación estará disponible en [http://localhost:5173](http://localhost:5173)_

## 🧪 Pruebas del Sistema

### Pruebas de Conectividad Biométrica
Puedes simular el envío de eventos desde un dispositivo biométrico usando el script de prueba:
```bash
# Desde la raíz del proyecto
node backend/tests/test_biometrico.js
```

### Pruebas Manuales
1. **Acceso**: Usa las credenciales por defecto (`admin@sistema.com` / `admin123`).

## 🔧 Aspectos Técnicos Destacables
- **Seguridad**: Autenticación robusta con JWT y rate limiting
- **Escalabilidad**: Arquitectura modular y servicios separados
- **Internacionalización**: Soporte para caracteres Unicode (utf8mb4)
- **Rendimiento**: Índices en base de datos para consultas eficientes
- **UI/UX**: Interfaz moderna con Tailwind CSS v4 y animaciones

## 📊 Estado del Proyecto
- **Versión**: 2.0 (desarrollo avanzado)
- **Madurez**: Solución empresarial completa y profesional
- **Enfoque**: Automatización e integración tecnológica para gestión de RRHH
2. **Dashboard**: Verifica que las métricas de empleados y asistencias se carguen correctamente.
3. **Empleados**: Realiza operaciones CRUD y asigna áreas y cargos.
4. **Horarios**: Crea un turno rotativo y asígnalo a un colaborador.
5. **Configuración**: Ajusta los parámetros de tolerancia y factores de horas extra.

---

## 📦 Despliegue (Deployment)

### Frontend (Producción)

```bash
cd frontend
npm run build
```

Los archivos resultantes en la carpeta `dist` pueden ser servidos por cualquier servidor estático (Nginx, Apache, Vercel).

### Backend (Producción)

Se recomienda el uso de **PM2** para mantener el proceso del servidor activo:

```bash
pm2 start server.js --name "api-asistencia"
```

---

## 📄 Características Principales

- **Panel Administrativo**: Vista 360 de la operación.
- **Gestión Organizativa**: Control total de áreas y puestos.
- **Monitor de Asistencia**: Visualización en tiempo real de marcaciones.
- **Cierre de Nómina**: Procesamiento automático de horas extra, tardanzas y bonos.
- **Seguridad**: Rutas protegidas y auditoría de acciones del sistema.
