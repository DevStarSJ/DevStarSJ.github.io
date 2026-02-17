---
layout: post
title: "Event-Driven Architecture with Apache Kafka: Complete Guide"
subtitle: "Build scalable, decoupled systems with real-time event streaming"
date: 2026-02-17
author: "DevStarSJ"
header-img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200"
catalog: true
tags:
  - Kafka
  - Event-Driven
  - Architecture
  - Microservices
  - Streaming
---

# Event-Driven Architecture with Apache Kafka: Complete Guide

Event-driven architecture (EDA) has become the backbone of modern distributed systems. Apache Kafka, with its durability, scalability, and performance, is the de facto standard for building event-driven systems.

![Data Streaming](https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800)
*Photo by [Markus Spiske](https://unsplash.com/@markusspiske) on Unsplash*

## Why Event-Driven Architecture?

### Traditional Request-Response

```
Service A → Service B → Service C
        ← Response ←
```

Problems:
- Tight coupling
- Synchronous blocking
- Single point of failure

### Event-Driven

```
Service A → [Event Bus] → Service B
                       → Service C
                       → Service D
```

Benefits:
- Loose coupling
- Asynchronous processing
- Independent scaling
- Event replay capability

## Kafka Fundamentals

### Core Concepts

- **Topic**: Category or feed name for messages
- **Partition**: Ordered, immutable sequence of records
- **Producer**: Publishes messages to topics
- **Consumer**: Reads messages from topics
- **Consumer Group**: Set of consumers sharing workload
- **Broker**: Kafka server instance

### Setting Up Kafka with Docker

```yaml
# docker-compose.yml
version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'true'

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092
```

## Designing Events

### Event Schema Best Practices

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "eventType": "OrderCreated",
  "eventVersion": "1.0",
  "timestamp": "2026-02-17T10:30:00Z",
  "source": "order-service",
  "correlationId": "req-12345",
  "data": {
    "orderId": "ORD-789",
    "customerId": "CUST-456",
    "items": [
      {"productId": "PROD-123", "quantity": 2, "price": 29.99}
    ],
    "totalAmount": 59.98
  },
  "metadata": {
    "userId": "user-123",
    "channel": "web"
  }
}
```

### Schema Registry

Using Avro with Confluent Schema Registry:

```python
from confluent_kafka import avro
from confluent_kafka.avro import AvroProducer

value_schema_str = """
{
   "namespace": "com.example.orders",
   "name": "OrderCreated",
   "type": "record",
   "fields": [
       {"name": "orderId", "type": "string"},
       {"name": "customerId", "type": "string"},
       {"name": "totalAmount", "type": "double"},
       {"name": "timestamp", "type": "long", "logicalType": "timestamp-millis"}
   ]
}
"""

value_schema = avro.loads(value_schema_str)

producer = AvroProducer({
    'bootstrap.servers': 'localhost:9092',
    'schema.registry.url': 'http://localhost:8081'
}, default_value_schema=value_schema)
```

![Architecture Diagram](https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800)
*Photo by [NASA](https://unsplash.com/@nasa) on Unsplash*

## Producer Implementation

### Python Producer

```python
from confluent_kafka import Producer
import json

config = {
    'bootstrap.servers': 'localhost:9092',
    'acks': 'all',
    'retries': 3,
    'retry.backoff.ms': 1000,
    'enable.idempotence': True,
}

producer = Producer(config)

def delivery_callback(err, msg):
    if err:
        print(f'Message delivery failed: {err}')
    else:
        print(f'Message delivered to {msg.topic()} [{msg.partition()}]')

def publish_order_event(order):
    event = {
        'eventType': 'OrderCreated',
        'timestamp': datetime.utcnow().isoformat(),
        'data': order
    }
    
    producer.produce(
        topic='orders',
        key=order['orderId'],
        value=json.dumps(event),
        callback=delivery_callback
    )
    producer.flush()
```

### Java Producer with Spring

```java
@Service
public class OrderEventPublisher {
    
    private final KafkaTemplate<String, OrderEvent> kafkaTemplate;
    
    public OrderEventPublisher(KafkaTemplate<String, OrderEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }
    
    public CompletableFuture<SendResult<String, OrderEvent>> publishOrderCreated(Order order) {
        OrderEvent event = OrderEvent.builder()
            .eventId(UUID.randomUUID().toString())
            .eventType("OrderCreated")
            .timestamp(Instant.now())
            .data(order)
            .build();
        
        return kafkaTemplate.send("orders", order.getId(), event);
    }
}
```

## Consumer Implementation

### Python Consumer

```python
from confluent_kafka import Consumer, KafkaError
import json

config = {
    'bootstrap.servers': 'localhost:9092',
    'group.id': 'inventory-service',
    'auto.offset.reset': 'earliest',
    'enable.auto.commit': False,
}

consumer = Consumer(config)
consumer.subscribe(['orders'])

try:
    while True:
        msg = consumer.poll(timeout=1.0)
        
        if msg is None:
            continue
        if msg.error():
            if msg.error().code() == KafkaError._PARTITION_EOF:
                continue
            raise KafkaException(msg.error())
        
        event = json.loads(msg.value())
        
        # Process event
        if event['eventType'] == 'OrderCreated':
            process_order(event['data'])
        
        # Manual commit after successful processing
        consumer.commit(msg)
        
finally:
    consumer.close()
