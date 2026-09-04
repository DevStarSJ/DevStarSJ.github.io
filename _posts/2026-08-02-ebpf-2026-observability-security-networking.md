---
layout: post
title: "eBPF in 2026: Observability, Security, and Networking Without Kernel Modules"
subtitle: "From theory to production: how eBPF is replacing strace, iptables, and traditional APM agents"
date: 2026-08-02 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80"
header-mask: 0.4
catalog: true
tags:
  - eBPF
  - Linux
  - Observability
  - Security
  - Kubernetes
  - DevOps
---

## Introduction

eBPF (extended Berkeley Packet Filter) has quietly become one of the most important technologies in modern infrastructure. What started as a packet-filtering mechanism has evolved into a programmable kernel-level sandbox that powers observability tools like Cilium and Falco, replaces iptables in large-scale Kubernetes clusters, and enables zero-overhead profiling of production systems.

In 2026, if you're running anything at scale on Linux, eBPF is shaping your infrastructure — whether you know it or not. This post explains why, and how to use it intentionally.

![Linux kernel and networking infrastructure](https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=900&q=80)
*Photo by [Jordan Harrison](https://unsplash.com/@jordanharrison) on Unsplash*

---

## 1. What Makes eBPF Special

Traditional kernel observability required either:
1. **Kernel modules** — powerful but dangerous; a bug crashes the system
2. **Userspace tracing** (strace, ltrace) — safe but adds 50–100× overhead
3. **Pre-compiled kernel instrumentation** — fixed, not extensible

eBPF takes a different path: you write a small program that the kernel **verifies at load time** (no infinite loops, no out-of-bounds memory access, bounded stack), then JIT-compiles to native instructions and attaches to a kernel hook point.

```
User Space                    Kernel Space
─────────────                ─────────────────────────────────
                             ┌──────────────────────────────┐
eBPF C code                  │  eBPF Verifier               │
     │                       │  - No loops (bounded)        │
     ▼                       │  - No null dereferences      │
  clang/llvm  ──────────────▶│  - Stack ≤ 512 bytes         │
     │        eBPF bytecode  │  - Checks all paths          │
     │                       └──────────────────────────────┘
     │                                    │
     │                                    ▼
     │                       ┌──────────────────────────────┐
     │                       │  JIT Compiler                │
     │                       │  (x86_64 / ARM64 / ...)      │
     │                       └──────────────────────────────┘
     │                                    │
     │                                    ▼
     │                       ┌──────────────────────────────┐
     └──── bpf() syscall ───▶│  Hook Points:                │
                             │  - kprobe/kretprobe          │
                             │  - tracepoints               │
                             │  - XDP (network driver)      │
                             │  - TC ingress/egress         │
                             │  - LSM hooks (security)      │
                             └──────────────────────────────┘
```

The result: **kernel-level visibility with near-zero overhead**, verified safety, and the ability to deploy new instrumentation without rebooting.

---

## 2. Use Case 1 — Observability with bpftrace and BCC

### Zero-config latency histograms

```bash
# Histogram of read() syscall latency for all processes — no code changes needed
sudo bpftrace -e '
tracepoint:syscalls:sys_enter_read { @start[tid] = nsecs; }
tracepoint:syscalls:sys_exit_read  /@start[tid]/
{
  @latency_us = hist((nsecs - @start[tid]) / 1000);
  delete(@start[tid]);
}
'
```

Output:
```
@latency_us:
[0]             1234 |@@@@@@@@@@                                           |
[1]             4567 |@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@                |
[2, 4)          2345 |@@@@@@@@@@@@@@@@@@@@                                 |
[4, 8)           890 |@@@@@@@                                              |
[8, 16)          234 |@@                                                   |
[256, 512)         3 |                                                     |
[512, 1K)          1 |                                                     |
```

### Continuous profiling with Parca / Pyroscope

Modern continuous profiling agents (Parca, Pyroscope's eBPF mode, Grafana Beyla) use eBPF to generate CPU flame graphs at **1% overhead** — imperceptible in production.

```yaml
# Grafana Beyla DaemonSet — auto-instruments Go, Java, Python, Node.js
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: beyla
  namespace: monitoring
spec:
  selector:
    matchLabels: { app: beyla }
  template:
    metadata:
      labels: { app: beyla }
    spec:
      hostPID: true
      containers:
      - name: beyla
        image: grafana/beyla:1.8
        securityContext:
          privileged: true
        env:
        - name: BEYLA_OPEN_PORT
          value: "8080,9090"           # auto-detect services on these ports
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "http://otel-collector:4317"
        volumeMounts:
        - name: kernel-debug
          mountPath: /sys/kernel/debug
      volumes:
      - name: kernel-debug
        hostPath: { path: /sys/kernel/debug }
```

With this DaemonSet, every HTTP request across your cluster is automatically traced — **without touching application code**.

---

## 3. Use Case 2 — Kubernetes Networking with Cilium

Cilium replaces `kube-proxy` and iptables with eBPF programs attached at the XDP (eXpress Data Path) layer. The gains are significant:

| Metric | iptables + kube-proxy | Cilium eBPF | Improvement |
|---|---|---|---|
| East-west latency (p99) | 1.8ms | 0.4ms | 77% lower |
| Max services | ~10,000 | 100,000+ | 10× |
| CPU at 100k RPS | 12% | 3% | 75% reduction |
| Packet processing overhead | Per-rule O(n) | O(1) hash lookup | Linear → constant |

### Installing Cilium as the CNI

```bash
helm repo add cilium https://helm.cilium.io/
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=<API_SERVER_IP> \
  --set k8sServicePort=6443 \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true
```

### Network policies with identity-based security

Cilium's `CiliumNetworkPolicy` uses security identities (derived from pod labels) rather than IP addresses. This eliminates the race condition where a newly scheduled pod inherits an old pod's IP and accidentally gains access:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: payment-service-policy
spec:
  endpointSelector:
    matchLabels:
      app: payment-service
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: checkout-service
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
      rules:
        http:
        - method: POST
          path: /api/v1/charge    # HTTP-layer policy — only this endpoint!
  egress:
  - toEndpoints:
    - matchLabels:
        app: postgres
    toPorts:
    - ports:
      - port: "5432"
        protocol: TCP
```

This policy blocks everything except `POST /api/v1/charge` from the checkout service — at the kernel level, with no service mesh proxy required.

---

## 4. Use Case 3 — Runtime Security with Falco

Falco uses eBPF to monitor every syscall across all containers in your cluster, detecting anomalous behavior:

```yaml
# Custom Falco rule: detect crypto mining behavior
- rule: Crypto Miner Detected
  desc: Process exhibits behavior consistent with cryptocurrency mining
  condition: >
    spawned_process and
    (proc.name in (xmrig, minerd, cpuminer, ethminer) or
     (proc.cmdline contains "stratum+tcp://" or
      proc.cmdline contains "nicehash" or
      proc.cmdline contains "--algo"))
  output: >
    Crypto miner process spawned
    (user=%user.name container=%container.id image=%container.image
     cmd=%proc.cmdline pid=%proc.pid)
  priority: CRITICAL
  tags: [security, cryptomining]

- rule: Suspicious Data Exfiltration
  desc: Large data transfer to external IP from a database container
  condition: >
    outbound and
    container.label.app in (postgres, mysql, mongodb) and
    fd.net.bytes_out > 10000000 and  # 10MB
    not fd.raddr in (internal_subnets)
  output: >
    Large outbound transfer from database container
    (container=%container.id dest=%fd.raddr bytes=%fd.net.bytes_out)
  priority: WARNING
```

---

## 5. Writing Your First eBPF Program

For those who want to go deeper, here's a minimal eBPF program in C that counts function calls:

```c
// count_syscalls.bpf.c
#include <linux/bpf.h>
#include <bpf/bpf_helpers.h>

// BPF map: key = syscall number, value = call count
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __type(key, __u32);
    __type(value, __u64);
    __uint(max_entries, 512);
} syscall_counts SEC(".maps");

SEC("tracepoint/raw_syscalls/sys_enter")
int count_syscall(struct trace_event_raw_sys_enter *ctx) {
    __u32 syscall_id = ctx->id;
    __u64 *count = bpf_map_lookup_elem(&syscall_counts, &syscall_id);

    if (count) {
        __sync_fetch_and_add(count, 1);
    } else {
        __u64 init = 1;
        bpf_map_update_elem(&syscall_counts, &syscall_id, &init, BPF_ANY);
    }
    return 0;
}

char LICENSE[] SEC("license") = "GPL";
```

```python
# Userspace loader using libbpf-python
from bpf import BPF

b = BPF(src_file="count_syscalls.bpf.c")
b.attach_tracepoint(tp="raw_syscalls:sys_enter", fn_name="count_syscall")

while True:
    time.sleep(5)
    for k, v in sorted(b["syscall_counts"].items(), key=lambda i: -i[1].value)[:10]:
        print(f"syscall {k.value}: {v.value} calls")
    b["syscall_counts"].clear()
```

---

## 6. The Evolving Landscape

The eBPF ecosystem in 2026:

- **Tetragon** (Cilium project) — process-level security enforcement with eBPF kill signals
- **Pixie** — Kubernetes debugging with automatic protocol parsing (HTTP, gRPC, DNS)
- **KubeArmor** — LSM-based container policy enforcement
- **Beyla** (Grafana) — zero-code OpenTelemetry instrumentation
- **bpfd** — Linux daemon for managing eBPF program lifecycle across teams

The kernel is no longer a black box. With eBPF, you have unprecedented visibility and control — safely, efficiently, and without modifying a single line of application code.

---

## Conclusion

eBPF has crossed the chasm from "bleeding edge research" to "table stakes infrastructure." If your observability still relies on APM agents that you install in each container, or your Kubernetes networking still uses iptables, you're leaving significant performance and security gains on the table.

Start with Cilium for networking, Falco for security, and Beyla for auto-instrumentation. Once you see what eBPF exposes at zero cost, you won't go back.

---

*Questions about eBPF tooling? Leave a comment or find me on LinkedIn.*
