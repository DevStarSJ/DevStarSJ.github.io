---
layout: post
title: "Container Security in 2026: The Shift-Left Playbook That Actually Works"
subtitle: "From image scanning to runtime policies — a practical security strategy for teams that ship fast without compromising on hardening"
date: 2026-05-01 12:00:00
author: "Seokjun Lee"
header-img: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1600&auto=format&fit=crop"
catalog: true
categories:
  - DevOps
  - Security
tags:
  - Container Security
  - Kubernetes
  - DevSecOps
  - Docker
  - Shift Left
  - Supply Chain Security
---

Container security has a reputation problem. Most teams treat it as a checkbox — run a scanner, review a report, ignore 90% of the findings because there are too many to fix, ship the container anyway. This approach provides the feeling of security without the substance of it.

In 2026, this is increasingly untenable. Supply chain attacks are mainstream. Runtime container escapes make headlines. Compliance requirements are stricter. But the underlying problem hasn't changed: security processes that slow teams down get bypassed.

Here's a security-in-depth approach that's practical enough to actually stick.

![Container Security](https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200&auto=format&fit=crop)
*Photo by Markus Spiske on Unsplash*

## Layer 1: Build Security — Before the Code Leaves Your Machine

### Minimal Base Images

The most effective security improvement with the least effort: use minimal base images.

```dockerfile
# ❌ Common approach — large attack surface
FROM node:20

# ✅ Better — minimal debian base
FROM node:20-slim

# ✅✅ Best — distroless (no shell, no package manager)
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build

FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER nonroot
CMD ["dist/server.js"]
```

Distroless images have no shell, no package manager, no unnecessary utilities. An attacker who gains code execution inside your container has almost nothing to work with. Vulnerability counts drop from hundreds to dozens.

Chainguard has become the leader in hardened base images — their "wolfi" images are rebuilt daily with only the latest patched packages.

### Non-Root Users

```dockerfile
# Always specify a non-root user
RUN useradd --uid 1001 --no-create-home appuser
USER 1001

# Or for distroless
USER nonroot:nonroot
```

Surprisingly, many production containers still run as root. A process running as root inside a container that escapes its namespaces gets root on the host. This is a simple fix with significant impact.

### Read-Only Root Filesystem

```dockerfile
# Can't set this in Dockerfile, but enforce in Kubernetes
```

```yaml
# kubernetes/deployment.yaml
securityContext:
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]
volumeMounts:
  - name: tmp
    mountPath: /tmp
  - name: var-run
    mountPath: /var/run
volumes:
  - name: tmp
    emptyDir: {}
  - name: var-run
    emptyDir: {}
```

A read-only root filesystem means malware can't write itself to disk, can't modify binaries, can't install tools. If your app needs to write files, give it explicit writable mounts.

## Layer 2: Supply Chain Security

The most significant evolution in container security over the last two years is supply chain security — verifying that the code and dependencies you ship are what you intended.

### SBOM Generation

A Software Bill of Materials (SBOM) documents every component in your container image:

```bash
# Generate SBOM with Syft
syft nginx:latest -o spdx-json > sbom.json

# Or with Docker's built-in SBOM support (Docker Desktop 4.x+)
docker sbom nginx:latest
```

SBOMs enable:
- Rapid impact assessment when a new CVE drops ("are we affected?")
- License compliance auditing
- Regulatory compliance (EU Cyber Resilience Act now requires SBOMs)

### Image Signing with Cosign

```bash
# Sign your image after building
cosign sign --key cosign.key ghcr.io/myorg/myapp:v1.2.3

# Verify in CI before deploying
cosign verify --key cosign.pub ghcr.io/myorg/myapp:v1.2.3

# Or use keyless signing with OIDC (no key management)
cosign sign ghcr.io/myorg/myapp:v1.2.3
# Automatically uses OIDC token from GitHub Actions / GCP / etc.
```

### Policy Enforcement with Kyverno

Once your images are signed, enforce that policy in Kubernetes:

