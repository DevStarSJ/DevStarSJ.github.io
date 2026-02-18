---
layout: post
title: "eBPF for Observability and Security: The Complete Guide for 2026"
subtitle: "Harness kernel-level superpowers for monitoring, tracing, and security without modifying your code"
date: 2026-02-18
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200"
catalog: true
tags:
  - eBPF
  - Observability
  - Security
  - Linux
  - Kubernetes
---

# eBPF for Observability and Security: The Complete Guide for 2026

eBPF (extended Berkeley Packet Filter) has revolutionized how we observe and secure systems. Running sandboxed programs in the Linux kernel, eBPF provides unprecedented visibility without kernel modifications or application changes.

![Cybersecurity Concept](https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800)
*Photo by [Adi Goldstein](https://unsplash.com/@adigold1) on Unsplash*

## What is eBPF?

eBPF lets you run custom programs in the Linux kernel in response to events—system calls, network packets, function calls, and more. It's like having programmable hooks throughout your entire system.

### Why eBPF Matters

- **No kernel modifications** - Programs are JIT-compiled and verified
- **No application changes** - Observe any process transparently
- **Minimal overhead** - Runs at near-native speed
- **Safe by design** - Verifier prevents crashes and infinite loops

## Core Concepts

### eBPF Program Types

```c
// Different attach points for different use cases
enum bpf_prog_type {
    BPF_PROG_TYPE_KPROBE,         // Kernel function tracing
    BPF_PROG_TYPE_TRACEPOINT,     // Static kernel tracepoints
    BPF_PROG_TYPE_XDP,            // Express Data Path (networking)
    BPF_PROG_TYPE_SOCKET_FILTER,  // Socket-level filtering
    BPF_PROG_TYPE_CGROUP_SKB,     // cgroup network control
    BPF_PROG_TYPE_LSM,            // Linux Security Module
    // ... many more
};
```

### eBPF Maps

Maps are key-value stores for sharing data between eBPF programs and userspace:

```c
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 10240);
    __type(key, u32);   // PID
    __type(value, u64); // Byte count
} process_bytes SEC(".maps");
```

## Building eBPF Programs

### Using libbpf and CO-RE

Compile Once, Run Everywhere—the modern approach:

```c
// process_monitor.bpf.c
#include <vmlinux.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>
#include <bpf/bpf_core_read.h>

struct event {
    u32 pid;
    u32 uid;
    char comm[16];
    char filename[256];
};

struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 256 * 1024);
} events SEC(".maps");

SEC("tracepoint/syscalls/sys_enter_openat")
int trace_openat(struct trace_event_raw_sys_enter *ctx)
{
    struct event *e;
    
    e = bpf_ringbuf_reserve(&events, sizeof(*e), 0);
    if (!e)
        return 0;
    
    e->pid = bpf_get_current_pid_tgid() >> 32;
    e->uid = bpf_get_current_uid_gid() & 0xFFFFFFFF;
    bpf_get_current_comm(&e->comm, sizeof(e->comm));
    bpf_probe_read_user_str(&e->filename, sizeof(e->filename), 
                            (const char *)ctx->args[1]);
    
    bpf_ringbuf_submit(e, 0);
    return 0;
}

char LICENSE[] SEC("license") = "GPL";
```

### Python with bcc

Rapid prototyping with Python:

```python
from bcc import BPF

program = """
#include <uapi/linux/ptrace.h>

BPF_HASH(syscall_count, u32, u64);

TRACEPOINT_PROBE(raw_syscalls, sys_enter) {
    u32 pid = bpf_get_current_pid_tgid() >> 32;
    u64 *count = syscall_count.lookup(&pid);
    
    if (count) {
        (*count)++;
    } else {
        u64 one = 1;
        syscall_count.update(&pid, &one);
    }
    
    return 0;
}
"""

b = BPF(text=program)

# Print syscall counts every 5 seconds
while True:
    time.sleep(5)
    for k, v in b["syscall_count"].items():
        print(f"PID {k.value}: {v.value} syscalls")
    b["syscall_count"].clear()
```

![Data Center](https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800)
*Photo by [NASA](https://unsplash.com/@nasa) on Unsplash*

## Observability Use Cases

### Distributed Tracing Without Code Changes

Using Cilium for automatic request tracing:

```yaml
# cilium-config.yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumEnvoyConfig
metadata:
  name: distributed-tracing
spec:
  services:
    - name: "*"
      namespace: default
  backendServices:
    - name: "*"
      namespace: default
  resources:
    - "@type": type.googleapis.com/envoy.config.trace.v3.OpenTelemetryConfig
      grpc_service:
        envoy_grpc:
          cluster_name: otel-collector
      service_name: "cilium-envoy"
```

### Custom Metrics Collection

```c
// Collect HTTP latency at the kernel level
struct http_event {
    u32 pid;
    u64 latency_ns;
    u16 status_code;
    char path[64];
};

struct {
    __uint(type, BPF_MAP_TYPE_HISTOGRAM);
    __uint(max_entries, 64);
    __type(key, u64);  // Latency bucket
    __type(value, u64); // Count
} http_latency_hist SEC(".maps");

SEC("kprobe/tcp_sendmsg")
int trace_http_response(struct pt_regs *ctx)
{
    // Parse HTTP response, calculate latency
    u64 latency = calculate_latency();
    
    // Update histogram
    u64 bucket = latency / 1000000; // Convert to ms
    if (bucket > 63) bucket = 63;
    
    u64 *count = bpf_map_lookup_elem(&http_latency_hist, &bucket);
    if (count) {
        __sync_fetch_and_add(count, 1);
    }
    
    return 0;
}
```

### Continuous Profiling

```python
# CPU profiling with stack traces
from bcc import BPF

profile_program = """
#include <uapi/linux/ptrace.h>

BPF_STACK_TRACE(stack_traces, 16384);
BPF_HASH(counts, int, u64);

int do_perf_event(struct bpf_perf_event_data *ctx) {
    u32 pid = bpf_get_current_pid_tgid() >> 32;
    
    // Filter to specific process if needed
    if (TARGET_PID && pid != TARGET_PID)
        return 0;
    
    int stack_id = stack_traces.get_stackid(ctx, BPF_F_USER_STACK);
    if (stack_id >= 0) {
        u64 *count = counts.lookup(&stack_id);
        if (count) {
            (*count)++;
        } else {
            u64 one = 1;
            counts.update(&stack_id, &one);
        }
    }
    return 0;
}
"""

b = BPF(text=profile_program.replace("TARGET_PID", "0"))
b.attach_perf_event(
    ev_type=PerfType.SOFTWARE,
    ev_config=PerfSWConfig.CPU_CLOCK,
    fn_name="do_perf_event",
    sample_freq=99
)
```

## Security Use Cases

### Runtime Security with Tetragon

```yaml
# tetragon-policy.yaml
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: detect-sensitive-file-access
spec:
  kprobes:
    - call: "security_file_open"
      syscall: false
      args:
        - index: 0
          type: "file"
      selectors:
        - matchArgs:
            - index: 0
              operator: "Prefix"
              values:
                - "/etc/shadow"
                - "/etc/passwd"
                - "/root/.ssh/"
          matchActions:
            - action: Sigkill  # Kill the process
            - action: Post     # Also send event
```

### Network Policy Enforcement

```c
// XDP program for DDoS mitigation
SEC("xdp")
int xdp_firewall(struct xdp_md *ctx)
{
    void *data = (void *)(long)ctx->data;
    void *data_end = (void *)(long)ctx->data_end;
    
    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end)
        return XDP_PASS;
    
    if (eth->h_proto != htons(ETH_P_IP))
        return XDP_PASS;
    
    struct iphdr *ip = (void *)(eth + 1);
    if ((void *)(ip + 1) > data_end)
        return XDP_PASS;
    
    // Check rate limit per source IP
    u32 src_ip = ip->saddr;
    u64 *count = bpf_map_lookup_elem(&ip_rate_limit, &src_ip);
    
    if (count && *count > RATE_LIMIT_THRESHOLD) {
        return XDP_DROP;  // Drop at earliest possible point
    }
    
    // Update counter
    u64 one = 1;
    bpf_map_update_elem(&ip_rate_limit, &src_ip, &one, BPF_ANY);
    
    return XDP_PASS;
}
```

### Container Escape Detection

```yaml
# Detect container escape attempts
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: container-escape-detection
spec:
  kprobes:
    - call: "__x64_sys_setns"
      syscall: true
      selectors:
        - matchNamespaces:
            - namespace: Pid
              operator: NotIn
              values:
                - "host_pid_ns"
          matchActions:
            - action: Post
              rateLimit: "1/m"
    - call: "commit_creds"
      syscall: false
      selectors:
        - matchCapabilityChanges:
            - type: Effective
              operator: In
              values:
                - "CAP_SYS_ADMIN"
          matchActions:
            - action: Post
```

## Production Tools

### Cilium

Service mesh and network security:

```bash
# Install Cilium with Hubble observability
cilium install --set hubble.enabled=true \
               --set hubble.ui.enabled=true \
               --set hubble.relay.enabled=true

# View real-time network flows
hubble observe --namespace default
```

### Pixie

Instant Kubernetes observability:

```bash
# Deploy Pixie
px deploy

# Query HTTP traffic
px run px/http_data -- --start_time=-5m

# Custom PxL script
px run -f - <<EOF
import px

df = px.DataFrame('http_events', start_time='-5m')
df = df.groupby(['service', 'req_path']).agg(
    count=('latency', px.count),
    p99_latency=('latency', px.quantiles, 0.99)
)
px.display(df)
EOF
```

### Falco with eBPF

Runtime security monitoring:

```yaml
# falco-rules.yaml
- rule: Shell in Container
  desc: Detect shell execution in container
  condition: >
    spawned_process and container and
    proc.name in (bash, sh, zsh, dash)
  output: >
    Shell spawned in container 
    (user=%user.name container=%container.name shell=%proc.name)
  priority: WARNING
```

## Best Practices

1. **Start with existing tools** - Cilium, Falco, Pixie before custom eBPF
2. **Use CO-RE** - Ensures portability across kernel versions
3. **Mind the verifier** - Keep programs simple, bounded loops only
4. **Test on staging** - eBPF bugs can impact system stability
5. **Monitor eBPF overhead** - Even efficient code has cost at scale

## Conclusion

eBPF has transformed Linux observability and security. Whether you're debugging performance issues, detecting intrusions, or building service meshes, eBPF provides kernel-level visibility without the traditional trade-offs.

The ecosystem is maturing rapidly—tools like Cilium, Pixie, and Tetragon make eBPF accessible without writing kernel code yourself.

---

*Have you adopted eBPF in your infrastructure? Share your use cases and lessons learned!*
