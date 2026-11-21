# Deploying Setrai

Three separate tracks. Do not mix them in one folder.

| Track | Location | How |
|-------|----------|-----|
| **Install / self-host** | Empty directory | Paste Compose from README (or copy `deploy/`) + published image |
| **Develop** | Git checkout | `npm start` — no Docker required |
| **Ship** | CI / tags | Publish `dockersette/setrai` |

A source checkout is **not** an install directory. Running Compose from the repo
root is not the public install path.

---

## Develop from source

Use the existing host `.env` and database:

```bash
npm ci
npm run check
npm start
```

The server serves `dist/client`, produced by the build step in `npm run check`.
Keep `SETRAI_DATA_DIR` and `SETRAI_DB_PATH` pointing at your existing writable
storage. Host settings are independent of any Docker install folder.

---

## Install the published image

Requires Docker Engine with the Compose v2 plugin (or Docker Desktop). No Node.js,
Git checkout, Ollama, or wallet is required.

**Preferred:** create an empty directory and paste `compose.yaml` + `.env` from the
[README](../README.md).

**Alternative:** download the same templates from `deploy/`:

```bash
mkdir setrai && cd setrai
curl -fsSO https://raw.githubusercontent.com/sette7blo/setrai/main/deploy/compose.yaml
curl -fsS -o .env.example https://raw.githubusercontent.com/sette7blo/setrai/main/deploy/.env.example
cp .env.example .env
chmod 600 .env
# edit .env, then:
docker compose pull
docker compose up -d --wait
```

Open `http://localhost:3000`. Check startup using:

```bash
docker compose ps
docker compose logs --tail=100 setrai
```

The installer uses `dockersette/setrai:latest` by default. For controlled updates,
set `SETRAI_IMAGE=dockersette/setrai:0.1.0` to a version that has actually been
published, or pin an image digest. Version examples are not a claim that the
Docker Hub image already exists.

Compose passes `.env` at runtime. The image contains no operator configuration,
private keys, databases, Git checkout, or development dependencies. Inside the
container the server always listens on port 3000 and uses `/data/setrai.db`;
Compose overrides host-specific `SETRAI_HOST`, `SETRAI_PORT`, `SETRAI_DATA_DIR`,
and `SETRAI_DB_PATH` to match the volume. `SETRAI_HTTP_PORT` selects the published
host port. The runtime runs as the Node user (UID/GID 1000), with a read-only root
filesystem, writable `/data` volume, and temporary `/tmp` filesystem.

Only run one Setrai replica against a data volume. This is a single-instance
SQLite deployment. Named volume ownership is initialized automatically for a
fresh installation; host bind mounts instead require appropriate UID/GID 1000
permissions.

---

## Access from other devices

The default `SETRAI_BIND_ADDRESS=127.0.0.1` exposes the app only on the Docker host.
For a trusted home network or private VPN interface, choose that host address in
`.env`, or use `SETRAI_BIND_ADDRESS=0.0.0.0` to listen on all host interfaces.
Then recreate the service:

```bash
docker compose up -d --wait
```

For public hosting, use an authenticated HTTPS reverse proxy or private VPN.
**Built-in application authentication is not implemented.** Setting
`SETRAI_AUTH_ENABLED=true` does not protect HTTP/API routes yet. A Docker image
does not change that boundary. Do not forward the plain application port to the
public internet. HTTPS is also needed for the normal PWA experience on iOS.

A proxy running on the host can forward to `127.0.0.1:3000`. A containerized proxy
can share a Docker network with Setrai and forward to `setrai:3000`; configure
that network in your deployment override.

---

## Optional integrations

Edit `.env`, then use `docker compose up -d --force-recreate --wait` to apply
changes. `restart` alone does not reload changed container environment values.

- Set `AI_ENABLED=true`, an appropriate `AI_MODEL`, and an `OLLAMA_URL` reachable
  from the container. `127.0.0.1` inside the container refers to that container,
  not the host. The installer does not provision Ollama automatically.
