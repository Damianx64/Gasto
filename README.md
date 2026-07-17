# Gasto

App de finanzas personales construida con Expo Router.

## Desarrollo

1. Instalar dependencias

   ```bash
   npm install
   ```

2. Iniciar Expo

   ```bash
   npx expo start
   ```
   ó
   ```bash
   npm run android
   ```

## Estructura

```text
app/
  (auth)/        Rutas de autenticacion
  (tabs)/        Rutas de navegacion principal
  category/      Rutas de categorias
  transaction/   Rutas de movimientos

src/
  components/    Componentes reutilizables de UI
  constants/     Valores constantes de la app
  features/
    auth/         Sesion, acceso y registro
    categories/   Consultas, tipos, editores y gestion de categorias
    transactions/ Consultas, tipos, formatos y editores de movimientos
  hooks/         Hooks compartidos
  lib/           Integraciones, clientes y configuracion tecnica
```

Los archivos de `app/` solo definen rutas. La logica de cada flujo vive en su modulo de
`src/features/`, y el acceso a Supabase se concentra en los archivos `*.api.ts`.
