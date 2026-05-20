# Trackademy Frontend

Frontend de Trackademy construido con Angular 20, organizado por dominios para mantener separadas UI, casos de uso e integracion con APIs.

## Stack

- Angular 20 (standalone components)
- TypeScript
- RxJS
- Angular Router y Forms reactivas
- SCSS
- MSAL Browser (auth Microsoft)
- Google Identity Services (auth Google)
- Desplegado en Vercel

## Arquitectura

Cada dominio sigue una organizacion tipo DDD:

- `domain`: modelos y contratos puros
- `application`: casos de uso
- `infrastructure`: servicios HTTP, guards, configuracion
- `presentation`: paginas y componentes

Dominios:

- `identity`: autenticacion y sesion
- `academics`: onboarding, dashboard, cursos, horario, notas, calendario, tareas, perfil, WhatsApp
- `feedback`: reportes de bugs y sugerencias
- `marketing`: landing publica, privacy policy, terms of service

## Estructura

```text
src/
  app/
    domains/
      academics/
      identity/
      feedback/
      marketing/
    shared/
    app.config.ts
    app.routes.ts
  environments/
```

## Reglas

- `presentation` no llama HTTP directamente
- los endpoints se consumen a traves de `application` e `infrastructure`
- no se cruzan dominios desde `presentation`
- la UI refleja data real del backend; estados vacios son explicitos

## Rutas

Publicas:
- `/` — landing
- `/privacy-policy`, `/terms-of-service`
- `/auth/sign-in`, `/auth/callback`
- `/feedback` — formulario publico de reportes

Autenticadas:
- `/onboarding`
- `/app/dashboard`
- `/app/cursos`, `/app/cursos/:id`, `/app/cursos/:id/horario`
- `/app/horario`
- `/app/calendario`
- `/app/notas`
- `/app/tareas` (incluye recordatorios manuales como subtipo)
- `/app/recordatorios` — redirige a `/app/tareas`
- `/app/perfil`
- `/app/feedback/reportes`

Wildcard `**` redirige a `/`.

## Funcionalidad

Implementado:

- Login con Google y Microsoft
- Onboarding academico con preview de PDF de matricula
- Dashboard
- Mis cursos y detalle del curso (incluye historial de silabos y descarga PDF)
- Configuracion de horario por curso y vista de horario semanal
- Calendario academico (combina eventos de periodo, evaluaciones y clases)
- Notas con registro y actualizacion por evaluacion
- **Tareas y recordatorios manuales** con CRUD real (kanban con drag-drop)
- Perfil academico editable y reconfiguracion del ciclo
- Integracion WhatsApp en el perfil (generar codigo, vincular, desvincular)
- Reportes de feedback con upload de imagen y datos de contacto
- Landing publica, privacy policy y terms of service

## Configuracion

Entornos:

- `src/environments/environment.ts` (dev, `apiBaseUrl` apunta a produccion)
- `src/environments/environment.production.ts` (`production: true`)

## Requisitos

- Node.js 20 o superior
- npm
- Backend disponible (local: `http://localhost:8080`, prod: `https://api.trackademy.trinitylabs.app`)

## Ejecucion local

```powershell
cd C:\Users\uu\Desktop\trackademy-proyecto\trackademy-frontend
npm install
npm run start
```

Aplicacion: `http://localhost:4200`.

Validacion estatica y build:

```powershell
npx tsc -p tsconfig.app.json --noEmit
npx ng build
```

## Decisiones relevantes

- `publicId` (UUID) se usa como identificador estable del curso en navegacion; `codigo` se muestra como dato academico visible.
- `Notas` resalta por curso la primera evaluacion pendiente como accion principal.
- `Tareas` permite crear, editar y borrar tareas manuales con tipos `tarea` y `recordatorio`. Reemplaza al enfoque anterior derivado de evaluaciones.
- `Recordatorios` no es una pagina separada hoy; el subtipo vive dentro de Tareas (`/app/recordatorios` redirige).
- `Campus` y `Carrera` se muestran por nombre, no por ID.
- `Perfil` reconfigura el ciclo actual con reglas explicitas y recarga los cursos reales tras el cambio.

## Despliegue

Vercel toma el contenido de `dist/` al hacer push a `main`. Configuracion en `vercel.json`.

## Troubleshooting

**No carga datos:** verifica que el backend este corriendo y que `apiBaseUrl` apunte al entorno correcto. Confirma que tu sesion JWT siga viva.

**`ng build` falla:** revisa version de Node, dependencias instaladas y errores de typings.

**Cambie el ciclo y no veo efecto:** el perfil recarga cursos tras reconfigurar. Si persiste, refresca sesion.
