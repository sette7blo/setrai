# Setrai

Self-hosted training, workout sessions, statistics, and muscle recovery. Data stays
in your SQLite database; Nostr, AI, and Monero are optional.

## Install with Docker Compose

Download `compose.yaml` and
`deploy/.env.example` from the same release into an empty installation directory.
Rename the example to `.env`, then run:

```bash
docker compose pull
docker compose up -d --wait
```

Open `http://localhost:3000`. The database lives in the `setrai_data` volume and
survives updates. All optional integrations start disabled. Configure access from
other devices, updates, backups, and Docker Hub publication using the
[deployment guide](docs/deployment.md).

## Build from source

Keep the source workflow if you develop Setrai:

```bash
npm ci
npm run check
npm start
```

Configure the existing `.env` for your host, including `SETRAI_DATA_DIR=./data`
and your chosen port. To build an optional local container instead, see the
[container build instructions](docs/deployment.md#build-the-container-from-source).

The public Compose installer pulls the published image; it does not build from
source and does not require
Node.js or a source checkout.
