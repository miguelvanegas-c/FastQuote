# FastQuote

FastQuote es un proyecto orientado a **generar y gestionar cotizaciones (“quotes”)** de forma rápida, clara y reutilizable. Este repositorio reúne el código, configuración y documentación necesaria para correr el proyecto localmente, entender su estructura y contribuir.

---

## Tabla de contenido

- [Descripción](#descripción)
- [Características](#características)
- [Tecnologías](#tecnologías)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Ejecución](#ejecución)
- [Configuración (variables de entorno)](#configuración-variables-de-entorno)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Uso](#uso)
- [Scripts útiles](#scripts-útiles)
- [Pruebas](#pruebas)
- [Buenas prácticas y decisiones](#buenas-prácticas-y-decisiones)
- [Solución de problemas](#solución-de-problemas)
- [Contribución](#contribución)
- [Licencia](#licencia)
- [Autor](#autor)

---

## Descripción

**FastQuote** busca facilitar la creación de cotizaciones con un flujo simple:

1. Ingreso/selección de datos (cliente, items/servicios, cantidades, impuestos, etc.)
2. Cálculo automático de subtotales/totales
3. Visualización clara (y opcionalmente exportación/impresión)
4. Persistencia o envío (según aplique)

> Nota: Ajusta esta sección con el objetivo real del repo (por ejemplo “consumir una API pública de frases”, “cotizador de seguros”, “cotizador de servicios”, etc.).  

---

## Características

- Generación rápida de cotizaciones
- Cálculo de valores (subtotal, impuestos, total)
- Estructura modular para escalar funcionalidades
- Separación de responsabilidades (UI / lógica / datos) *(según aplique)*
- Configuración por variables de entorno *(si aplica)*

**Posibles mejoras futuras**
- Exportar a PDF
- Historial de cotizaciones
- Autenticación y roles
- Integración con un backend o base de datos
- Plantillas de cotización personalizables

---

## Tecnologías

> Actualiza según el stack real. Ejemplos comunes:

- **Node.js** (runtime)
- **npm** / **yarn** / **pnpm** (dependencias)
- **Frontend**: React / Next.js / Vite *(si aplica)*
- **Backend**: Express / NestJS *(si aplica)*
- **Estilos**: CSS / Tailwind / Bootstrap *(si aplica)*
- **Linting/Format**: ESLint / Prettier *(si aplica)*
- **Testing**: Jest / Vitest / Cypress *(si aplica)*

---

## Requisitos

- Node.js `>= 18` (recomendado)
- Gestor de paquetes: `npm` (o `yarn`/`pnpm`)
- Git

Verifica tu versión:
```bash
node -v
npm -v
```

---

## Instalación

1. Clona el repositorio:

```bash
git clone https://github.com/miguelvanegas-c/FastQuote.git
cd FastQuote
```

2. Instala dependencias:

```bash
npm install
```

> Si el proyecto usa `yarn` o `pnpm`, reemplaza el comando:
> - `yarn`
> - `pnpm install`

---

## Ejecución

### Modo desarrollo

```bash
npm run dev
```

### Modo producción (si aplica)

```bash
npm run build
npm run start
```

> Si el repo es solo backend, puede ser `npm run start` directamente.  
> Si es frontend con Vite, suele ser `npm run dev` y `npm run build`.

---

## Configuración (variables de entorno)

Si el proyecto necesita variables de entorno:

1. Copia el archivo de ejemplo:

```bash
cp .env.example .env
```

2. Ajusta valores según tu entorno.

**Ejemplo (referencial):**
```env
PORT=3000
API_BASE_URL=https://api.ejemplo.com
```

> Si el repo no tiene `.env.example`, crea uno para documentar qué variables se requieren.

---

## Estructura del proyecto

> Esta sección es una guía. Ajusta los nombres a la estructura real del repo.

Ejemplo común:

```text
FastQuote/
├─ src/
│  ├─ components/        # Componentes UI reutilizables
│  ├─ pages/             # Vistas / rutas (si aplica)
│  ├─ services/          # Lógica de consumo de APIs / requests
│  ├─ utils/             # Funciones utilitarias (formatos, cálculos)
│  ├─ styles/            # Estilos globales
│  └─ main.*             # Punto de entrada
├─ public/               # Assets estáticos
├─ tests/                # Pruebas (unitarias/integración)
├─ .env.example          # Variables de entorno de ejemplo
├─ package.json
└─ README.md
```

---

## Uso

### Flujo típico (ejemplo)
1. Ejecuta el proyecto en local.
2. Abre la aplicación en el navegador (por ejemplo `http://localhost:3000`).
3. Crea una cotización:
   - Agrega items
   - Define cantidades y valores
   - Verifica el total
4. Guarda o exporta *(si aplica)*

---

## Scripts útiles

Revisa `package.json`, pero normalmente:

```bash
npm run dev      # desarrollo
npm run build    # build de producción
npm run start    # correr build
npm run lint     # análisis estático
npm run format   # formateo (si existe)
npm test         # pruebas (si existe)
```

---

## Pruebas

Si hay configuración de testing:

```bash
npm test
```

Si hay modo watch:
```bash
npm run test:watch
```

> Documenta aquí qué se prueba: cálculos, componentes, endpoints, etc.

---

## Buenas prácticas y decisiones

- **Código modular**: facilita mantenimiento y extensión.
- **Funciones puras para cálculos**: los totales/impuestos se calculan en helpers testeables.
- **Validación de datos**: evita cotizaciones incompletas o inconsistentes *(si aplica)*.
- **Estructura por dominio**: agrupar por “cotización”, “cliente”, “items” puede escalar mejor *(si aplica)*.

---

## Solución de problemas

### 1) Puerto en uso
Si el puerto está ocupado, cambia `PORT` en `.env` o cierra el proceso que lo usa.

### 2) Dependencias / lockfile
Si tienes errores raros:
```bash
rm -rf node_modules
npm install
```

### 3) Variables de entorno faltantes
Revisa `.env` y asegúrate de tener todas las variables definidas.

---

## Contribución

1. Haz un fork del repo
2. Crea una rama:
   ```bash
   git checkout -b feature/mi-cambio
   ```
3. Haz commits claros:
   ```bash
   git commit -m "feat: agregar cálculo de impuestos"
   ```
4. Push y Pull Request

---

## Licencia

Define la licencia del proyecto (MIT, Apache-2.0, etc.).  
Si aún no se ha elegido, puedes dejar “Pendiente”.

---

## Autor

- **Cristian Silva**
- **Miguel Vanegas**
- **Diego Rozo**
   
