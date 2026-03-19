---
layout: post
title: "Building Production-Ready Event-Driven Systems with Apache Kafka and Flink in 2026"
subtitle: "Stream processing patterns, exactly-once semantics, and lessons learned from running Kafka at scale"
date: 2026-03-19 12:00:00
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1600&q=80"
catalog: true
tags:
  - Kafka
  - Flink
  - Streaming
  - Event-Driven
  - Data Engineering
---

# Building Production-Ready Event-Driven Systems with Apache Kafka and Flink in 2026

Event-driven architecture has matured significantly over the past few years. What used to be considered "advanced infrastructure" for only the largest tech companies is now accessible to teams of any size. Kafka 3.8 and Flink 2.0 represent the current state of the art, and together they form a streaming stack that can handle everything from real-time fraud detection to ML feature computation.

This post covers the practical patterns, gotchas, and architectural decisions I've encountered running these systems in production.

![Data streaming visualization](https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=1200&q=80)
*Photo by Chris Liverani on Unsplash*

---

## The Architecture: Kafka + Flink in 2026

The modern streaming stack looks like this:

```
Producers (Apps, DBs via CDC, IoT)
    ↓
Kafka (KRaft mode, Tiered Storage)
    ↓
Flink (Stateful Stream Processing)
    ↓
Sinks (OLAP DBs, Feature Stores, APIs, Kafka again)
```

Kafka stores and distributes events. Flink transforms, enriches, aggregates, and routes them. The separation is clean: Kafka is your durable, replayable event log; Flink is your computation engine.

---

## Kafka 3.8: KRaft is Now the Only Option

ZooKeeper is gone. If you're still running it, you're on borrowed time. KRaft (Kafka Raft) is now the only supported metadata management mode, and it's significantly simpler to operate.

### KRaft Cluster Setup

```yaml
# docker-compose.yml for local KRaft cluster
version: '3.8'
services:
  kafka-1:
    image: apache/kafka:3.8.0
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: 'broker,controller'
      KAFKA_CONTROLLER_QUORUM_VOTERS: '1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093'
      KAFKA_LISTENERS: 'PLAINTEXT://:9092,CONTROLLER://:9093'
      KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://kafka-1:9092'
      KAFKA_CONTROLLER_LISTENER_NAMES: 'CONTROLLER'
      KAFKA_LOG_DIRS: '/tmp/kraft-combined-logs'
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk'
    volumes:
      - kafka1-data:/tmp/kraft-combined-logs

  kafka-2:
    image: apache/kafka:3.8.0
    environment:
      KAFKA_NODE_ID: 2
      KAFKA_PROCESS_ROLES: 'broker,controller'
      KAFKA_CONTROLLER_QUORUM_VOTERS: '1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093'
      KAFKA_LISTENERS: 'PLAINTEXT://:9092,CONTROLLER://:9093'
      KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://kafka-2:9092'
      KAFKA_CONTROLLER_LISTENER_NAMES: 'CONTROLLER'
      KAFKA_LOG_DIRS: '/tmp/kraft-combined-logs'
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk'

volumes:
  kafka1-data:
  kafka2-data:
  kafka3-data:
```

### Tiered Storage

Kafka 3.8's tiered storage is production-ready and a game-changer for retention economics:

```properties
# broker configuration for tiered storage
remote.log.storage.system.enable=true
remote.log.manager.task.interval.ms=30000

# Use S3 as remote storage
remote.log.metadata.manager.class.name=org.apache.kafka.server.log.remote.storage.RemoteLogMetadataManager
remote.log.metadata.manager.listener.name=PLAINTEXT

# Topic-level: keep 7 days local, 90 days in S3
log.retention.ms=604800000           # 7 days local
remote.log.storage.enable=true
remote.log.copy.interval.ms=60000
```

```bash
# Create a topic with tiered storage
kafka-topics.sh --create \
  --topic user-events \
  --partitions 24 \
  --replication-factor 3 \
  --config remote.storage.enable=true \
  --config local.retention.ms=604800000 \
  --config retention.ms=7776000000    # 90 days total
```

This lets you retain 90 days of events at a fraction of the cost — local brokers only hold the recent hot data.

---

## Kafka Producer Best Practices

### Idempotent Producers (Always Enable)

