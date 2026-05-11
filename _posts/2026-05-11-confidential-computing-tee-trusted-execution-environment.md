---
layout: post
title: "Confidential Computing: Protecting Data in Use with Trusted Execution Environments"
subtitle: "How Intel TDX, AMD SEV, and AWS Nitro Enclaves enable computation on encrypted data — even from the cloud provider"
date: 2026-05-11 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1510511459019-5dda7724fd87?w=1200&auto=format&fit=crop&q=80"
catalog: true
tags:
  - Security
  - Confidential Computing
  - TEE
  - Cloud Security
  - Privacy
---

## The Gap in Cloud Security

Traditional cloud security covers two out of three states of data:

- **Data at rest**: Encrypted on disk ✅
- **Data in transit**: Encrypted over the wire (TLS) ✅
- **Data in use**: Plaintext in memory during computation ❌

This third gap is the one that keeps security architects up at night. When your application runs on a cloud VM, the hypervisor, the cloud provider's management plane, and anyone with physical access to the hardware can, in principle, read your application's memory. For most workloads, the risk is acceptable. For healthcare data, financial models, cryptographic key material, and AI training data, it isn't.

**Confidential Computing** closes this gap using hardware-enforced **Trusted Execution Environments (TEEs)**.

![Data security and privacy](https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=900&auto=format&fit=crop&q=80)

*Photo by Franck on Unsplash*

---

## How Trusted Execution Environments Work

A TEE is an isolated execution environment enforced by the CPU. Key properties:

1. **Memory encryption**: The TEE's memory is encrypted with keys that only the CPU holds. Even if an attacker dumps the DRAM, they see ciphertext.
2. **Integrity measurement**: The CPU measures (hashes) the code loaded into the TEE before execution.
3. **Remote attestation**: External parties can cryptographically verify *what code is running* inside the TEE, before sending it sensitive data.

The attestation flow is the crucial piece:

```
Client                     TEE                      CPU Hardware
  |                          |                           |
  |-- "I want to send you    |                           |
  |   sensitive data,        |                           |
  |   prove what you are" -->|                           |
  |                          |-- Request attestation --->|
  |                          |<-- Signed measurement  ---|
  |                          |   (code hash, platform ID)|
  |<-- Attestation report ---|                           |
  |                          |                           |
  |-- (verify with vendor    |                           |
  |   certificate chain)     |                           |
  |                          |                           |
  |-- Encrypted data ------->|                           |
  |   (only decryptable by   |                           |
  |   the attested TEE)      |                           |
```

The client **verifies the attestation before trusting the TEE**. They're not trusting the cloud provider's word — they're verifying cryptographic proof from the CPU manufacturer.

---

## Hardware Technologies

### Intel TDX (Trust Domain Extensions)

TDX extends Intel's original SGX with VM-level granularity. An entire VM becomes a Trust Domain (TD):

- Full VM isolation from the hypervisor
- Memory encrypted with 128-bit keys per TD
- vCPU state and registers encrypted during context switches
- TDVMCALL interface for guest-host communication without leaking state
- Attestation via Intel's cloud-based attestation service

Major cloud providers offering TDX VMs: Azure (DCesv5), GCP (C3), and Alibaba Cloud.

### AMD SEV-SNP (Secure Encrypted Virtualization - Secure Nested Paging)

AMD's answer to TDX, with strong adoption particularly on AWS and Azure:

- Each VM gets a unique AES-128 encryption key managed by the AMD SP (Secure Processor)
- SEV-SNP adds memory integrity protection (prevents memory remapping attacks)
- **VCEK (Versioned Chip Endorsement Key)** for attestation — unique per chip, per firmware version
- Available on AWS EC2 instances (C6a, M6a, R6a families)

### AWS Nitro Enclaves

Nitro Enclaves take a different approach — rather than full VM confidentiality, you carve an **enclave** out of an existing EC2 instance:

```
┌─────────────────────────────────┐
│  EC2 Instance (parent)          │
│  - Can send/receive attestation │
│  - vsock-only communication     │
│  ┌───────────────────────────┐  │
│  │  Nitro Enclave            │  │
│  │  - No network             │  │
│  │  - No persistent storage  │  │
│  │  - Isolated memory        │  │
│  │  - Cryptographic attest.  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

The enclave can only communicate via vsock with its parent instance. No network, no disk. This is ideal for sensitive operations like private key management, credential decryption, or ML inference on private data.

---

## Practical Example: Private AI Inference

One of the most compelling current use cases: running LLM inference on sensitive data without the model operator seeing the data.

```python
# Inside the Nitro Enclave
import socket
import json
from cryptography.hazmat.primitives import serialization
from transformers import pipeline

# 1. Generate attestation document
enclave_attestation = get_attestation_document()  # Nitro SDK

# 2. Send public key embedded in attestation to parent
vsock = socket.socket(socket.AF_VSOCK, socket.SOCK_STREAM)
vsock.connect((3, 5005))  # CID 3 = parent
vsock.send(json.dumps({
    "type": "attestation",
    "document": enclave_attestation.hex()
}).encode())