```yaml
# Only allow signed images from your registry
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-signed-images
spec:
  validationFailureAction: Enforce
  rules:
    - name: verify-image-signatures
      match:
        any:
          - resources:
              kinds: ["Pod"]
      verifyImages:
        - imageReferences: ["ghcr.io/myorg/*"]
          attestors:
            - count: 1
              entries:
                - keyless:
                    subject: "https://github.com/myorg/*"
                    issuer: "https://token.actions.githubusercontent.com"
```

Unsigned images from your registry will be rejected at admission. This means a supply chain attack that injects a malicious image into your registry won't make it to production.

![Security Architecture](https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&auto=format&fit=crop)
*Photo by Franck on Unsplash*

## Layer 3: Vulnerability Management

### The Scanning Problem

Vulnerability scanners (Trivy, Grype, Snyk) are valuable but produce noise. A typical Node.js image might have 200+ CVEs, but 90% are in libraries your code never calls. 

The solution isn't to scan less — it's to prioritize better:

```bash
# Trivy with meaningful filters
trivy image \
  --severity CRITICAL,HIGH \
  --ignore-unfixed \
  --exit-code 1 \
  myapp:latest

# Focus on OS packages (usually most actionable)
trivy image \
  --vuln-type os \
  --severity CRITICAL \
  myapp:latest
```

**--ignore-unfixed** is key: don't fail on vulnerabilities that have no available fix. You can't fix what isn't fixed.

### Continuous Scanning

Your container's vulnerability profile changes even when you don't change your code. Add scanning to your CD pipeline *and* scan running images on a schedule:

```yaml
# .github/workflows/scan.yml
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: aquasecurity/trivy-action@master
        with:
          image-ref: ghcr.io/myorg/myapp:${{ github.sha }}
          format: sarif
          output: trivy-results.sarif
          severity: CRITICAL,HIGH
          exit-code: 1
          ignore-unfixed: true
      
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: trivy-results.sarif
```

## Layer 4: Runtime Security

Static scanning tells you about known vulnerabilities. Runtime security tells you about actual malicious behavior.

### Falco — Kernel-Level Behavioral Detection

Falco uses eBPF to monitor system calls and detect anomalous container behavior:

```yaml
# Custom Falco rule — alert on shell spawning in web containers
- rule: Shell in Web Container
  desc: Shell was spawned in a container labeled as web service
  condition: >
    spawned_process and
    container.label.service = "web" and
    proc.name in (shell_binaries)
  output: >
    Shell spawned in web container (user=%user.name container=%container.name
    command=%proc.cmdline)
  priority: WARNING
```

Common signals worth detecting:
- Shell spawning inside containers (likely exploitation)
- Unexpected network connections (C2 callbacks)
- Writing to unusual filesystem paths
- Privilege escalation attempts
- Unexpected process execution

### Network Policies

Zero-trust networking at the Kubernetes level:

```yaml
# Default deny all ingress/egress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes: ["Ingress", "Egress"]

---
# Explicitly allow what's needed
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-to-db
spec:
  podSelector:
    matchLabels:
      app: database
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api
      ports:
        - port: 5432
```

Cilium (eBPF-based) has become the preferred CNI for teams that want powerful network policies — it supports L7 policies (HTTP method/path-level), DNS-based policies, and observability built in.

## Putting It Together: A Realistic Security Pipeline

The key insight: security has to be automated and fast, or teams will bypass it.

```
Developer commit
      ↓
[Pre-commit] secrets scanning (git-secrets, truffleHog)
      ↓
[CI Build] → sign image → generate SBOM → scan (CRITICAL only, ignore-unfixed)
      ↓
[Registry] signed, immutable image with attestations
      ↓
[Deploy] Kyverno policy enforcement (signature verification)
      ↓
[Runtime] Falco behavioral monitoring + Network Policies
      ↓
[Continuous] Scheduled re-scan, SBOM diff alerts on new CVEs
```

Each layer catches different things. None of them require developers to significantly change their workflow. The scanning runs in parallel with tests, not before. The enforcement happens at the cluster level, not as a manual approval step.

Security that ships with the software, rather than blocking it — that's the shift-left playbook that actually sticks.

---

*Which of these layers does your team currently have in place? Drop a comment — I'm especially curious whether anyone is using Falco in production and what their false-positive experience has been.*
