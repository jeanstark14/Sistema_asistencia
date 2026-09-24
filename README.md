# Sistema de Gestión de Asistencia y Nómina v2.0 🇵🇪

Sistema integral de gestión de asistencia, control biométrico, kiosco interactivo de marcación y cálculo automatizado de nómina/planillas, diseñado conforme a la normativa laboral peruana.

---

## 📋 Descripción General

- **Arquitectura Full-Stack**: Backend desacoplado con API REST (Node.js/Express) y Frontend interactivo SPA (React + Vite).
- **Múltiples Métodos de Marcación**: 
  - Marcación mediante dispositivos biométricos en red (ZK / HTTP push).
  - **Kiosco Web Interactivo** para tablets o terminales táctiles con ingreso de PIN de 5 dígitos.
  - Simulador web para pruebas de integración de hardware en tiempo real.
- **Base de Datos Relacional**: MySQL con esquema estructurado e integridad referencial.
- **Seguridad**: Autenticación JWT con roles, protección contra fuerza bruta (rate limiting) y cifrado bcrypt.
- **Nómina y Boletas PDF**: Generación automática de planillas, cálculo de horas extras diurnas/nocturnas, tardanzas, AFP/ONP, EsSalud y exportación de boletas en PDF de alta fidelidad con logos corporativos.

---

## 🚀 Tecnologías Utilizadas

### Frontend
- **React 18** + **Vite**: Rendimiento ultra rápido y desarrollo modular.
- **Tailwind CSS v4**: Diseño moderno, responsivo y adaptativo.
- **Framer Motion**: Micro-animaciones e interactividad fluida.
- **Lucide React**: Iconografía vectorial estilizada.
- **React Router DOM**: Enrutamiento para SPA.
- **React Hot Toast**: Notificaciones interactivas.
- **Axios**: Cliente HTTP para consumo de la API.

### Backend
- **Node.js** + **Express.js v5**: Servidor web y API REST.
- **MySQL2**: Manejo eficiente de conexiones mediante connection pools.
- **JWT (jsonwebtoken)** + **bcryptjs**: Autenticación segura y hashing de contraseñas.
- **express-rate-limit**: Control de frecuencia de peticiones para prevenir abusos.
- **PDFKit**: Generación dinámica y precisa de boletas de pago y reportes PDF.
- **dotenv** & **CORS**: Gestión de variables de entorno y políticas de origen cruzado.

---

## ✨ Funcionalidades Principales

### 1. 🖥️ Kiosco Interactivo de Marcación (`/kiosco.html`)
- Diseñado para pantallas táctiles, tablets y navegadores en recepción o puntos de acceso.
- Teclado numérico virtual y físico con soporte para PIN de 5 dígitos por empleado.
- Confirmación visual y sonora al registrar Entrada, Refrigerio y Salida.
- Modo pantalla completa y actualización en tiempo real de hora/fecha.
- Gestión de PINs directamente desde el módulo de empleados en el panel administrativo.

### 2. 🕒 Control de Asistencia y Biométricos
- Soporte para eventos de dispositivos biométricos (`/api/biometrico/evento`).
- **Simulador Biométrico Web** (`/simulator.html`): Interfaz para emular marcaciones de prueba sin necesidad de hardware físico.
- Registro inmutable en `asistencia_raw` y cálculo automático de asistencia diaria, tardanzas y refrigerios.

### 3. 👥 Gestión de Empleados y Cargos
- CRUD completo de colaboradores con asignación de turnos, áreas y cargos.
- Integración de consulta automática de datos por DNI (API externa).
- Configuración de tipo de régimen pensional (AFP Integra, Habitat, Prima, Profuturo, ONP).
- Asignación y actualización de PIN para el kiosco de marcación.

### 4. 📅 Turnos y Horarios Rotativos
- Definición de turnos diurnos, nocturnos y mixtos con tolerancia de entrada y refrigerio.
- Asignación flexible de turnos fijos o rotativos a colaboradores.