# 3. Receive encrypted patient data from parent
encrypted_data = receive_encrypted_payload(vsock)

# 4. Decrypt (only possible inside TEE — key material never leaves)
patient_record = decrypt_with_enclave_key(encrypted_data)

# 5. Run inference — data never visible to AWS or operator
model = pipeline("text-classification", model="health-bert-private")
result = model(patient_record["notes"])

# 6. Return encrypted result
vsock.send(encrypt_result(result))
```

The key insight: the healthcare organization verifies the attestation (confirming exactly what model is running, that there's no logging, that their data will be destroyed after inference), then sends encrypted patient data. **The cloud provider never sees plaintext data.**

---

## Remote Attestation in Practice

Using Intel's DCAP (Data Center Attestation Primitives):

```bash
# Install Intel DCAP libraries
apt install libsgx-dcap-quote-verify-dev

# Generate a quote from inside a TDX TD
tdx-attest generate-quote --nonce $(openssl rand -hex 32)

# Verify a quote (can run anywhere)
tdx-attest verify-quote \
  --quote quote.bin \
  --policy policy.json \
  --expected-mrenclave <expected-hash>
```

For cloud-native use, attestation verification is available as a managed service:

- **Intel Trust Authority** — attestation-as-a-service for TDX and SGX
- **AWS Attestation** — built into Nitro Enclaves SDK
- **Microsoft Azure Attestation** — supports TDX, SEV-SNP, SGX
- **Confidential Computing Consortium** — open standards via IETF RATS working group

---

## Confidential Containers

**Confidential Containers (CoCo)** brings TEE protection to Kubernetes pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: confidential-ml-inference
  annotations:
    io.katacontainers.config.hypervisor.machine_type: "q35"
spec:
  runtimeClassName: kata-cc  # Confidential Containers runtime
  containers:
  - name: inference
    image: my-private-model:latest
    resources:
      limits:
        memory: "4Gi"
        cpu: "2"
    env:
    - name: MODEL_ENCRYPTION_KEY_URL
      value: "https://kms.example.com/v1/keys/model-key"
```

The `kata-cc` runtime class boots each pod inside a hardware TEE. The container image is pulled and decrypted inside the enclave. The cloud operator cannot inspect the model weights or the inference data.

---

## Challenges and Limitations

Confidential Computing is powerful but not a panacea:

**Side-channel attacks**: Memory access patterns, cache timing, and power consumption can leak information even from encrypted memory. Active research area; some attacks have been demonstrated against SGX.

**Trusted computing base**: The security guarantee is only as strong as the CPU vendor's firmware and the attestation service. You're trusting Intel/AMD hardware.

**Performance overhead**: Memory encryption adds latency. AMD SEV-SNP: ~1-3% overhead. Intel TDX: ~2-5%. For most applications, acceptable; for latency-sensitive trading systems, requires careful benchmarking.

**Software complexity**: Remote attestation is not trivial to implement correctly. Use existing frameworks (Gramine, Enarx, Occlum) rather than rolling your own.

---

## When to Use Confidential Computing

**Strong fit:**
- Healthcare data processing with strict HIPAA/GDPR requirements
- Financial institutions running models on client data
- Multi-party computation (two companies jointly analyzing data neither wants to share)
- Cryptographic key management (HSM alternative)
- AI model protection (keeping model weights confidential)

**Overkill:**
- Standard web applications with public data
- Development and testing environments
- When compliance requirements don't specifically mandate in-use data protection

---

## The Regulatory Tailwind

Confidential Computing adoption is accelerating due to regulation:

- **EU AI Act** mandates data minimization and security for high-risk AI systems
- **DORA (Digital Operational Resilience Act)** requires financial institutions to protect data throughout its lifecycle
- **HIPAA** and its evolving interpretations increasingly apply to cloud AI deployments

The Confidential Computing Consortium (CCC), hosted by the Linux Foundation, has standardized the terminology and is driving cross-vendor interoperability. What was a niche security technique in 2022 is becoming a checkbox on enterprise procurement questionnaires in 2026.

---

## Getting Started

```bash
# Check if your CPU supports TDX/SEV
grep -m1 -o 'tdx\|sev' /proc/cpuinfo

# AWS Nitro Enclave quickstart
aws ec2 run-instances \
  --instance-type m6a.xlarge \
  --enclave-options 'Enabled=true' \
  --image-id ami-xxxxx

# Build and run your first enclave
nitro-cli build-enclave \
  --docker-uri my-app:latest \
  --output-file my-app.eif

nitro-cli run-enclave \
  --cpu-count 2 \
  --memory 512 \
  --enclave-cid 16 \
  --eif-path my-app.eif
```

Confidential Computing is the missing piece of the cloud security puzzle. As hardware support becomes ubiquitous and tooling matures, treating data in use as a protected class — not an acceptable attack surface — will shift from best practice to baseline expectation.
