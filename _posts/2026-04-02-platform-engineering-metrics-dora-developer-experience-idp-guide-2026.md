---
layout: post
title: "Platform Engineering Metrics: What to Measure When Your IDP Is Your Product"
subtitle: "DORA metrics, developer experience scores, and the KPIs that actually tell you if your internal platform is working"
date: 2026-04-02 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop"
catalog: true
tags:
  - Platform Engineering
  - DevOps
  - DORA Metrics
  - Developer Experience
  - Internal Developer Platform
  - SRE
  - Observability
---

# Platform Engineering Metrics: What to Measure When Your IDP Is Your Product

You've built an internal developer platform. Engineers can deploy in minutes instead of days. Onboarding takes hours instead of weeks. But how do you *know* it's working? How do you justify the team's existence to leadership? How do you decide what to build next?

The answer is metrics — but not just any metrics. Platform engineering has its own measurement challenges, and cargo-culting SaaS product metrics onto an internal platform will lead you astray.

![Dashboard with metrics and charts](https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1000&auto=format&fit=crop)
*Photo by [Carlos Muza](https://unsplash.com/@kmuza) on Unsplash*

---

## The Measurement Problem

Platform engineering faces a unique challenge: **your users are captive**. Unlike a consumer product, developers can't switch to a competitor. This means:

1. **Satisfaction surveys are biased** — people complain loudly or adapt quietly
2. **Usage metrics can be misleading** — high usage might mean "no choice" not "love it"
3. **The real value is in what you enable** — deploy frequency, incident reduction, developer time saved

The best platform metrics measure *outcomes*, not outputs.

---

## The DORA Four: Still the Gold Standard

The DevOps Research and Assessment (DORA) metrics remain the most validated framework for measuring software delivery performance:

| Metric | Elite | High | Medium | Low |
|--------|-------|------|--------|-----|
| Deployment Frequency | On-demand (multiple/day) | Daily to weekly | Weekly to monthly | < monthly |
| Lead Time for Changes | < 1 hour | 1 day to 1 week | 1 week to 1 month | > 6 months |
| Change Failure Rate | 0-5% | 5-10% | 10-15% | > 15% |
| Time to Restore Service | < 1 hour | < 1 day | 1 day to 1 week | > 6 months |

### Tracking DORA Metrics Programmatically

```python
# metrics/dora_collector.py
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional
import httpx

@dataclass
class DeploymentEvent:
    service: str
    deployed_at: datetime
    commit_sha: str
    pr_merged_at: Optional[datetime]
    is_hotfix: bool = False

@dataclass
class IncidentEvent:
    service: str
    started_at: datetime
    resolved_at: Optional[datetime]
    caused_by_deployment: Optional[str]  # commit_sha

class DORAMetricsCollector:
    def __init__(self, window_days: int = 30):
        self.window_days = window_days
        self.window_start = datetime.utcnow() - timedelta(days=window_days)
    
    def deployment_frequency(
        self, 
        deployments: list[DeploymentEvent]
    ) -> dict[str, float]:
        """Calculate deployments per day per service."""
        recent = [d for d in deployments if d.deployed_at >= self.window_start]
        
        by_service: dict[str, list[DeploymentEvent]] = {}
        for d in recent:
            by_service.setdefault(d.service, []).append(d)
        
        return {
            service: len(deploys) / self.window_days
            for service, deploys in by_service.items()
        }
    
    def lead_time_for_changes(
        self,
        deployments: list[DeploymentEvent]
    ) -> dict[str, timedelta]:
        """Median time from PR merge to production deployment."""
        with_pr = [
            d for d in deployments 
            if d.pr_merged_at and d.deployed_at >= self.window_start
        ]
        
        by_service: dict[str, list[timedelta]] = {}
        for d in with_pr:
            lead_time = d.deployed_at - d.pr_merged_at
            by_service.setdefault(d.service, []).append(lead_time)
        
        return {
            service: sorted(times)[len(times) // 2]  # Median
            for service, times in by_service.items()
        }
    
    def change_failure_rate(
        self,
        deployments: list[DeploymentEvent],
        incidents: list[IncidentEvent]
    ) -> float:
        """Percentage of deployments that caused incidents."""
        recent_deploys = [d for d in deployments if d.deployed_at >= self.window_start]
        failed = [
            i for i in incidents 
            if i.caused_by_deployment and i.started_at >= self.window_start
        ]
        
        if not recent_deploys:
            return 0.0
        
        return len(failed) / len(recent_deploys)
    
    def time_to_restore(
        self,
        incidents: list[IncidentEvent]
    ) -> timedelta:
        """Median time from incident start to resolution."""
        resolved = [
            i for i in incidents
            if i.resolved_at and i.started_at >= self.window_start
        ]
        
        if not resolved:
            return timedelta(0)
        
        times = sorted([i.resolved_at - i.started_at for i in resolved])
        return times[len(times) // 2]
```

---

## Platform-Specific Metrics

DORA measures your platform's *impact*. You also need metrics that measure the platform *itself*.

### 1. Developer Time Saved (DTS)

The most impactful metric, and the hardest to measure. Estimate it through:

```python
# Time Saved = (Old Process Time - New Process Time) × Usage Count
# Example calculation

class TimeSavedCalculator:
    # Baseline times (measured from developer surveys or ticket data)
    BASELINES = {
        "provision_new_service": timedelta(days=3),      # Was: 3 days
        "setup_monitoring": timedelta(hours=8),           # Was: 8 hours
        "configure_ci_pipeline": timedelta(hours=4),      # Was: 4 hours
        "onboard_new_developer": timedelta(days=5),       # Was: 5 days
        "promote_to_staging": timedelta(hours=2),         # Was: 2 hours
    }
    
    PLATFORM_TIMES = {
        "provision_new_service": timedelta(minutes=10),   # Now: 10 min
        "setup_monitoring": timedelta(minutes=5),          # Now: 5 min (auto)
        "configure_ci_pipeline": timedelta(minutes=15),   # Now: 15 min
        "onboard_new_developer": timedelta(hours=4),      # Now: 4 hours
        "promote_to_staging": timedelta(minutes=2),       # Now: 2 min
    }
    
    def calculate_monthly_savings(
        self, 
        usage_counts: dict[str, int],
        hourly_rate: float = 150.0
    ) -> dict:
        total_hours_saved = 0.0
        breakdown = {}
        
        for action, count in usage_counts.items():
            baseline = self.BASELINES.get(action, timedelta(0))
            platform_time = self.PLATFORM_TIMES.get(action, timedelta(0))
            saved_per_use = baseline - platform_time
            total_saved = saved_per_use * count
            hours_saved = total_saved.total_seconds() / 3600
            
            breakdown[action] = {
                "count": count,
                "hours_saved_per_use": saved_per_use.total_seconds() / 3600,
                "total_hours_saved": hours_saved,
                "cost_saved": hours_saved * hourly_rate
            }
            total_hours_saved += hours_saved
        
        return {
            "breakdown": breakdown,
            "total_hours_saved": total_hours_saved,
            "total_cost_saved": total_hours_saved * hourly_rate
        }
```

### 2. Platform Adoption Rate

```sql
-- Track which teams use which platform capabilities
SELECT 
    team_name,
    COUNT(DISTINCT capability_used) as capabilities_adopted,
    COUNT(DISTINCT capability_used)::float / total_capabilities as adoption_rate,
    array_agg(DISTINCT capability_used ORDER BY capability_used) as used_capabilities
FROM platform_usage_events pue
JOIN teams t ON pue.team_id = t.id
CROSS JOIN (SELECT COUNT(*) as total_capabilities FROM platform_capabilities) tc
WHERE pue.event_time >= NOW() - INTERVAL '30 days'
GROUP BY team_name, total_capabilities
ORDER BY adoption_rate DESC;
```

### 3. Paved Path vs. Off-Road Ratio

How often are engineers using the platform's golden path vs. rolling their own?

```python
# Classify deployments by methodology
def classify_deployment_method(deployment: dict) -> str:
    if deployment.get("via_platform_cli"):
        return "golden_path"
    elif deployment.get("via_custom_script"):
        return "off_road"
    elif deployment.get("via_manual_console"):
        return "manual"
    return "unknown"

def paved_path_ratio(deployments: list[dict]) -> float:
    total = len(deployments)
    golden = sum(1 for d in deployments if classify_deployment_method(d) == "golden_path")
    return golden / total if total > 0 else 0.0
```

**Target:** > 80% of deployments via the golden path. Below 60% means your platform has gaps that are forcing workarounds.

---

## Developer Experience (DX) Score

Quantitative metrics tell you *what* is happening. DX scores tell you *how engineers feel* about it.

### The Standardized Developer Survey

Run quarterly, keep it short (< 5 minutes):

```python
DX_SURVEY_QUESTIONS = [
    {
        "id": "ease_of_deployment",
        "text": "How easy is it to deploy your service to production?",
        "scale": "1-7 Likert (Very Difficult → Very Easy)"
    },
    {
        "id": "confidence_in_system",
        "text": "How confident are you that your production deployments will succeed?",
        "scale": "1-7 Likert"
    },
    {
        "id": "feedback_speed",
        "text": "How quickly do you get feedback when something goes wrong in production?",
        "scale": "1-7 Likert (Very Slow → Very Fast)"
    },
    {
        "id": "platform_nps",
        "text": "How likely are you to recommend our internal developer platform to a new team?",
        "scale": "0-10 NPS"
    },
    {
        "id": "biggest_pain",
        "text": "What is the single biggest friction point in your development workflow?",
        "scale": "Open text"
    }
]

def calculate_dx_score(responses: list[dict]) -> dict:
    """
    Composite DX score: 0-100
    Weighted combination of quantitative questions
    """
    weights = {
        "ease_of_deployment": 0.30,
        "confidence_in_system": 0.25,
        "feedback_speed": 0.20,
        "platform_nps": 0.25
    }
    
    averages = {}
    for metric, weight in weights.items():
        values = [r[metric] for r in responses if metric in r]
        if values:
            if metric == "platform_nps":
                # NPS: normalize 0-10 to 0-100
                averages[metric] = sum(values) / len(values) * 10
            else:
                # Likert 1-7: normalize to 0-100
                averages[metric] = (sum(values) / len(values) - 1) / 6 * 100
    
    composite = sum(averages[m] * w for m, w in weights.items() if m in averages)
    
    return {
        "composite_score": round(composite, 1),
        "breakdown": averages,
        "respondents": len(responses)
    }
```

---

## Building a Metrics Dashboard

Bring it all together in a single platform health dashboard:

```typescript
// platform-metrics/src/dashboard.ts
interface PlatformHealthSnapshot {
  timestamp: Date;
  
  // DORA Metrics (aggregate across all services)
  dora: {
    deploymentFrequency: number;      // deployments/day
    leadTimeHours: number;            // median, P50
    changeFailureRate: number;        // 0-1
    timeToRestoreHours: number;       // median, P50
  };
  
  // Platform-specific
  platform: {
    adoptionRate: number;             // 0-1
    pavedPathRatio: number;           // 0-1
    monthlyHoursSaved: number;
    monthlyCostSaved: number;
  };
  
  // Developer Experience
  dx: {
    compositeScore: number;           // 0-100
    nps: number;                      // -100 to 100
    lastSurveyDate: Date;
    respondentCount: number;
  };
  
  // Platform SLA
  sla: {
    uptimePercent: number;
    p99LatencyMs: number;
    incidentsThisMonth: number;
  };
}

function classifyDORAPerformance(dora: PlatformHealthSnapshot['dora']): string {
  const scores = {
    frequency: dora.deploymentFrequency >= 1 ? 4 : 
                dora.deploymentFrequency >= 1/7 ? 3 :
                dora.deploymentFrequency >= 1/30 ? 2 : 1,
    leadTime: dora.leadTimeHours <= 1 ? 4 :
              dora.leadTimeHours <= 168 ? 3 :
              dora.leadTimeHours <= 720 ? 2 : 1,
    failure: dora.changeFailureRate <= 0.05 ? 4 :
             dora.changeFailureRate <= 0.10 ? 3 :
             dora.changeFailureRate <= 0.15 ? 2 : 1,
    restore: dora.timeToRestoreHours <= 1 ? 4 :
             dora.timeToRestoreHours <= 24 ? 3 :
             dora.timeToRestoreHours <= 168 ? 2 : 1,
  };
  
  const avg = Object.values(scores).reduce((a, b) => a + b) / 4;
  return avg >= 3.5 ? 'Elite' : avg >= 2.5 ? 'High' : avg >= 1.5 ? 'Medium' : 'Low';
}
```

---

## The Metric Anti-Patterns to Avoid

**❌ Measuring ticket volume**
Fewer support tickets might mean engineers gave up, not that your platform is better.

**❌ Measuring lines of code or PRs merged by platform team**
Output metrics for the platform team, not outcome metrics for its users.

**❌ Measuring uptime only**
A platform can be 99.99% available and still be useless if it's slow, confusing, or doesn't cover developers' actual needs.

**❌ Surveying only power users**
The engineers who attend your platform team's office hours are your fans. Survey the quiet middle — they're the ones you're losing.

---

## The North Star: Developer Productivity Index

Combine your metrics into a single number for executive communication:

```python
def developer_productivity_index(snapshot: dict) -> float:
    """
    Composite score 0-100 for executive dashboards.
    Weighted combination of key signals.
    """
    # Normalize each dimension to 0-1
    dora_score = normalize_dora(snapshot['dora'])           # 0-1
    adoption = snapshot['platform']['pavedPathRatio']        # 0-1
    dx = snapshot['dx']['compositeScore'] / 100             # 0-1
    sla = snapshot['sla']['uptimePercent'] / 100            # 0-1
    
    weights = {
        'dora': 0.40,       # Delivery performance matters most
        'adoption': 0.20,   # Platform actually being used
        'dx': 0.30,         # How engineers feel
        'sla': 0.10,        # Platform reliability
    }
    
    dpi = (
        dora_score * weights['dora'] +
        adoption * weights['adoption'] +
        dx * weights['dx'] +
        sla * weights['sla']
    ) * 100
    
    return round(dpi, 1)
```

---

## Key Takeaways

1. **Lead with outcomes** — DORA metrics show your platform's impact on delivery
2. **Measure the experience** — Quarterly DX surveys catch what usage data misses
3. **Track the paved path** — High off-road ratio means your platform has gaps
4. **Quantify time saved** — Turn hours saved into dollar value for leadership
5. **Avoid vanity metrics** — Tickets closed, features shipped, and uptime alone don't tell the full story

A good platform team treats its internal platform like a product. And every good product team is ruthlessly metric-driven.

---

## Further Reading

- [DORA State of DevOps Report 2025](https://dora.dev)
- [Team Topologies by Matthew Skelton & Manuel Pais](https://teamtopologies.com)
- [Developer Experience at Scale — Backstage Blog](https://backstage.io/blog)
- [DX Core 4: A New Framework for Developer Experience](https://getdx.com/research/dx-core-4)
