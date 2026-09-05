# Gasto

Aplicación multiplataforma de finanzas personales para registrar ingresos y gastos, organizar
movimientos por categorías y consultar resúmenes visuales. Está construida con Expo y adopta
una arquitectura *offline-first*: los datos permanecen disponibles sin conexión y se
sincronizan con Supabase cuando la red vuelve a estar disponible.

## Características

- Registro e inicio de sesión con Supabase Auth.
- Gestión de ingresos, gastos, transferencias internas, billeteras y categorías personalizadas.
- Balance general agregado y alcance global por billetera en Dashboard, Movimientos y Reportes.
- Dashboard con carrusel de billeteras, actividad reciente y resumen mensual.
- Reportes y gráficas de distribución de gastos filtrados por el alcance activo.
- Pantalla de Ajustes con accesos dedicados para administrar billeteras y categorías.
- Creación, edición y eliminación de billeteras y categorías desde sus propias pantallas.
- Persistencia local con SQLite para trabajar sin conexión.
- Sincronización automática y resolución determinista de conflictos.
- Soporte para Android, iOS y web mediante Expo Router.

## Tecnologías

- [Expo](https://expo.dev/) y React Native
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Supabase](https://supabase.com/) (Auth y PostgreSQL)
- Expo SQLite
- TypeScript
- [EAS Build](https://docs.expo.dev/build/introduction/)

## Requisitos

- Node.js y npm
- Un proyecto de Supabase
- Una cuenta de Expo para generar builds con EAS

## Configuración local

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. En un proyecto nuevo de Supabase, ejecuta
   [`supabase/migrations/initialization.sql`](supabase/migrations/initialization.sql) desde el
   SQL Editor. El script crea el esquema, las relaciones, los índices, las políticas RLS y el
   RPC de sincronización.

3. Crea un archivo `.env` en la raíz:

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA
   ```

4. Inicia el servidor de desarrollo:

   ```bash
   npm start
   ```

También puedes abrir directamente una plataforma con `npm run android`, `npm run ios` o
`npm run web`.

## Builds con EAS

La configuración incluida en [`eas.json`](eas.json) define perfiles de desarrollo, vista previa
y producción. En un fork, crea un proyecto en Expo, copia su ID y configura
`EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` en el
[entorno correspondiente de EAS](https://docs.expo.dev/eas/environment-variables/).

```bash
npx eas-cli@latest login
npx eas-cli@latest init --id TU_PROJECT_ID --force

# Build interno para pruebas
npx eas-cli@latest build --platform android --profile preview

# Generas un nuevo APK
eas build -p android --profile preview

# Build de producción para Android e iOS
npx eas-cli@latest build --platform all --profile production
```

## Funcionamiento offline

En Android e iOS, las billeteras, las categorías y los movimientos se escriben primero en
SQLite. Los cambios pendientes se sincronizan al recuperar conexión, abrir la aplicación o
volver del segundo plano. El primer inicio de sesión y la descarga inicial requieren internet.

El Balance general no es una fila de la base de datos: es la vista agregada de todos los
movimientos. Una transacción con `wallet_id = NULL` queda sin billetera y solo aparece dentro
de ese agregado. La billetera activa se conserva localmente por usuario.

Las transferencias internas se almacenan como un único movimiento entre dos billeteras. No se
contabilizan como ingreso ni gasto: su efecto es cero en el Balance general, negativo en la
billetera de origen y positivo en la billetera de destino.

Supabase conserva las eliminaciones como *tombstones* y el RPC autenticado
`sync_finance_data` resuelve conflictos con una estrategia de último cambio ganador. Cada
usuario solo puede acceder a sus propias filas mediante políticas RLS.

## Estructura del proyecto

```text
app/                  Rutas y layouts de Expo Router
assets/               Imágenes, iconos y recursos visuales
src/
  components/         Componentes reutilizables de interfaz
  constants/          Constantes compartidas
  features/           Módulos de dominio y pantallas
    auth/              Autenticación y sesión
    categories/        Gestión de categorías
    dashboard/         Resumen financiero
    offline/           Base local y sincronización
    reports/           Cálculos y visualizaciones
    settings/          Pantalla de ajustes y accesos de administración
    transactions/      Gestión de movimientos
    wallets/           Gestión y alcance global de billeteras
  hooks/              Hooks compartidos
  lib/                Clientes e integraciones
supabase/migrations/  Inicializador canónico
```

Los archivos de `app/` se mantienen como rutas ligeras. La lógica de cada flujo vive en su módulo
de `src/features/`, mientras que las integraciones compartidas se concentran en `src/lib/`.

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm start` | Inicia Expo y Metro. |
| `npm run android` | Abre el proyecto en Android. |
| `npm run ios` | Abre el proyecto en iOS. |
| `npm run web` | Inicia la versión web. |
| `npm run lint` | Ejecuta la revisión estática del proyecto. |

## Licencia

Este proyecto se distribuye bajo la [licencia MIT](LICENSE).
