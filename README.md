<p align="center">
  <img src="./public/compy.png" alt="crapdash logo" width="120" />
</p>

# crapdash

A low-frills, customizable homepage to organize your links and services. Group them into categories and access everything from one place.

<p align="center">
  <img src="./public/screenshots/screen-grab-light.png" alt="Light mode" width="49%" />
  <img src="./public/screenshots/screen-grab-dark.png" alt="Dark mode" width="49%" />
</p>

## Features

- **Services**: Save links with names, descriptions, and custom icons
- **Categories**: Group services by project, team, or whatever makes sense
- **Admin panel**: Manage services and categories through a simple UI

## Installation

### Docker

```bash
docker run -d \
  --name crapdash \
  -p 2727:2727 \
  --mount type=bind,source=/path/to/data,target=/app/data \
  --restart=unless-stopped \
  ghcr.io/crapshack/crapdash:latest
```

### Docker Compose

```yaml
services:
  crapdash:
    image: ghcr.io/crapshack/crapdash:latest
    container_name: crapdash
    restart: unless-stopped
    ports:
      - "2727:2727"
    volumes:
      - ./crapdash:/app/data
```

## Stack

![Next.js](https://img.shields.io/badge/Next.js-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-38B2AC?logo=tailwindcss&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?logo=shadcnui&logoColor=white)
