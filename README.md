# SucursalesDashboard

Dashboard analítico (SPA Angular 21) para el monitoreo operativo de una red de sucursales:
estado de la red, cobertura comercial, compensaciones, emails de verificación, auditoría y
calidad de datos.

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/README.md](./docs/README.md) | Índice + mapa mental en 30 segundos. |
| [docs/arquitectura.md](./docs/arquitectura.md) | Arquitectura técnica: stack, capas, fuente de datos abstracta, agregación, build, migración al backend. |
| [docs/funcional.md](./docs/funcional.md) | Documentación funcional: filtro global, conceptos de negocio y detalle de cada página. |
| [docs/modelo-datos.md](./docs/modelo-datos.md) | Modelo de datos: diagrama entidad-relación y tablas CSV. |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Convenciones e invariantes de arquitectura para contribuir. |

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.17.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