```

### Consumer Group Patterns

```java
@KafkaListener(
    topics = "orders",
    groupId = "notification-service",
    containerFactory = "kafkaListenerContainerFactory"
)
public void handleOrderEvent(
    @Payload OrderEvent event,
    @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
    @Header(KafkaHeaders.OFFSET) long offset
) {
    log.info("Received event: {} from partition: {} at offset: {}", 
        event.getEventType(), partition, offset);
    
    switch (event.getEventType()) {
        case "OrderCreated" -> sendOrderConfirmation(event.getData());
        case "OrderShipped" -> sendShippingNotification(event.getData());
        case "OrderDelivered" -> sendDeliveryConfirmation(event.getData());
    }
}
```

## Event Sourcing Pattern

Store all changes as events:

```python
class OrderAggregate:
    def __init__(self, order_id):
        self.order_id = order_id
        self.status = None
        self.items = []
        self.events = []
    
    def create_order(self, customer_id, items):
        event = OrderCreatedEvent(
            order_id=self.order_id,
            customer_id=customer_id,
            items=items,
            timestamp=datetime.utcnow()
        )
        self._apply(event)
        self.events.append(event)
    
    def ship_order(self, tracking_number):
        if self.status != 'CONFIRMED':
            raise InvalidStateError("Order must be confirmed before shipping")
        
        event = OrderShippedEvent(
            order_id=self.order_id,
            tracking_number=tracking_number,
            timestamp=datetime.utcnow()
        )
        self._apply(event)
        self.events.append(event)
    
    def _apply(self, event):
        if isinstance(event, OrderCreatedEvent):
            self.status = 'CREATED'
            self.items = event.items
        elif isinstance(event, OrderShippedEvent):
            self.status = 'SHIPPED'
            self.tracking_number = event.tracking_number
    
    @classmethod
    def rebuild(cls, order_id, events):
        aggregate = cls(order_id)
        for event in events:
            aggregate._apply(event)
        return aggregate
```

## CQRS Pattern

Separate read and write models:

```python
# Command Side - Write Model
class OrderCommandHandler:
    def __init__(self, event_store, producer):
        self.event_store = event_store
        self.producer = producer
    
    def handle_create_order(self, command):
        order = OrderAggregate(command.order_id)
        order.create_order(command.customer_id, command.items)
        
        # Persist events
        for event in order.events:
            self.event_store.append(event)
            self.producer.publish('orders', event)

# Query Side - Read Model
class OrderQueryHandler:
    def __init__(self, read_db):
        self.read_db = read_db
    
    def get_order(self, order_id):
        return self.read_db.orders.find_one({'orderId': order_id})
    
    def get_orders_by_customer(self, customer_id):
        return list(self.read_db.orders.find({'customerId': customer_id}))

# Projection - Updates Read Model
@kafka_consumer(topics=['orders'])
def order_projector(event):
    if event['eventType'] == 'OrderCreated':
        read_db.orders.insert_one({
            'orderId': event['data']['orderId'],
            'customerId': event['data']['customerId'],
            'status': 'CREATED',
            'items': event['data']['items'],
            'createdAt': event['timestamp']
        })
    elif event['eventType'] == 'OrderShipped':
        read_db.orders.update_one(
            {'orderId': event['data']['orderId']},
            {'$set': {'status': 'SHIPPED', 'shippedAt': event['timestamp']}}
        )
```

## Error Handling & Dead Letter Queue

```python
def process_with_dlq(consumer, producer, handler):
    while True:
        msg = consumer.poll(timeout=1.0)
        if msg is None:
            continue
        
        try:
            handler(msg.value())
            consumer.commit(msg)
        except RetryableError as e:
            # Retry with backoff
            retry_count = get_retry_count(msg)
            if retry_count < MAX_RETRIES:
                producer.produce(
                    topic='orders.retry',
                    value=msg.value(),
                    headers={'retry-count': str(retry_count + 1)}
                )
            else:
                # Send to DLQ
                producer.produce(
                    topic='orders.dlq',
                    value=msg.value(),
                    headers={'error': str(e)}
                )
            consumer.commit(msg)
        except Exception as e:
            # Non-retryable, send directly to DLQ
            producer.produce(
                topic='orders.dlq',
                value=msg.value(),
                headers={'error': str(e)}
            )
            consumer.commit(msg)
```

## Monitoring & Observability

### Key Metrics

```yaml
# Prometheus metrics to monitor
- kafka_consumer_lag  # Messages behind
- kafka_producer_request_latency_avg
- kafka_consumer_records_consumed_rate
- kafka_broker_partition_count
```

### Distributed Tracing

```python
from opentelemetry import trace
from opentelemetry.propagate import inject, extract

tracer = trace.get_tracer(__name__)

def produce_with_tracing(producer, topic, event):
    with tracer.start_as_current_span("kafka.produce") as span:
        span.set_attribute("messaging.system", "kafka")
        span.set_attribute("messaging.destination", topic)
        
        headers = {}
        inject(headers)
        
        producer.produce(
            topic=topic,
            value=json.dumps(event),
            headers=headers
        )
```

## Conclusion

Event-driven architecture with Kafka enables:

- **Scalability**: Handle millions of events per second
- **Resilience**: Decouple services, tolerate failures
- **Flexibility**: Add consumers without changing producers
- **Auditability**: Complete event history for debugging

Start simple, evolve gradually, and always monitor your event flows.

---

*Building event-driven systems? What patterns have worked for you? Share in the comments!*
