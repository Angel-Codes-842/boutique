# Guía de instalación local - Boutique POS

## Requisitos

- Docker Desktop instalado y en ejecución.
- PowerShell o una terminal compatible con Docker Compose.

## Primera instalación

1. Copiar toda la carpeta del proyecto al equipo del cliente.
2. Desde la carpeta raíz, crear el archivo de entorno:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Generar y guardar dos secretos distintos. En PowerShell se pueden generar así:

   ```powershell
   [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
   ```

   Usar un valor de 64 caracteres hexadecimales para `POSTGRES_PASSWORD` y otro
   distinto para `SESSION_SECRET` en `.env`. No subir ni compartir ese archivo.
   Guardar una copia segura de ambos valores junto con el procedimiento de backup.
   Si se trata de una instalación existente con datos, conservar exactamente el
   `POSTGRES_PASSWORD` que usa su volumen actual; cambiarlo sin actualizar el rol
   PostgreSQL dejará la aplicación sin conexión a la base existente.
4. Construir y arrancar la instalación:

   ```powershell
   docker compose up --build -d
   docker compose ps
   ```

   La aplicación se publica únicamente en `http://localhost:3000`. PostgreSQL
   solo es accesible dentro de la red privada de Docker. El contenedor aplica
   las migraciones al iniciar y conserva los datos en el volumen `boutique_data`.
   Si detecta una base anterior sin historial de migraciones, verifica que su
   esquema coincida exactamente antes de registrarla como baseline. Si hay
   diferencias, se detiene sin aplicar cambios; haga un backup antes de actualizar.
5. Si se trata de una base vacía, cargar los datos de inicio:

   ```powershell
   docker compose exec app npm run prisma:seed
   ```

6. Abrir `http://localhost:3000`.

La seed crea estas cuentas iniciales:

- `admin` / `admin123`
- `cajero` / `cajero123`

Son cuentas de demostración. **No registrar ventas reales con estas claves.**
Cambiar ambas por contraseñas personales de al menos 12 caracteres desde el
icono de llave de la barra superior antes del uso operativo.

## Operación

```powershell
docker compose logs -f app
docker compose restart app
docker compose down
```

`docker compose down` conserva el volumen de base de datos. No usar `docker
compose down -v` salvo que se quiera borrar permanentemente toda la información.

## Copias de seguridad

Crear un backup antes de actualizar o mover el equipo:

```powershell
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > boutique-backup.sql
```

Probar periódicamente que el backup se puede restaurar. Mantenerlo fuera del
equipo de operación, cifrado y con acceso restringido.

## Límites de esta instalación

- El servicio solo acepta conexiones desde el mismo equipo. No exponer el puerto
  3000 a la LAN/Internet sin diseñar acceso y HTTPS.
- Los comprobantes generados son internos y están marcados “Sin valor fiscal”;
  no sustituyen la facturación electrónica ni garantizan cumplimiento SIFEN.
- El pago mixto no está habilitado hasta que se registren y concilien los importes
  correspondientes a cada medio de pago.
- Esta guía no sustituye pruebas de aceptación del negocio, capacitación ni una
  restauración verificada de los datos.
