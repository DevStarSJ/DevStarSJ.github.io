---
layout: post
title: "Event-Driven Architecture with Apache Kafka: Building Scalable Real-Time Systems"
subtitle: "Master Kafka Streams, event sourcing patterns, and CloudEvents for modern distributed applications"
date: 2026-02-12
author: "Dev Star"
header-img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200"
tags: [Apache Kafka, Event-Driven Architecture, Microservices, Streaming, CloudEvents]
---

# Event-Driven Architecture with Apache Kafka: Building Scalable Real-Time Systems

Event-driven architecture (EDA) has become the foundation for building scalable, loosely coupled distributed systems. Apache Kafka, as the de facto standard for event streaming, provides the backbone for real-time data processing at scale.

![Data Streams](https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800)
*Photo by [Markus Spiske](https://unsplash.com/@markusspiske) on Unsplash*

## Why Event-Driven Architecture?

| Traditional Request-Response | Event-Driven |
|------------------------------|--------------|
| Tight coupling | Loose coupling |
| Synchronous communication | Asynchronous processing |
| Point-to-point | Publish-subscribe |
| Difficult to scale | Horizontally scalable |
| Single point of failure | Fault tolerant |

## Kafka Architecture Deep Dive

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Kafka Cluster                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Broker 1│  │ Broker 2│  │ Broker 3│  │ Broker 4│        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
│  ┌────┴────────────┴────────────┴────────────┴────┐        │
│  │              Topics & Partitions                │        │
│  │  orders: [P0] [P1] [P2] [P3]                   │        │
│  │  users:  [P0] [P1]                             │        │
│  │  events: [P0] [P1] [P2]                        │        │
│  └────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
           │                              │
    ┌──────┴──────┐                ┌──────┴──────┐
    │  Producers  │                │  Consumers  │
    └─────────────┘                └─────────────┘
```

### Production Kafka Configuration

```yaml
# docker-compose.kafka.yml
version: '3.8'

services:
  kafka-1:
    image: confluentinc/cp-kafka:7.6.0
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-1:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 2
      KAFKA_LOG_RETENTION_HOURS: 168
      KAFKA_LOG_SEGMENT_BYTES: 1073741824
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk'
    volumes:
      - kafka-1-data:/var/lib/kafka/data

  kafka-2:
    image: confluentinc/cp-kafka:7.6.0
    environment:
      KAFKA_NODE_ID: 2
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-2:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk'
    volumes:
      - kafka-2-data:/var/lib/kafka/data

  kafka-3:
    image: confluentinc/cp-kafka:7.6.0
    environment:
      KAFKA_NODE_ID: 3
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-3:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk'
    volumes:
      - kafka-3-data:/var/lib/kafka/data

  schema-registry:
    image: confluentinc/cp-schema-registry:7.6.0
    depends_on:
      - kafka-1
      - kafka-2
      - kafka-3
    environment:
      SCHEMA_REGISTRY_HOST_NAME: schema-registry
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: kafka-1:9092,kafka-2:9092,kafka-3:9092
      SCHEMA_REGISTRY_LISTENERS: http://0.0.0.0:8081
    ports:
      - "8081:8081"

volumes:
  kafka-1-data:
  kafka-2-data:
  kafka-3-data:
```

## Event Design with CloudEvents

### CloudEvents Specification

```typescript
// CloudEvents standard format
interface CloudEvent<T> {
  // Required attributes
  specversion: "1.0";
  id: string;          // Unique event identifier
  source: string;      // Event source URI
  type: string;        // Event type
  
  // Optional attributes
  datacontenttype?: string;
  dataschema?: string;
  subject?: string;
  time?: string;       // RFC 3339 timestamp
  
  // Extension attributes
  [key: string]: unknown;
  
  // Event data
  data: T;
}

// Example: Order Created Event
interface OrderCreatedData {
  orderId: string;
  customerId: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
}

const orderCreatedEvent: CloudEvent<OrderCreatedData> = {
  specversion: "1.0",
  id: "A234-1234-1234",
  source: "/orders/service",
  type: "com.example.order.created",
  datacontenttype: "application/json",
  time: "2026-02-12T13:45:00Z",
  subject: "order-12345",
  data: {
    orderId: "order-12345",
    customerId: "customer-789",
    items: [
      { productId: "prod-1", quantity: 2, price: 29.99 },
      { productId: "prod-2", quantity: 1, price: 49.99 }
    ],
    totalAmount: 109.97,
    currency: "USD"
  }
};
```

### Schema Registry Integration

```typescript
// schemas/order-events.avsc
{
  "type": "record",
  "name": "OrderCreated",
  "namespace": "com.example.orders",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "customerId", "type": "string"},
    {"name": "items", "type": {"type": "array", "items": {
      "type": "record",
      "name": "OrderItem",
      "fields": [
        {"name": "productId", "type": "string"},
        {"name": "quantity", "type": "int"},
        {"name": "price", "type": {"type": "bytes", "logicalType": "decimal", "precision": 10, "scale": 2}}
      ]
    }}},
    {"name": "totalAmount", "type": {"type": "bytes", "logicalType": "decimal", "precision": 10, "scale": 2}},
    {"name": "currency", "type": "string"},
    {"name": "createdAt", "type": {"type": "long", "logicalType": "timestamp-millis"}}
  ]
}
```

![Server Infrastructure](https://images.unsplash.com/photo-1597852074816-d933c7d2b988?w=800)
*Photo by [imgix](https://unsplash.com/@imgix) on Unsplash*

## Implementing Producers and Consumers

### TypeScript Kafka Producer

```typescript
// src/kafka/producer.ts
import { Kafka, Producer, Partitioners, CompressionTypes } from "kafkajs";
import { SchemaRegistry, SchemaType } from "@kafkajs/confluent-schema-registry";

