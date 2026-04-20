# Sistema de Gestión de Asistencia y Nómina v2.0

Este proyecto es una solución integral para el control de asistencia de personal, integración con dispositivos biométricos, gestión de turnos rotativos y generación automática de nómina. El sistema cuenta con un panel administrativo de alto rendimiento con una interfaz moderna y premium.

## 🚀 Tecnologías Utilizadas

### Frontend

- **React 18**: Biblioteca base para la interfaz.
- **Vite**: Herramienta de construcción ultra rápida.
- **Tailwind CSS v4**: Motor de estilos de última generación para un diseño premium.
- **Framer Motion**: Animaciones fluidas y micro-interacciones.
- **Lucide React**: Set de iconos modernos de alta calidad.
- **Axios**: Cliente HTTP para comunicación con la API.

### Backend

- **Node.js & Express**: Servidor de aplicaciones robusto.
- **MySQL**: Base de datos relacional para persistencia de datos.
- **JWT & Bcryptjs**: Sistema de seguridad y encriptación de identidades.
- **PDFKit**: Generación de boletas de pago en formato PDF.

---

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

---

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

---

## 🧪 Pruebas del Sistema

### Pruebas de Conectividad Biométrica

Puedes simular el envío de eventos desde un dispositivo biométrico usando el script de prueba:

```bash
# Desde la raíz del proyecto
node backend/tests/test_biometrico.js
```

### Pruebas Manuales

1. **Acceso**: Usa las credenciales por defecto (`admin@sistema.com` / `admin123`).
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