### 5. 💰 Procesamiento de Nómina y Boletas de Pago
- Cálculo automático de remuneración básica, asignación familiar y días laborados.
- Desglose preciso de horas extra diurnas (25%) y nocturnas (35%).
- Deducciones exactas: tardanzas acumuladas en minutos, inasistencias injustificadas, aportes previsionales (AFP / ONP).
- Aportes del empleador: EsSalud (9%) y seguro de vida ley.
- **Generación de Boletas PDF**: Emisión de boletas individuales con diseño corporativo y soporte para logos institucionales (`logo.png`, `logo_2.png`).

### 6. 📊 Dashboard Administrativo
- Visualización de métricas en tiempo real: asistencias del día, tardanzas, ausencias y personal activo.

### 7. 🧹 Scripts de Mantenimiento
- Scripts de limpieza y reseteo ordenado en `backend/scripts/`:
  - `node backend/scripts/limpiar_asistencias.js`: Resetea eventos y registros de asistencia manteniendo el catálogo de personal.
  - `node backend/scripts/limpiar_nominas.js`: Resetea registros y detalles de planillas para pruebas.

---

## 🛠️ Instalación y Configuración

### Requisitos Previos
- **Node.js** (v18 o superior)
- **MySQL / MariaDB** (vía XAMPP o independiente)
- **Git**

### 1. Clonar el Repositorio
```bash
git clone https://github.com/jeanstark14/Sistema_asistencia.git
cd Sistema_asistencia
```

### 2. Base de Datos
1. Inicia el servicio de MySQL (por ejemplo desde el panel de XAMPP).
2. Crea la base de datos `sistema_asistencia_nomina`.
3. Importa el archivo principal:
   ```bash
   mysql -u root -p sistema_asistencia_nomina < sistema_asistencia_nomina.sql
   ```
4. Si requieres habilitar la función de PIN para el kiosco, ejecuta la migración:
   ```bash
   mysql -u root -p sistema_asistencia_nomina < backend/add_pin_kiosco.sql
   ```

### 3. Configuración del Backend
```bash
cd backend
npm install
```

Crea o edita el archivo `.env` en la raíz de `backend`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=sistema_asistencia_nomina
PORT=4000
JWT_SECRET=tu_clave_secreta_segura
# Opcional para consulta de DNI:
APIPERU_TOKEN=tu_token_apiperu
```

### 4. Configuración del Frontend
```bash
cd ../frontend
npm install
```

---

## 🏃 Ejecución del Sistema

### Modo Desarrollo

1. **Iniciar Backend** (servidor API + Kiosco + Simulador):
   ```bash
   cd backend
   npm start
   # o con recarga automática:
   npm run dev
   ```
   - API y estáticos activos en: [http://localhost:4000](http://localhost:4000)
   - **Kiosco de Marcación**: [http://localhost:4000/kiosco.html](http://localhost:4000/kiosco.html)
   - **Simulador Biométrico**: [http://localhost:4000/simulator.html](http://localhost:4000/simulator.html)

2. **Iniciar Frontend** (Panel Administrativo):
   ```bash
   cd frontend
   npm run dev
   ```
   - Aplicación disponible en: [http://localhost:5173](http://localhost:5173)

---

## 🔑 Credenciales de Acceso por Defecto

- **Usuario Admin**: `admin@sistema.com`
- **Contraseña**: `admin123`

---

## 📦 Despliegue en Producción

### Frontend
```bash
cd frontend
npm run build
```
Los archivos optimizados generados en `frontend/dist` pueden ser alojados en Nginx, Apache (ej. htdocs), o servidores estáticos.

### Backend
Para entornos de producción se recomienda utilizar **PM2**:
```bash
cd backend
npm install -g pm2
pm2 start server.js --name "sistema-asistencia-api"
pm2 save
```

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT.