```python
from confluent_kafka import Producer

producer = Producer({
    'bootstrap.servers': 'kafka-1:9092,kafka-2:9092,kafka-3:9092',
    
    # Reliability settings
    'acks': 'all',                    # Wait for all replicas
    'enable.idempotence': True,       # Exactly-once delivery
    'max.in.flight.requests.per.connection': 5,  # Required for idempotence
    
    # Performance settings
    'linger.ms': 5,                   # Batch for up to 5ms
    'batch.size': 65536,              # 64KB batches
    'compression.type': 'snappy',     # Good compression/CPU tradeoff
    
    # Retry settings
    'retries': 2147483647,            # Retry forever
    'retry.backoff.ms': 100,
    'delivery.timeout.ms': 120000,    # Give up after 2 minutes
})

def delivery_report(err, msg):
    if err is not None:
        print(f'Message delivery failed: {err}')
    else:
        print(f'Message delivered to {msg.topic()} [{msg.partition()}] @ {msg.offset()}')

# Produce with structured key for partitioning
producer.produce(
    topic='user-events',
    key=user_id.encode('utf-8'),     # Ensures same user → same partition
    value=json.dumps(event).encode('utf-8'),
    headers={'event-type': event['type'], 'schema-version': '2'},
    on_delivery=delivery_report
)
producer.poll(0)
```

### Schema Registry with Avro

In production, raw JSON is a footgun. Schema Registry + Avro gives you schema evolution with backward/forward compatibility:

```python
from confluent_kafka.avro import AvroProducer
from confluent_kafka import avro

USER_CLICK_SCHEMA = avro.loads("""
{
  "type": "record",
  "name": "UserClick",
  "namespace": "com.myapp.events",
  "fields": [
    {"name": "user_id", "type": "string"},
    {"name": "session_id", "type": "string"},
    {"name": "page_url", "type": "string"},
    {"name": "timestamp_ms", "type": "long"},
    {"name": "referrer", "type": ["null", "string"], "default": null}
  ]
}
""")

producer = AvroProducer(
    {
        'bootstrap.servers': 'kafka-1:9092',
        'schema.registry.url': 'http://schema-registry:8081'
    },
    default_value_schema=USER_CLICK_SCHEMA
)

producer.produce(
    topic='user-clicks',
    key=user_id,
    value={
        'user_id': user_id,
        'session_id': session_id,
        'page_url': '/products/widget-123',
        'timestamp_ms': int(time.time() * 1000),
        'referrer': None
    }
)
```

---

## Apache Flink 2.0: Unified Batch and Streaming

Flink 2.0 unified the batch and streaming APIs. The same code now handles both historical backfills and real-time processing.

### Core Concepts

```python
from pyflink.datastream import StreamExecutionEnvironment
from pyflink.datastream.connectors.kafka import KafkaSource, KafkaSink
from pyflink.common.serialization import SimpleStringSchema
from pyflink.common import WatermarkStrategy
from pyflink.datastream.window import TumblingEventTimeWindows, Time

env = StreamExecutionEnvironment.get_execution_environment()
env.set_parallelism(4)
env.enable_checkpointing(60000)   # Checkpoint every 60s

# Kafka source with watermark strategy
source = (KafkaSource.builder()
    .set_bootstrap_servers("kafka-1:9092,kafka-2:9092")
    .set_topics("user-clicks")
    .set_group_id("flink-click-aggregator")
    .set_starting_offsets(KafkaOffsetsInitializer.committed_offsets())
    .set_value_only_deserializer(SimpleStringSchema())
    .build())

watermark_strategy = (WatermarkStrategy
    .for_bounded_out_of_orderness(Duration.of_seconds(10))
    .with_timestamp_assigner(ClickEventTimestampAssigner()))

stream = env.from_source(
    source=source,
    watermark_strategy=watermark_strategy,
    source_name="Kafka Click Events"
)
```

### Stateful Stream Processing: Session Windows

One of Flink's superpowers is stateful processing with proper session semantics:

```python
from pyflink.datastream.functions import ProcessWindowFunction
from pyflink.datastream import KeyedStream

class SessionAnalyzer(ProcessWindowFunction):
    """Analyze user sessions: duration, pages, conversion."""
    
    def process(self, key, context, elements):
        clicks = sorted(elements, key=lambda e: e.timestamp_ms)
        
        if not clicks:
            return
        
        session_duration_ms = clicks[-1].timestamp_ms - clicks[0].timestamp_ms
        pages_visited = len(set(c.page_url for c in clicks))
        converted = any(c.page_url.startswith('/checkout') for c in clicks)
        
        yield SessionSummary(
            user_id=key,
            session_start=clicks[0].timestamp_ms,
            session_end=clicks[-1].timestamp_ms,
            duration_ms=session_duration_ms,
            page_count=pages_visited,
            click_count=len(clicks),
            converted=converted
        )

# Session window: gap of 30 minutes = new session
session_results = (stream
    .map(parse_click_event)
    .key_by(lambda e: e.user_id)
    .window(EventTimeSessionWindows.with_gap(Time.minutes(30)))
    .process(SessionAnalyzer()))
```

### Exactly-Once Processing with Kafka

The most important production concern: ensuring events are processed exactly once, not at-least-once.

```python
from pyflink.datastream.connectors.kafka import KafkaSink, KafkaRecordSerializationSchema
from pyflink.datastream.connectors.kafka import DeliveryGuarantee

# Flink Kafka sink with exactly-once semantics
sink = (KafkaSink.builder()
    .set_bootstrap_servers("kafka-1:9092,kafka-2:9092")
    .set_record_serializer(
        KafkaRecordSerializationSchema.builder()
            .set_topic("session-summaries")
            .set_value_serialization_schema(SessionSummarySchema())
            .build()
    )
    .set_delivery_guarantee(DeliveryGuarantee.EXACTLY_ONCE)  # 👈 Key setting
    .set_transactional_id_prefix("flink-session-analyzer")
    .build())

session_results.sink_to(sink)

# Checkpoint configuration for exactly-once
env.get_checkpoint_config().set_checkpointing_mode(CheckpointingMode.EXACTLY_ONCE)
env.get_checkpoint_config().set_min_pause_between_checkpoints(30000)
env.get_checkpoint_config().set_checkpoint_timeout(120000)
```

This requires Kafka producers to use transactions. Flink handles all of this automatically when `DeliveryGuarantee.EXACTLY_ONCE` is set.

---

## Pattern: Change Data Capture (CDC) with Debezium

A common pattern is streaming database changes into Kafka for real-time derived views:

```yaml
# Debezium Kafka Connect connector for PostgreSQL
{
  "name": "postgres-cdc-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "${secrets:postgres/debezium-password}",
    "database.dbname": "production",
    "database.server.name": "prod-postgres",
    "table.include.list": "public.orders,public.users,public.products",
    "publication.name": "dbz_publication",
    "slot.name": "debezium_slot",
    
    "transforms": "route,unwrap",
    "transforms.route.type": "org.apache.kafka.connect.transforms.ReplaceField$Value",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "transforms.unwrap.drop.tombstones": "false",
    "transforms.unwrap.delete.handling.mode": "rewrite",
    
    "key.converter": "io.confluent.kafka.serializers.KafkaAvroSerializer",
    "value.converter": "io.confluent.kafka.serializers.KafkaAvroSerializer",
    "key.converter.schema.registry.url": "http://schema-registry:8081",
    "value.converter.schema.registry.url": "http://schema-registry:8081"
  }
}
```

Now in Flink, you can join the live CDC stream with a reference table:

```python
from pyflink.table import StreamTableEnvironment, EnvironmentSettings

settings = EnvironmentSettings.new_instance().in_streaming_mode().build()
t_env = StreamTableEnvironment.create(stream_env, environment_settings=settings)

# Register Kafka CDC table (orders)
t_env.execute_sql("""
CREATE TABLE orders (
  order_id BIGINT,
  user_id STRING,
  product_id STRING,
  amount DECIMAL(10,2),
  status STRING,
  created_at TIMESTAMP(3),
  op STRING,  -- CDC operation: 'c', 'u', 'd', 'r'
  WATERMARK FOR created_at AS created_at - INTERVAL '10' SECOND
) WITH (
  'connector' = 'kafka',
  'topic' = 'prod-postgres.public.orders',
  'properties.bootstrap.servers' = 'kafka-1:9092',
  'properties.group.id' = 'flink-order-processor',
  'format' = 'debezium-avro-confluent',
  'debezium-avro-confluent.schema-registry.url' = 'http://schema-registry:8081'
)
""")

# Real-time revenue per user (1-hour tumbling window)
result = t_env.sql_query("""
SELECT
  user_id,
  TUMBLE_START(created_at, INTERVAL '1' HOUR) AS window_start,
  COUNT(*) AS order_count,
  SUM(amount) AS total_revenue
FROM orders
WHERE status = 'completed' AND op IN ('c', 'r')
GROUP BY user_id, TUMBLE(created_at, INTERVAL '1' HOUR)
""")
```

