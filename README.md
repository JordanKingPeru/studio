
# Family Trip Planner - Documentación del Proyecto

## 1. Introducción

**Family Trip Planner** es una aplicación de planificación de viajes inteligente y colaborativa diseñada para ayudar a familias y grupos a organizar sus aventuras sin esfuerzo. Desde la planificación de destinos en un mapa hasta el detalle de las actividades diarias y el seguimiento de los presupuestos, esta aplicación aprovecha las tecnologías web modernas y la IA generativa para crear una experiencia de planificación fluida, inmersiva y atractiva.

---

## 2. Tabla de Contenidos

- [Características Principales y Funcionalidades](#3-características-principales-y-funcionalidades)
- [Stack Tecnológico](#4-stack-tecnológico)
- [Paleta de Colores](#5-paleta-de-colores)
- [Estructura del Proyecto](#6-estructura-del-proyecto)
- [Guía de Inicio Rápido (Local)](#7-guía-de-inicio-rápido-local)
- [Configuración de Firebase](#8-configuración-de-firebase)
- [Configuración de Genkit (IA)](#9-configuración-de-genkit-ia)

---

## 3. Características Principales y Funcionalidades

### Planificación Inteligente y Centralizada

-   🚀 **Creación de Viajes Guiada**: Inicia cada nueva aventura con un asistente intuitivo que te guía paso a paso. Define el nombre, las fechas, el número de viajeros y el contexto de tu viaje (tipo y estilo), sentando las bases para una planificación personalizada desde el primer momento.
-   🗂️ **Dashboard de Viajes Unificado**: Tu centro de mando personal. Visualiza todos tus viajes —los que creaste, a los que te invitaron y los que están pendientes de aceptación— en una única interfaz elegante. Cada viaje se presenta como una tarjeta interactiva, mostrando su portada, nombre y fechas, facilitando el acceso inmediato a tus planes.
-   🔐 **Autenticación Segura y Sencilla**: Un portal de acceso robusto y fácil de usar. Ofrecemos registro e inicio de sesión con email/contraseña, así como una integración fluida con **Google Sign-In** para un acceso rápido y seguro, protegiendo tus planes y datos personales con los estándares de Firebase Authentication.
-   👑 **Sistema de Suscripciones (Base)**: La aplicación está construida sobre una arquitectura que soporta diferentes niveles de usuario. El plan gratuito inicial tiene un límite de viajes, sentando las bases para futuros **planes Pro** con características ilimitadas y funcionalidades avanzadas, creando un modelo de negocio escalable.

### Visualización y Organización Inmersiva

-   🌍 **Mapa Interactivo Inteligente**: Transforma tu lista de destinos en un lienzo visual y dinámico. Con la potencia de **Google Maps Platform**, puedes buscar y añadir ciudades con autocompletado, visualizar tu ruta completa con marcadores y líneas conectadas, y obtener una perspectiva geográfica de tu aventura. Edita, elimina y gestiona tus paradas directamente sobre el mapa para una planificación fluida y contextual.
-   📋 **Itinerario Dinámico con Arrastrar y Soltar**: El corazón de tu viaje. Organiza las actividades de cada día en una interfaz de arrastrar y soltar (drag-and-drop) que permite reordenar planes sobre la marcha. Cada actividad (comida, vuelo, tour, etc.) se gestiona con detalles como hora, notas, coste y adjuntos, haciendo que la planificación sea tan flexible como tu viaje.
-   📊 **Seguimiento de Presupuesto Visual**: Mantén tus finanzas bajo control sin esfuerzo. Registra gastos manuales o importa automáticamente los costes de las actividades del itinerario. Visualiza tus gastos con **gráficos interactivos** que desglosan el consumo por ciudad y muestran la tendencia de gasto acumulado, permitiéndote tomar decisiones informadas en tiempo real.
-   ✅ **Checklists y Herramientas Adicionales**: Asegúrate de que no se te olvide nada. Utiliza checklists personalizables para organizar tu equipaje y tareas pendientes. La sección "Más" también alberga la gestión de colaboradores y es el espacio para futuras herramientas como la gestión de documentos y resúmenes post-viaje.

### Asistencia con Inteligencia Artificial Generativa

-   🎨 **Generación de Portadas con IA**: Dale vida a tus viajes antes de empezar. Nuestra IA generativa, impulsada por **Google AI (Genkit)**, crea imágenes de portada únicas y motivadoras basadas en los detalles de tu viaje (destino, estilo, fechas). Cada plan tendrá una identidad visual inspiradora y fotorrealista.
-   💡 **Recomendación Inteligente de Actividades**: ¿No sabes qué hacer en tu destino? Deja que nuestra IA te ayude. Basándose en la ciudad, tus intereses y el contexto del viaje, el sistema te sugiere actividades relevantes y emocionantes. Con un solo clic, puedes añadir estas sugerencias directamente a tu itinerario.

### Colaboración y Experiencia de Usuario Superior

-   🧑‍🤝‍🧑 **Planificación en Tiempo Real y Colaborativa**: Viajar en grupo nunca fue tan fácil. Invita a amigos y familiares a tu viaje por email. Los colaboradores pueden ver y editar el itinerario, el presupuesto y otros detalles en tiempo real gracias a la sincronización con **Firestore**, asegurando que todos estén siempre en la misma página.
-   📱 **Diseño Totalmente Responsivo**: Una experiencia impecable en cualquier dispositivo. La interfaz ha sido cuidadosamente diseñada para ser tan funcional y estética en un ordenador de escritorio como en una tableta o un smartphone, permitiéndote planificar desde casa o sobre la marcha.
-   🌗 **Temas Claro y Oscuro**: Personaliza tu entorno de planificación. Cambia entre un tema claro, limpio y enfocado, y un tema oscuro, elegante y cómodo para la vista, que se adapta a tus preferencias y al entorno de luz.

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