- Wallet configuration remains optional; see [configuration](configuration.md)
  for supported settings and capability limitations.

Keep `.env` private. Do not share expanded `docker compose config` output because
it contains runtime environment values; use `docker compose config --quiet` to
validate configuration without printing them.

---

## Updates and data

Back up the data volume before upgrading. Then:

```bash
docker compose pull
docker compose up -d --wait
```

Setrai applies database migrations and seeds a fresh database on startup. Your
profile, exercises, workouts, and sessions remain in the named volume. Ordinary
`docker compose down` retains that volume. **`docker compose down --volumes`
deletes the installation's data.** Do not blindly downgrade after database
migrations; restore the matching backup if a rollback needs an earlier schema.

To make a consistent backup, stop Setrai while archiving the entire data volume,
including any SQLite WAL files:

```bash
docker compose stop setrai
docker compose run --rm --no-deps -T --entrypoint tar setrai -C /data -czf - . > setrai-data.tar.gz
docker compose up -d --wait
```

Keep this archive private; it contains training data. Back up `.env` separately
as secret material. For restoration, use a new, empty volume so stale SQLite
sidecar files cannot mix with the restored database. One approach uses a new
Compose project (stop the old instance first to release its port):

```bash
docker compose -p setrai-restored run --rm --no-deps -T --entrypoint tar setrai -C /data -xzf - < setrai-data.tar.gz
docker compose -p setrai-restored up -d --wait
```

Continue using `-p setrai-restored` for that installation so its volume is retained
and selected consistently. Test the restoration before removing old data.

---

## Build the container from source

Optional maintainer path only. From a **source checkout** (not an install folder):

```bash
docker compose -f deploy/compose.yaml -f deploy/compose.build.yaml --project-directory . up -d --build --wait
```

This override builds `setrai:local` from your checkout without pulling the Setrai
image from Docker Hub. It uses the same runtime configuration and volume rules.
It does not switch your existing host/source app unless you explicitly migrate.

Alternatively, build the image directly and run the isolated integration test:

```bash
docker build -t setrai:local .
npm run test:docker -- setrai:local
```

On an older Docker installation without buildx, the tested fallback is
`DOCKER_BUILDKIT=0 docker build -t setrai:local .`. Install buildx before attempting
multi-platform publication. The smoke test uses its own temporary `.env`, random
Compose project, and fresh volume; it never uses your live database. It checks
startup, compiled assets, image security, session creation, and persistence across
container replacement, then removes only its own test resources.

---

## Publish under dockersette

The intended public repository is **`dockersette/setrai`**. Create it on Docker
Hub and mark it public so other people can pull without signing in.

For the GitHub workflow, add a Docker Hub access token with write permission as
the repository Actions secret `DOCKERHUB_TOKEN`. Keep the token out of Git and
chat. The workflow already uses the username `dockersette`.

After these changes are committed to GitHub, run **Publish Docker image** manually
with tag `latest` for the first publication. Published GitHub releases produce
version tags; stable releases also update `latest`. The workflow runs the full
check suite and a real amd64 Compose smoke test before publishing Linux amd64 and
arm64 images. ARM64 is built in CI; the local host tests amd64.

For a manual publication, sign in interactively and build both architectures:

```bash
docker login --username dockersette
docker buildx build --platform linux/amd64,linux/arm64 --tag dockersette/setrai:0.1.0 --tag dockersette/setrai:latest --push .
```

Replace `0.1.0` with the intended release version. This publishes the exact local
checkout, including uncommitted changes; review it before pushing. Do not put
credentials in command-line arguments or Docker build arguments.

Docker's reference documentation covers [multi-platform publication](https://docs.docker.com/build/ci/github-actions/multi-platform/)
and [Compose service configuration](https://docs.docker.com/reference/compose-file/services/).