---

## Monitoring: What to Watch

### Kafka Metrics (Prometheus + Grafana)

```yaml
# Key metrics to alert on
kafka_server_brokertopicmetrics_messagesin_total  # throughput
kafka_consumer_lag_sum                             # consumer lag ← MOST IMPORTANT
kafka_server_replicamanager_underreplicatedpartitions  # replication health
kafka_network_requestmetrics_requestqueuesize      # broker pressure
```

Consumer lag is the #1 operational metric. Alert when lag exceeds your SLA:

```yaml
# Prometheus alert rule
- alert: KafkaConsumerLagHigh
  expr: kafka_consumer_lag_sum{consumer_group="flink-session-analyzer"} > 100000
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Kafka consumer lag is high for {{ $labels.consumer_group }}"
    description: "Consumer lag is {{ $value }} messages, above threshold of 100,000"
```

### Flink Metrics

```python
# In your Flink job, register custom metrics
from pyflink.datastream.functions import RichMapFunction

class EnrichedProcessor(RichMapFunction):
    def open(self, runtime_context):
        # Register metrics
        self.events_processed = runtime_context \
            .get_metrics_group() \
            .counter("events_processed")
        self.enrichment_latency = runtime_context \
            .get_metrics_group() \
            .histogram("enrichment_latency_ms", DropwizardHistogramWrapper(
                ExponentiallyDecayingReservoir()
            ))
    
    def map(self, event):
        start = time.time()
        enriched = enrich_event(event)
        
        self.events_processed.inc()
        self.enrichment_latency.update(int((time.time() - start) * 1000))
        
        return enriched
```

---

## Common Pitfalls

### 1. Partition Count Mistakes

```bash
# Too few partitions = throughput ceiling
# Rule of thumb: partitions ≥ max expected consumer parallelism

# Calculate needed partitions
target_throughput_mb_s=500
single_partition_throughput_mb_s=10   # Typical for moderate message size
needed_partitions=$((target_throughput_mb_s / single_partition_throughput_mb_s))
echo "Recommended partitions: $needed_partitions"  # → 50
```

### 2. Consumer Group Offset Management

```python
# WRONG: Auto-commit can lose messages on crash
consumer = KafkaConsumer(
    bootstrap_servers=['kafka-1:9092'],
    enable_auto_commit=True  # ← dangerous
)

# RIGHT: Manual commit after processing
consumer = KafkaConsumer(
    bootstrap_servers=['kafka-1:9092'],
    enable_auto_commit=False,
    max_poll_records=500
)

for message_batch in consumer:
    process_batch(message_batch)
    consumer.commit()  # Only commit after successful processing
```

### 3. Watermark Misconfiguration in Flink

Late events that arrive after the watermark are dropped by default. Configure allowed lateness:

```python
stream.key_by(lambda e: e.user_id) \
    .window(TumblingEventTimeWindows.of(Time.minutes(5))) \
    .allowed_lateness(Time.minutes(2)) \     # ← Accept up to 2 min late
    .side_output_late_data(late_events_tag) \  # ← Route to side output
    .aggregate(ClickCountAggregator())
```

---

## Conclusion

The Kafka + Flink stack in 2026 is genuinely production-mature. KRaft removes ZooKeeper complexity, tiered storage makes retention affordable, and Flink 2.0's unified API simplifies both batch backfills and live stream processing.

The key to success is starting simple: a few well-partitioned topics, idempotent producers, and a basic Flink job with proper checkpointing. Add complexity only when you need it. The operational overhead of exactly-once semantics, GraphRAG enrichment, and complex windowing is real — don't pay for it until you need it.

Event-driven architectures win when your data flows are genuinely event-shaped. If you're force-fitting request/response patterns into a streaming system, step back and reconsider.

*What's your biggest operational challenge with Kafka or Flink? Let me know in the comments.*
