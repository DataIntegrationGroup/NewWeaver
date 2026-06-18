# Deploying NewWeaver

NewWeaver is a static SPA served by nginx on **Cloud Run** at
`newweaver.newmexicowaterdata.org`. Pushing to `main` triggers
`.github/workflows/deploy.yml`, which builds the container, pushes it to
Artifact Registry, and deploys it. CI authenticates to GCP with **Workload
Identity Federation** — there is no service-account key to store, so the app
needs no secret manager.

## What runs in CI

`Dockerfile` → multi-stage: `pnpm build` produces `dist/`, then nginx
(`nginx/default.conf.template`) serves it with SPA fallback + asset caching.
nginx listens on `$PORT` (Cloud Run sets it; defaults to 8080).

---

## One-time GCP setup

Run once by a project owner. Replace the placeholders.

```sh
export PROJECT_ID=<gcp-project-id>
export PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
export REGION=us-central1
export REPO=newweaver
export SERVICE=newweaver
export GITHUB_REPO=DataIntegrationGroup/NewWeaver

gcloud config set project "$PROJECT_ID"

# 1. Enable APIs
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iamcredentials.googleapis.com

# 2. Artifact Registry repo for the image
gcloud artifacts repositories create "$REPO" \
  --repository-format=docker --location="$REGION" \
  --description="NewWeaver container images"

# 3. Deploy service account
gcloud iam service-accounts create newweaver-deployer \
  --display-name="NewWeaver GitHub Actions deployer"
export DEPLOY_SA=newweaver-deployer@"$PROJECT_ID".iam.gserviceaccount.com

# Roles: deploy to Cloud Run, push images, act as the runtime SA
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOY_SA" --role="roles/run.admin"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOY_SA" --role="roles/artifactregistry.writer"
gcloud iam service-accounts add-iam-policy-binding \
  "$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --member="serviceAccount:$DEPLOY_SA" --role="roles/iam.serviceAccountUser"

# 4. Workload Identity Federation — let the GitHub repo impersonate the SA
gcloud iam workload-identity-pools create github \
  --location=global --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc github \
  --location=global --workload-identity-pool=github \
  --display-name="GitHub OIDC" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='${GITHUB_REPO}'"

export WIF_POOL=$(gcloud iam workload-identity-pools describe github \
  --location=global --format='value(name)')

# Bind: only this repo may impersonate the deploy SA
gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/${WIF_POOL}/attribute.repository/${GITHUB_REPO}"

# The provider resource name to give GitHub (see below)
echo "GCP_WIF_PROVIDER=${WIF_POOL}/providers/github"
echo "GCP_DEPLOY_SA=${DEPLOY_SA}"
echo "GCP_PROJECT_ID=${PROJECT_ID}"
```

## GitHub repository variables

Settings → Secrets and variables → Actions → **Variables** (these are config,
not secrets):

| Variable           | Value                                                              |
| ------------------ | ----------------------------------------------------------------- |
| `GCP_PROJECT_ID`   | your project id                                                    |
| `GCP_DEPLOY_SA`    | `newweaver-deployer@<project>.iam.gserviceaccount.com`            |
| `GCP_WIF_PROVIDER` | `projects/<num>/locations/global/workloadIdentityPools/github/providers/github` |

## Custom domain

Map `newweaver.newmexicowaterdata.org` to the service (Cloud Run manages the
TLS cert):

```sh
gcloud beta run domain-mappings create \
  --service="$SERVICE" --region="$REGION" \
  --domain=newweaver.newmexicowaterdata.org
```

Then add the `CNAME` (or A/AAAA) records it prints to the
`newmexicowaterdata.org` DNS zone. Cert provisioning takes a few minutes after
DNS resolves.

> Domain mapping availability varies by region. If unavailable in
> `us-central1`, front the service with a Global External HTTPS Load Balancer +
> serverless NEG instead, or deploy the service in a region that supports it.

## Endpoint overrides (optional)

The app defaults to the public STA/Features URLs in `src/config.ts`. To point a
build elsewhere, set `VITE_STA_BASE_URL`, `VITE_STA_ST2_BASE_URL`, or
`VITE_FEATURES_BASE_URL` as build args before `pnpm build`. These are public
endpoints baked into the static bundle — not secrets.

## Local container test

```sh
docker build -t newweaver .
docker run --rm -p 8080:8080 newweaver   # → http://localhost:8080
```