interface ProducerConfig {
  brokers: string[];
  clientId: string;
  schemaRegistryUrl: string;
}

export class EventProducer {
  private kafka: Kafka;
  private producer: Producer;
  private registry: SchemaRegistry;
  private schemaCache: Map<string, number> = new Map();

  constructor(config: ProducerConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
        maxRetryTime: 30000,
        factor: 2
      }
    });

    this.producer = this.kafka.producer({
      createPartitioner: Partitioners.DefaultPartitioner,
      allowAutoTopicCreation: false,
      transactionTimeout: 30000,
      idempotent: true
    });

    this.registry = new SchemaRegistry({ host: config.schemaRegistryUrl });
  }

  async connect(): Promise<void> {
    await this.producer.connect();
    console.log("Producer connected to Kafka");
  }

  async publishEvent<T>(
    topic: string,
    key: string,
    event: CloudEvent<T>,
    schemaSubject: string
  ): Promise<void> {
    // Get or register schema
    let schemaId = this.schemaCache.get(schemaSubject);
    if (!schemaId) {
      const schema = await this.registry.getLatestSchemaId(schemaSubject);
      schemaId = schema;
      this.schemaCache.set(schemaSubject, schemaId);
    }

    // Encode with Avro
    const encodedValue = await this.registry.encode(schemaId, event);

    await this.producer.send({
      topic,
      compression: CompressionTypes.LZ4,
      messages: [
        {
          key: Buffer.from(key),
          value: encodedValue,
          headers: {
            "ce-specversion": event.specversion,
            "ce-id": event.id,
            "ce-source": event.source,
            "ce-type": event.type,
            "ce-time": event.time || new Date().toISOString()
          }
        }
      ]
    });
  }

  // Transactional publishing for exactly-once semantics
  async publishEventsTransactionally<T>(
    events: Array<{ topic: string; key: string; event: CloudEvent<T>; schema: string }>
  ): Promise<void> {
    const transaction = await this.producer.transaction();

    try {
      for (const { topic, key, event, schema } of events) {
        const schemaId = await this.registry.getLatestSchemaId(schema);
        const encodedValue = await this.registry.encode(schemaId, event);

        await transaction.send({
          topic,
          messages: [{ key: Buffer.from(key), value: encodedValue }]
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.abort();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }
}
```

### Consumer Group Implementation

```typescript
// src/kafka/consumer.ts
import { Kafka, Consumer, EachMessagePayload } from "kafkajs";
import { SchemaRegistry } from "@kafkajs/confluent-schema-registry";

interface ConsumerConfig {
  brokers: string[];
  groupId: string;
  clientId: string;
  schemaRegistryUrl: string;
}

type EventHandler<T> = (event: CloudEvent<T>, metadata: EventMetadata) => Promise<void>;

interface EventMetadata {
  topic: string;
  partition: number;
  offset: string;
  timestamp: string;
  headers: Record<string, string>;
}

export class EventConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private registry: SchemaRegistry;
  private handlers: Map<string, EventHandler<unknown>> = new Map();

  constructor(config: ConsumerConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers
    });

    this.consumer = this.kafka.consumer({
      groupId: config.groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1048576,
      retry: { retries: 5 }
    });

    this.registry = new SchemaRegistry({ host: config.schemaRegistryUrl });
  }

  registerHandler<T>(eventType: string, handler: EventHandler<T>): void {
    this.handlers.set(eventType, handler as EventHandler<unknown>);
  }

  async subscribe(topics: string[]): Promise<void> {
    await this.consumer.connect();
    
    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload);
      }
    });
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    
    try {
      // Decode Avro message
      const decodedValue = await this.registry.decode(message.value!);
      
      // Extract CloudEvents headers
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(message.headers || {})) {
        headers[key] = value?.toString() || "";
      }

      const eventType = headers["ce-type"];
      const handler = this.handlers.get(eventType);

      if (!handler) {
        console.warn(`No handler registered for event type: ${eventType}`);
        return;
      }

      const metadata: EventMetadata = {
        topic,
        partition,
        offset: message.offset,
        timestamp: message.timestamp,
        headers
      };

      await handler(decodedValue, metadata);
      
    } catch (error) {
      console.error("Error processing message:", error);
      // Implement dead letter queue logic here
      await this.sendToDeadLetterQueue(topic, message, error);
    }
  }

  private async sendToDeadLetterQueue(
    originalTopic: string,
    message: unknown,
    error: Error
  ): Promise<void> {
    // Publish to DLQ for manual inspection
    const dlqTopic = `${originalTopic}.dlq`;
    // Implementation details...
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
  }
}
```

## Kafka Streams for Real-Time Processing

```java
// OrderProcessingTopology.java
import org.apache.kafka.streams.*;
import org.apache.kafka.streams.kstream.*;
import org.apache.kafka.common.serialization.Serdes;

