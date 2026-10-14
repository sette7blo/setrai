# Setrai

Self-hosted training, workout sessions, statistics, and muscle recovery. Data stays
in your SQLite database; Nostr, AI, and Monero are optional.

**Three tracks (do not mix them):**

| Track | What you do |
|-------|-------------|
| **Install / self-host** | Empty folder + paste below → published Docker image |
| **Develop** | Git clone → `npm start` (no Docker required) |
| **Ship** | Version tag → CI publishes `dockersette/setrai` |

A git checkout is for development. Production installs do **not** clone this repo.

---

## Install (Docker Compose)

Create an empty directory. Add two files. No Node.js and no git checkout.

**compose.yaml**

```yaml
services:
  setrai:
    image: ${SETRAI_IMAGE:-dockersette/setrai:latest}
    restart: unless-stopped
    init: true
    env_file:
      - .env
    environment:
      SETRAI_HOST: 0.0.0.0
      SETRAI_PORT: "3000"
      SETRAI_DATA_DIR: /data
      SETRAI_DB_PATH: /data/setrai.db
    ports:
      - "${SETRAI_BIND_ADDRESS:-127.0.0.1}:${SETRAI_HTTP_PORT:-3000}:3000"
    volumes:
      - setrai_data:/data
    read_only: true
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=64m
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    stop_grace_period: 30s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  setrai_data:
```

**.env**

```bash
# Pin a release instead of latest when you want controlled upgrades, e.g.:
# SETRAI_IMAGE=dockersette/setrai:0.1.0
SETRAI_IMAGE=dockersette/setrai:latest
SETRAI_BIND_ADDRESS=127.0.0.1
SETRAI_HTTP_PORT=3000

AI_ENABLED=false
NOSTR_ENABLED=false
MONERO_WALLET_ENABLED=false

# Built-in auth is not implemented yet. Keep this off the public internet
# or put it behind a trusted VPN / authenticated reverse proxy.
SETRAI_AUTH_ENABLED=false
```

Then:

```bash
touch .env && chmod 600 .env   # after filling values
docker compose pull
docker compose up -d --wait
```

Open `http://localhost:3000` (or the host/port you set). Data lives in the
`setrai_data` volume and survives upgrades.

```bash
# upgrade
docker compose pull && docker compose up -d --wait
```

The same templates live under [`deploy/`](deploy/) if you prefer downloading files
instead of pasting. Details: [deployment guide](docs/deployment.md).

---

## Develop from source

```bash
git clone https://github.com/sette7blo/setrai.git
cd setrai
cp .env.example .env   # host paths, e.g. SETRAI_DATA_DIR=./data and your port
npm ci
npm run check
npm start
```

Docker Compose is **not** required for day-to-day development. Configure the host
`.env` for your machine; do not use the install folder’s Compose layout on top of
a live source checkout unless you intentionally want a separate container instance.

Optional: build a local image and smoke-test it — see
[deployment guide](docs/deployment.md#build-the-container-from-source).

---

## Publish

CI (`.github/workflows/docker.yml`) builds and pushes multi-arch images to
**`dockersette/setrai`** on version tags (`v*.*.*`), `main` (`latest`), or manual
dispatch. Maintainers do not publish from a casual `docker compose` in the clone.
