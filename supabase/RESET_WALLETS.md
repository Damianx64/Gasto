# Ventana administrativa de reset para billeteras

Este procedimiento es deliberadamente manual y de una sola ejecución. No debe incluirse en
una migración reutilizable porque elimina cuentas y datos de forma irreversible.

## Antes de comenzar

1. Desplegar y validar las migraciones versionadas de `supabase/migrations/`.
2. Confirmar inmediatamente antes del reset que el proyecto seleccionado sea **Gasto** y que
   se eliminarán todas las cuentas de Auth, perfiles, categorías y movimientos.
3. Detener temporalmente nuevos registros o coordinar una ventana sin usuarios activos.
4. Conservar un respaldo únicamente si se necesita recuperar datos después de la ventana.

## Reset remoto

1. Revocar las sesiones y *refresh tokens* existentes.
2. Eliminar todos los usuarios desde Supabase Auth mediante una operación administrativa.
   Las relaciones `ON DELETE CASCADE` eliminan perfiles, categorías, billeteras y movimientos.
3. Verificar que `auth.users`, `profiles`, `categories`, `wallets` y `transactions` estén vacías.
4. Recordar que un *access token* ya emitido puede seguir siendo válido hasta que expire. Al
   no existir su usuario ni sus filas, las políticas RLS y claves foráneas impiden acceso o
   nuevas escrituras financieras válidas.

## Reset local

La aplicación ejecuta una marca única `app:data-reset:wallets-v1` antes de restaurar una
sesión. En su primera apertura después de publicar esta versión:

- cierra la sesión local;
- elimina la identidad offline y las claves de sesión guardadas;
- limpia la selección de billetera y los formularios persistidos;
- recrea SQLite con la versión que incorpora `local_wallets` y `wallet_id`.

Cada usuario deberá registrarse nuevamente. No se debe cambiar ni retirar la marca hasta que
todos los clientes que deban resetearse hayan recibido esta versión.
