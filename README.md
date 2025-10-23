# Backend | Plataforma iot

<div style="text-align: center">
    <img src="https://academy.dignal.com/wp-content/uploads/2023/01/dignal_academy_logo_site.png" width="400" alt="Dignal Academy"/>
</div>

## Contenido

- Este repositorio contiene el backend de nuestra plataforam iot, hecho en node.

# Uso

- Para iniciar debes clonar este repositorio en tu equipo por medio del siguiente comando de git:
- Si eres usuario windows debes clonar esta carpeta dentro de la carpeta raíz del WSL.

```bash
git clone git@github.com:Dignal-Electronics/web-iot-backend.git
```

- El proyecto debe ser levantado usando docker, para ello primero debemos de instalar las dependencias usando el comando `npm install`:

```bash
docker compose -f .docker/compose.yaml run --rm node npm install
```

- Después de instalar las dependencias debemos levantar el contendor:

```bash
docker compose -f .docker/compose.yaml up -d
```

## Configuración inicial

- Configurar archivo config.json ubicado en la carpeta config (solo development, en caso de ser necesario)

- Ejecutar comando `npx sequelize-cli db:create` para crear la base de datos

```bash
docker compose -f .docker/compose.yaml run --rm node npx sequelize-cli db:create
```

- Ejecutar comando `npx sequelize-cli db:migrate` para construcción de tablas base.

```bash
docker compose -f .docker/compose.yaml run --rm node npx sequelize-cli db:migrate
```

- Configurar archivo .env ubicado en el directorio raíz del proyecto

- Ejecutar el comando `npx sequelize-cli db:seed:all` para crear usuario demo.

```bash
docker compose -f .docker/compose.yaml run --rm node npx sequelize-cli db:seed:all
```
