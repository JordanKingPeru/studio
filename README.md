
# Family Trip Planner - Documentación del Proyecto

## 1. Introducción

**Family Trip Planner** es una aplicación de planificación de viajes inteligente y colaborativa diseñada para ayudar a familias y grupos a organizar sus aventuras sin esfuerzo. Desde la planificación de destinos en un mapa hasta el detalle de las actividades diarias y el seguimiento de los presupuestos, esta aplicación aprovecha las tecnologías web modernas y la IA generativa para crear una experiencia de planificación fluida y atractiva.

---

## 2. Tabla de Contenidos

- [Características Principales](#3-características-principales)
- [Stack Tecnológico](#4-stack-tecnológico)
- [Paleta de Colores](#5-paleta-de-colores)
- [Estructura del Proyecto](#6-estructura-del-proyecto)
- [Guía de Inicio Rápido (Local)](#7-guía-de-inicio-rápido-local)
- [Configuración de Firebase](#8-configuración-de-firebase)
- [Configuración de Genkit (IA)](#9-configuración-de-genkit-ia)

---

## 3. Características Principales

-   **Autenticación Segura**: Registro e inicio de sesión con email/contraseña y cuenta de Google.
-   **Gestión de Viajes**: Crea, visualiza y gestiona múltiples viajes desde un panel central.
-   **Planificación Colaborativa**: Invita a amigos y familiares a ver y editar los detalles del viaje en tiempo real.
-   **Mapa Interactivo**: Añade y visualiza los destinos del viaje en un mapa dinámico de Google Maps.
-   **Itinerario Dinámico**: Organiza las actividades diarias con una intuitiva interfaz de arrastrar y soltar (drag-and-drop).
-   **Seguimiento de Presupuesto**: Registra los gastos por categoría y visualiza el consumo con gráficos interactivos.
-   **Asistencia con IA**:
    -   **Generación de Portadas**: Crea imágenes de portada únicas y motivadoras para tus viajes.
    -   **Recomendación de Actividades**: Obtén sugerencias inteligentes de actividades basadas en el contexto de tu viaje.
-   **Diseño Responsivo**: Totalmente funcional y estético en ordenadores, tabletas y dispositivos móviles.
-   **Tiers de Suscripción**: Sistema base para planes de usuario gratuito y pro.

---

## 4. Stack Tecnológico

-   **Framework**: Next.js 15 (App Router, Server Components)
-   **Lenguaje**: TypeScript
-   **Librería de UI**: ShadCN UI
-   **Estilos**: Tailwind CSS
-   **Iconos**: Lucide React
-   **Gráficos**: Recharts
-   **Gestión de Estado**: React Context API, React Hook Form
-   **Servicios de Backend**: Firebase (Authentication, Firestore, Storage)
-   **IA Generativa**: Google AI (a través de Genkit v1.x)
-   **Mapas**: Google Maps Platform (`@vis.gl/react-google-maps`)

---

## 5. Paleta de Colores

La UI utiliza un sistema de temas claro y oscuro definido con variables CSS HSL en `src/app/globals.css`.

### Tema Claro (Light)

| Elemento            | Color Hex   | HSL                               | Descripción                    |
| ------------------- | ----------- | --------------------------------- | ------------------------------ |
| **Background**      | `#F5F5F5`   | `0 0% 96.1%`                      | Gris Claro                     |
| **Foreground**      | `#0A0A0B`   | `240 10% 3.9%`                    | Texto principal (Azul/Gris oscuro) |
| **Primary**         | `#64B5F6`   | `207 88% 68%`                     | Azul Suave (Principal)         |
| **Accent**          | `#FFB74D`   | `34 100% 65%`                     | Naranja Cálido (Acento)        |
| **Card**            | `#FFFFFF`   | `0 0% 100%`                       | Fondo de Tarjetas (Blanco)     |
| **Secondary**       | `#D9ECFB`   | `207 80% 90%`                     | Azul claro suave               |
| **Destructive**     | `#EF4444`   | `0 84.2% 60.2%`                   | Rojo para acciones destructivas|
| **Border**          | `#E5E5E5`   | `0 0% 89.8%`                      | Gris para bordes               |

### Tema Oscuro (Dark)

| Elemento            | Color Hex   | HSL                               | Descripción                    |
| ------------------- | ----------- | --------------------------------- | ------------------------------ |
| **Background**      | `#1A202C`   | `216 28% 14%`                     | Gris azulado oscuro            |
| **Foreground**      | `#F7FAFC`   | `210 25% 97%`                     | Texto principal (Blanco hueso) |
| **Primary**         | `#63B3ED`   | `207 82% 66%`                     | Azul Suave (Principal)         |
| **Accent**          | `#FCA52F`   | `34 95% 60%`                      | Naranja Cálido (Acento)        |
| **Card**            | `#2D3748`   | `215 21% 23%`                     | Fondo de Tarjetas (Gris azulado)|
| **Secondary**       | `#3A4150`   | `220 15% 25%`                     | Gris oscuro                    |
| **Destructive**     | `#E53E3E`   | `0 72.2% 50.6%`                   | Rojo para acciones destructivas|
| **Border**          | `#3D4757`   | `215 21% 28%`                     | Gris oscuro para bordes        |

---

## 6. Estructura del Proyecto

El proyecto sigue la estructura recomendada por Next.js con el App Router.

```
/
├── src/
│   ├── app/                    # Rutas de la aplicación
│   │   ├── (auth)/             # Grupo de rutas para autenticación (login, signup)
│   │   ├── trips/[tripId]/     # Rutas dinámicas para cada viaje
│   │   │   ├── dashboard/
│   │   │   ├── map/
│   │   │   └── ...
│   │   ├── page.tsx            # Dashboard principal "Mis Viajes"
│   │   └── layout.tsx          # Layout principal
│   │
│   ├── components/             # Componentes de React reutilizables
│   │   ├── ai/                 # Componentes de UI relacionados con IA
│   │   ├── auth/               # Componentes de UI para autenticación
│   │   ├── budget/             # Componentes para la sección de presupuesto
│   │   ├── dashboard/          # Componentes para el dashboard del viaje
│   │   ├── itinerary/          # Componentes para la sección de itinerario
│   │   ├── map/                # Componentes para la sección del mapa
│   │   ├── trips/              # Componentes para la creación y gestión de viajes
│   │   ├── ui/                 # Componentes base de ShadCN (Button, Card, etc.)
│   │   └── layout/             # Componentes de layout (Header, Footer, Sidebar)
│   │
│   ├── ai/                     # Lógica de IA del lado del servidor (Genkit)
│   │   ├── flows/              # Flujos de Genkit para interactuar con modelos de IA
│   │   └── genkit.ts           # Configuración e inicialización de Genkit
│   │
│   ├── context/                # Contextos de React para gestión de estado global
│   │   └── AuthContext.tsx     # Gestiona el estado de autenticación del usuario
│   │
│   ├── firebase/               # Funciones de utilidad para interactuar con Firebase
│   │   └── auth.ts             # Funciones de autenticación (signup, signin, etc.)
│   │
│   └── lib/                    # Librerías, utilidades y tipos
│       ├── firebase.ts         # Inicialización de Firebase
│       ├── types.ts            # Definiciones de tipos de TypeScript
│       └── utils.ts            # Funciones de utilidad (ej. cn para clases)
│
├── public/                     # Archivos estáticos
└── tailwind.config.ts          # Configuración de Tailwind CSS
```

---

## 7. Guía de Inicio Rápido (Local)

### Prerrequisitos

-   Node.js (v18 o superior)
-   `pnpm`, `npm` o `yarn`
-   Una cuenta de Firebase
-   Un proyecto en Google Cloud Platform con las APIs de Google Maps y Google AI habilitadas

### Instalación

1.  **Clonar el repositorio**:
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd <NOMBRE_DEL_DIRECTORIO>
    ```

2.  **Instalar dependencias**:
    ```bash
    pnpm install
    # o npm install / yarn install
    ```

### Variables de Entorno

1.  Crea un archivo `.env.local` en la raíz del proyecto.
2.  Copia el contenido del archivo `.env.example` en tu nuevo archivo `.env.local`.
3.  Rellena las variables con tus propias claves de Firebase y Google Cloud.

```ini
# .env.local

# Configuración de Firebase
# Obtenlas de tu proyecto en Firebase -> Configuración del Proyecto -> General
NEXT_PUBLIC_FIREBASE_API_KEY=TU_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=TU_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=TU_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=TU_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=TU_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=TU_APP_ID

# API Key de Google Maps
# Obtenla de tu proyecto en Google Cloud Platform -> APIs y Servicios -> Credenciales
# Asegúrate de que "Maps JavaScript API" y "Places API" estén habilitadas.
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=TU_GOOGLE_MAPS_API_KEY

# API Key de Genkit (Google AI)
# Obtenla de Google AI Studio -> Get API Key
# Es usada por los flujos de Genkit en el lado del servidor.
GOOGLE_AI_API_KEY=TU_GOOGLE_AI_API_KEY
```

### Ejecutar la Aplicación

1.  **Iniciar la aplicación Next.js**:
    ```bash
    pnpm dev
    ```
    La aplicación estará disponible en `http://localhost:9002`.

2.  **Iniciar el servidor de desarrollo de Genkit** (en una terminal separada):
    ```bash
    pnpm genkit:dev
    ```
    Esto inicia el servidor que maneja las peticiones a la IA.

---

## 8. Configuración de Firebase

1.  **Crear Proyecto**: Ve a la [Consola de Firebase](https://console.firebase.google.com/) y crea un nuevo proyecto.
2.  **Crear Aplicación Web**: Dentro de tu proyecto, añade una nueva aplicación web para obtener las claves de configuración (`firebaseConfig`).
3.  **Authentication**:
    -   Ve a la sección `Authentication` -> `Sign-in method`.
    -   Habilita los proveedores de **Email/Contraseña** y **Google**.
4.  **Firestore**:
    -   Ve a la sección `Firestore Database` y crea una nueva base de datos en modo de producción.
    -   **Modelo de Datos**:
        -   `users/{uid}`: Almacena el perfil del usuario y la información de su suscripción.
        -   `trips/{tripId}`: Documento principal del viaje. Contiene subcolecciones para datos anidados.
            -   `trips/{tripId}/activities/{activityId}`
            -   `trips/{tripId}/cities/{cityId}`
            -   `trips/{tripId}/expenses/{expenseId}`
    -   **Reglas de Seguridad**: Reemplaza las reglas por defecto por unas más seguras. Un buen punto de partida es:
        ```json
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /users/{userId} {
              allow read, write: if request.auth != null && request.auth.uid == userId;
            }
            match /trips/{tripId} {
              // El propietario puede hacer todo
              allow read, write: if request.auth != null && resource.data.ownerUid == request.auth.uid;
              // Los editores pueden leer y escribir (pero no eliminar el viaje)
              allow read, update: if request.auth != null && request.auth.uid in resource.data.editorUids;
            }
            match /trips/{tripId}/{subcollection}/{docId} {
                // Permite a propietarios y editores gestionar subcolecciones
                allow read, write: if request.auth != null && (get(/databases/$(database)/documents/trips/$(tripId)).data.ownerUid == request.auth.uid || request.auth.uid in get(/databases/$(database)/documents/trips/$(tripId)).data.editorUids);
            }
          }
        }
        ```
5.  **Storage**:
    -   Ve a `Storage` y crea un nuevo bucket.
    -   **Reglas de Seguridad**:
        ```
        rules_version = '2';
        service firebase.storage {
          match /b/{bucket}/o {
            // Solo usuarios autenticados pueden escribir en sus propias carpetas de viaje
            match /trip_covers/{tripId}/{allPaths=**} {
              allow write: if request.auth != null;
            }
            // Cualquiera puede leer imágenes si conoce la URL (comportamiento por defecto)
            allow read;
          }
        }
        ```

---

## 9. Configuración de Genkit (IA)

-   El código de la IA se encuentra en `src/ai/`.
-   La variable `GOOGLE_AI_API_KEY` en tu `.env.local` es necesaria para que los flujos funcionen.
-   Para inspeccionar los flujos de Genkit, con el servidor de desarrollo (`genkit:dev`) en marcha, ve a `http://localhost:4000`.

