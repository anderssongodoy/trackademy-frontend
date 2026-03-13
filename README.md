# Trackademy Frontend

Frontend de Trackademy construido con Angular y una organización por dominios orientada a mantener separadas la UI, los casos de uso y la integración con APIs.

## Resumen

Trackademy busca centralizar la operación académica diaria del estudiante en una sola experiencia:

- onboarding académico inicial
- visualización del ciclo actual
- cursos, horarios y calendario
- registro de notas
- tareas y recordatorios sobre data real
- perfil académico editable

El frontend consume el backend de Trackademy y prioriza datos reales sobre mocks o estados inventados.

## Stack

- Angular 20
- TypeScript
- RxJS
- Angular Router
- Angular Forms
- SCSS
- MSAL Browser para autenticación Microsoft

## Arquitectura

El proyecto sigue una organización tipo DDD para frontend:

- `domain`: modelos y contratos puros
- `application`: casos de uso y orquestación
- `infrastructure`: adaptadores técnicos, APIs y config
- `presentation`: páginas y componentes

Dominios principales:

- `identity`: autenticación y sesión
- `academics`: onboarding, dashboard, cursos, horario, notas, calendario, recordatorios y perfil
- `marketing`: landing pública
- `planning`: reservado para evolución futura

## Estructura

```text
src/
  app/
    domains/
      academics/
      identity/
      marketing/
      planning/
    shared/
    app.config.ts
    app.routes.ts
  environments/
```

## Reglas de trabajo

- `presentation` no llama HTTP directamente
- los endpoints se consumen a través de `application` e `infrastructure`
- no se cruzan dominios desde `presentation`
- la UI debe reflejar data real del backend
- los estados vacíos deben ser explícitos y útiles

## Requisitos

- Node.js 20 o superior
- npm
- backend de Trackademy disponible en `http://localhost:8080`

## Variables y entorno

Entornos principales:

- `src/environments/environment.ts`
- `src/environments/environment.production.ts`

Verifica que `apiBaseUrl` apunte al backend correcto para tu entorno local.

## Instalación

```powershell
cd C:\Users\uu\Desktop\trackademy\trackademy-frontend
npm install
```

## Ejecución local

```powershell
cd C:\Users\uu\Desktop\trackademy\trackademy-frontend
npm run start
```

Aplicación:

- `http://localhost:4200`

## Scripts útiles

```powershell
npm run start
npx tsc -p tsconfig.app.json --noEmit
npx ng build
```

## Validación recomendada

Con el backend ya levantado:

```powershell
cd C:\Users\uu\Desktop\trackademy\trackademy-frontend
npx tsc -p tsconfig.app.json --noEmit
npx ng build
npm run start
```

Checklist manual mínimo:

1. iniciar sesión
2. verificar bloqueo correcto del onboarding ya completado
3. revisar dashboard
4. revisar mis cursos
5. abrir detalle de curso
6. editar profesor y sección
7. configurar horario
8. registrar una nota
9. revisar tareas, calendario y recordatorios
10. revisar perfil y reconfiguración del ciclo

## Estado actual del producto

Hoy el frontend ya cubre:

- login con Google y Microsoft
- onboarding académico base
- shell con sidebar y topbar
- dashboard
- mis cursos
- detalle del curso
- configuración de horario
- horario semanal
- notas
- tareas derivadas de evaluaciones reales
- calendario académico
- recordatorios construidos desde calendario y evaluaciones
- perfil académico editable
- reconfiguración del ciclo actual

## Decisiones relevantes

- `Notas` muestra por curso la primera evaluación pendiente como punto principal de acción
- `Tareas` hoy se deriva de evaluaciones reales tipo entrega, laboratorio, proyecto, práctica o avance
- `Recordatorios` hoy se construye con eventos reales de calendario y evaluaciones pendientes
- `Campus` y `Carrera` se muestran por nombre, no por ID
- `Perfil` no reabre el onboarding viejo; reconfigura el ciclo actual con reglas explícitas

## Próximas mejoras pensadas

- tareas manuales creadas por el alumno
- recordatorios manuales creados por el alumno
- sincronización real con Outlook o Google Calendar
- proyección y calculadora de notas
- edición avanzada por sesión para `ubicacion` y `url_virtual`
- QA manual cruzado en mobile y tablet

## Troubleshooting

### El frontend levanta pero no carga datos

Verifica:

- backend corriendo en `http://localhost:8080`
- sesión válida
- `apiBaseUrl` correcto en `environment.ts`

### `ng build` falla

Revisa:

- versión de Node
- dependencias instaladas
- cambios recientes en imports o standalone components

### Cambié datos del ciclo y no veo efecto

La vista de perfil ya recarga los cursos reales después de reconfigurar el ciclo. Si aún ves algo raro, refresca la sesión y valida que el backend haya persistido el cambio.