public class OrderProcessingTopology {
    
    public Topology buildTopology() {
        StreamsBuilder builder = new StreamsBuilder();
        
        // Input streams
        KStream<String, OrderEvent> orders = builder.stream(
            "orders",
            Consumed.with(Serdes.String(), orderEventSerde())
        );
        
        KTable<String, Customer> customers = builder.table(
            "customers",
            Consumed.with(Serdes.String(), customerSerde())
        );
        
        KTable<String, Product> products = builder.table(
            "products",
            Consumed.with(Serdes.String(), productSerde())
        );
        
        // Enrich orders with customer data
        KStream<String, EnrichedOrder> enrichedOrders = orders
            .selectKey((key, order) -> order.getCustomerId())
            .join(
                customers,
                (order, customer) -> EnrichedOrder.builder()
                    .orderId(order.getOrderId())
                    .customer(customer)
                    .items(order.getItems())
                    .build(),
                Joined.with(Serdes.String(), orderEventSerde(), customerSerde())
            );
        
        // Calculate real-time metrics
        KTable<Windowed<String>, OrderMetrics> hourlyMetrics = enrichedOrders
            .groupBy((key, order) -> order.getCustomer().getRegion())
            .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofHours(1)))
            .aggregate(
                OrderMetrics::new,
                (key, order, metrics) -> metrics.add(order),
                Materialized.with(Serdes.String(), orderMetricsSerde())
            );
        
        // Output streams
        enrichedOrders.to(
            "enriched-orders",
            Produced.with(Serdes.String(), enrichedOrderSerde())
        );
        
        hourlyMetrics.toStream()
            .map((windowedKey, metrics) -> KeyValue.pair(
                windowedKey.key() + "@" + windowedKey.window().start(),
                metrics
            ))
            .to("order-metrics", Produced.with(Serdes.String(), orderMetricsSerde()));
        
        return builder.build();
    }
    
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "order-processing");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
        props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, StreamsConfig.EXACTLY_ONCE_V2);
        props.put(StreamsConfig.NUM_STREAM_THREADS_CONFIG, 4);
        
        OrderProcessingTopology topology = new OrderProcessingTopology();
        KafkaStreams streams = new KafkaStreams(topology.buildTopology(), props);
        
        // Graceful shutdown
        Runtime.getRuntime().addShutdownHook(new Thread(streams::close));
        
        streams.start();
    }
}
```

## Monitoring and Observability

### Key Metrics to Track

```yaml
# prometheus-kafka-rules.yml
groups:
  - name: kafka-alerts
    rules:
      - alert: KafkaConsumerLag
        expr: kafka_consumer_group_lag > 10000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High consumer lag detected"
          
      - alert: KafkaUnderReplicatedPartitions
        expr: kafka_server_replicamanager_underreplicatedpartitions > 0
        for: 1m
        labels:
          severity: critical
          
      - alert: KafkaNoActiveController
        expr: kafka_controller_activecontrollercount != 1
        for: 1m
        labels:
          severity: critical
```

## Best Practices

1. **Use idempotent producers** for exactly-once delivery guarantees
2. **Design events as immutable facts** about what happened
3. **Include correlation IDs** for distributed tracing
4. **Implement circuit breakers** for consumer resilience
5. **Use Schema Registry** for contract enforcement
6. **Monitor consumer lag** as primary health indicator

## Conclusion

Event-driven architecture with Apache Kafka enables building systems that are scalable, resilient, and maintainable. By embracing CloudEvents standards and implementing proper patterns for event sourcing and streaming, teams can build modern distributed applications that handle real-time data at any scale.

## Resources

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [CloudEvents Specification](https://cloudevents.io/)
- [Confluent Developer](https://developer.confluent.io/)
- [Kafka Streams Documentation](https://kafka.apache.org/documentation/streams/)
