# SautiLedger — Kubernetes Deployment

This directory contains a minimal, production-shaped Kubernetes deployment for
SautiLedger using **Traefik** as the ingress controller and **cert-manager**
for automatic Let's Encrypt TLS certificates.

The MVP runs on **SQLite** persisted to a single `ReadWriteOnce` volume, so
the workload is intentionally a single-replica `Deployment` with a `Recreate`
strategy. Switching to PostgreSQL later removes that constraint.

## Layout

```
infra/k8s/
├── base/                          # Application manifests (kustomize base)
│   ├── namespace.yaml
│   ├── configmap.yaml             # Non-secret runtime config
│   ├── secret.example.yaml        # Template — apply real values out-of-band
│   ├── pvc.yaml                   # 5Gi RWO volume for the SQLite file
│   ├── deployment.yaml            # 1 replica, Recreate, non-root, RO rootfs
│   ├── service.yaml               # ClusterIP :80 → pod :3000
│   ├── ingress.yaml               # Traefik Ingress + HTTP→HTTPS redirect
│   └── kustomization.yaml
└── cert-manager/
    └── cluster-issuer.yaml        # Let's Encrypt staging + prod ClusterIssuers
```

## Prerequisites

1. A Kubernetes cluster (1.27+) with a default `StorageClass`.
2. **Traefik** installed and reachable from the public internet on ports 80
   and 443. The standard Helm chart works:

   ```bash
   helm repo add traefik https://traefik.github.io/charts
   helm upgrade --install traefik traefik/traefik \
     --namespace traefik --create-namespace
   ```

   Confirm Traefik registered an `IngressClass` named `traefik`:

   ```bash
   kubectl get ingressclass
   ```

3. **cert-manager** installed:

   ```bash
   helm repo add jetstack https://charts.jetstack.io
   helm upgrade --install cert-manager jetstack/cert-manager \
     --namespace cert-manager --create-namespace \
     --set crds.enabled=true
   ```

4. A DNS `A`/`AAAA` record pointing your hostname (
   `sautiledger.org`) at the Traefik Service's external IP/LB.

## Build and push the image

The repository's [`Dockerfile`](../../Dockerfile) produces a single image that
serves both the API and the built React app from Express.

```bash
# From the repo root
docker build -t ghcr.io/your-org/sautiledger:$(git rev-parse --short HEAD) .
docker push   ghcr.io/your-org/sautiledger:$(git rev-parse --short HEAD)
```

Update the image reference in `base/kustomization.yaml` (or supply it through
an overlay) before applying.

## Deploy

### 1. Verify the cert-manager `ClusterIssuer` exists

The Ingress references `letsencrypt-prod`. If your cluster already has it
(common on shared clusters), skip ahead:

```bash
kubectl get clusterissuer letsencrypt-prod
# NAME               READY   AGE
# letsencrypt-prod   True    140d
```

If it does **not** exist, edit the email address in
`infra/k8s/cert-manager/cluster-issuer.yaml` and apply it once per cluster:

```bash
kubectl apply -f infra/k8s/cert-manager/cluster-issuer.yaml
```

### 2. Create real secrets (do **not** apply `secret.example.yaml` as-is)

```bash
kubectl create namespace sautiledger || true
kubectl -n sautiledger create secret generic sautiledger-secrets \
  --from-literal=SUBMISSION_HASH_SALT="$(openssl rand -hex 32)" \
  --from-literal=SESSION_SECRET="$(openssl rand -hex 32)" \
  --from-literal=INSTITUTION_DEMO_KEY="$(openssl rand -hex 16)" \
  --from-literal=OPENAI_API_KEY=""
```

For a long-lived deployment, manage these with
[sealed-secrets](https://github.com/bitnami-labs/sealed-secrets),
[external-secrets](https://external-secrets.io/), or SOPS instead.

### 3. Update the hostname

The manifests are configured for `sautiledger.org`. If you need to use a
different hostname, update it in `base/configmap.yaml` (the `CORS_ORIGIN`
value) and `base/ingress.yaml` (the `host` and `tls.hosts` fields).

### 4. Apply the base manifests

```bash
kubectl apply -k infra/k8s/base
```

### 5. Watch the rollout

```bash
kubectl -n sautiledger get pods -w
kubectl -n sautiledger logs deploy/sautiledger -f
```

cert-manager will create a `Certificate` resource and order a Let's Encrypt
cert via the HTTP-01 challenge. Track it with:

```bash
kubectl -n sautiledger get certificate,order,challenge
```

Once the `Certificate` reports `READY=True`, browsing your hostname should
resolve over HTTPS with a valid cert and HTTP requests should redirect to
HTTPS via the Traefik `Middleware` declared in `ingress.yaml`.

## Tips for staging vs. production

Let's Encrypt rate-limits production issuance aggressively (5 duplicate
certs per week per hostname). When iterating on the Ingress config, switch
the annotation in `ingress.yaml` to:

```yaml
cert-manager.io/cluster-issuer: "letsencrypt-staging"
```

…re-apply, confirm the Certificate becomes `READY`, then flip back to
`letsencrypt-prod` for a browser-trusted cert.

## Future hardening

- **Postgres**: introduce a managed Postgres connection (set
  `DATABASE_URL`), drop `DATABASE_PATH` and the PVC, then bump `replicas`
  and switch the Deployment strategy to `RollingUpdate`.
- **NetworkPolicy**: restrict pod-to-pod traffic.
- **HorizontalPodAutoscaler**: only meaningful once the SQLite single-writer
  constraint is gone.
- **PodDisruptionBudget** + `topologySpreadConstraints`: same.
- **Real institution accounts** + RBAC: replaces `INSTITUTION_DEMO_KEY`.
- **SealedSecrets / ExternalSecrets** instead of raw `kubectl create secret`.
