# Trackademy Frontend

Frontend de Trackademy en Angular con arquitectura DDD aplicada a frontend.

## Proyecto

Trackademy es una plataforma académica para estudiantes universitarios que centraliza su organización del ciclo: onboarding guiado, catálogo de cursos, calendario académico y seguimiento del progreso. El objetivo del producto es reducir fricción operativa y ofrecer una base de datos estructurada para futuras analíticas, recomendaciones y automatización de estudio.

Metas del proyecto:
- Consolidar información académica dispersa en una sola experiencia.
- Reducir el tiempo de planificación semanal del estudiante.
- Preparar data consistente para analítica/ML sin pedir más pasos de los necesarios.

## Stack (Frontend)

- Angular (standalone components + Angular Router)
- TypeScript
- RxJS
- Angular Forms (Reactive Forms)
- SCSS

## Arquitectura

El frontend se organiza por dominios (bounded contexts). Cada dominio tiene capas explícitas:

- `domain`: modelos puros, tipos de negocio, reglas y puertos.
- `application`: casos de uso y orquestación del dominio.
- `infrastructure`: adaptadores técnicos (API, storage, auth, providers).
- `presentation`: páginas y componentes del dominio.

Dominios actuales:
- `identity`: autenticación y sesión.
- `academics`: onboarding y catálogo académico.
- `planning`: planificación (reservado para próximas features).
- `marketing`: landing pública.

## Estructura de carpetas

```
src/app
  domains
    academics
      application
      domain
      infrastructure
      presentation
    identity
      application
      domain
      infrastructure
      presentation
    planning
      application
      domain
      infrastructure
      presentation
    marketing
      application
      domain
      infrastructure
      presentation
  shared
  app.routes.ts
  app.config.ts
```

## Reglas de dependencias

- `presentation` solo depende de `application` del mismo dominio.
- `application` orquesta `domain` y puede usar `infrastructure` del mismo dominio.
- `domain` no depende de Angular ni de infraestructura.
- No se permiten imports directos entre dominios (si es necesario, exponer un caso de uso desde `application`).

## Configuración de entorno

- `src/environments/environment.ts`: valores de desarrollo local.
- `src/environments/environment.production.ts`: defaults de producción.

## Cómo trabajar nuevas features

1. Define el dominio (o crea uno nuevo si el concepto no pertenece a los actuales).
2. Modela el caso de uso en `application`.
3. Implementa adaptadores en `infrastructure` (API, storage, OAuth).
4. Conecta la UI en `presentation` consumiendo el caso de uso.
5. Evita acceder a servicios HTTP desde `presentation`.

## Checklist antes de modificar

- Verifica si el cambio pertenece a un dominio existente.
- Mantén los límites de importación (no cruces dominios desde `presentation`).
- Si agregas endpoints, crea o ajusta un caso de uso en `application`.
- Si agregas data de API, define el DTO en `application` o `domain` y mapea en `infrastructure`.

## Desarrollo

```bash
npm install
npm run start
```

La app corre en `http://localhost:4200`.

## Validacion integrada

Si el backend ya esta corriendo en `http://localhost:8080`, para probar el producto completo:

```powershell
cd C:\Users\uu\Desktop\trackademy\trackademy-frontend
npm run start
```

Validacion rapida del frontend:

```powershell
cd C:\Users\uu\Desktop\trackademy\trackademy-frontend
npx tsc -p tsconfig.app.json --noEmit
npx ng build
```

Validacion rapida del backend:

```powershell
cd C:\Users\uu\Desktop\trackademy\trackademy-backend
.\mvnw.cmd -DskipTests compile
```

## Estado actual del producto

La version actual ya tiene operativo:

- autenticacion Google y Microsoft
- onboarding academico base
- dashboard principal
- mis cursos
- detalle del curso
- configuracion de horario
- horario semanal
- notas
- tareas derivadas de evaluaciones reales
- calendario academico
- recordatorios construidos con data real
- perfil con reconfiguracion del ciclo actual

## Mejoras pensadas para la siguiente etapa

- tareas manuales creadas por el alumno
- recordatorios manuales creados por el alumno
- sincronizacion real con Outlook o Google Calendar
- proyeccion y calculadora de notas
- edicion avanzada por sesion para `ubicacion` y `url_virtual`
- QA manual cruzado en mobile y tablet
- pruebas backend completas cuando el entorno tenga dependencias resueltas
