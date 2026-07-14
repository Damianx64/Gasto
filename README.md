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

## Estructura

```text
app/
  (auth)/        Flujos de autenticacion
  (tabs)/        Navegacion principal
  transaction/   Alta y detalle de movimientos

src/
  components/    Componentes reutilizables de UI
  constants/     Valores constantes de la app
  features/      Modulos del dominio
  hooks/         Hooks compartidos
  lib/           Integraciones, clientes y configuracion tecnica
  types/         Tipos globales
  utils/         Utilidades compartidas
```

