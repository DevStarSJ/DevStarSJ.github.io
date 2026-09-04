---
layout: post
title: "MLOps Best Practices: From Experiment to Production in 2026"
subtitle: "Build reliable, scalable machine learning pipelines that actually work"
date: 2026-02-17
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1555255707-c07966088b7b?w=1200"
catalog: true
tags:
  - MLOps
  - Machine Learning
  - AI
  - DevOps
  - Production
---

# MLOps Best Practices: From Experiment to Production in 2026

The gap between experimental ML models and production systems remains one of the biggest challenges in AI. MLOps bridges this gap by applying DevOps principles to machine learning workflows.

![Machine Learning](https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800)
*Photo by [Steve Johnson](https://unsplash.com/@steve_j) on Unsplash*

## The MLOps Lifecycle

### 1. Data Management
### 2. Model Development
### 3. Model Training
### 4. Model Deployment
### 5. Monitoring & Feedback

## Data Versioning with DVC

Data Version Control (DVC) brings Git-like versioning to datasets:

```bash
# Initialize DVC
dvc init

# Track large files
dvc add data/training_data.parquet

# Push to remote storage
dvc remote add -d myremote s3://my-bucket/dvc
dvc push

# Pull data on another machine
dvc pull
```

### DVC Pipeline Definition

```yaml
# dvc.yaml
stages:
  preprocess:
    cmd: python src/preprocess.py
    deps:
      - src/preprocess.py
      - data/raw/
    outs:
      - data/processed/

  train:
    cmd: python src/train.py
    deps:
      - src/train.py
      - data/processed/
    params:
      - train.epochs
      - train.learning_rate
    outs:
      - models/model.pkl
    metrics:
      - metrics.json:
          cache: false

  evaluate:
    cmd: python src/evaluate.py
    deps:
      - src/evaluate.py
      - models/model.pkl
      - data/test/
    metrics:
      - evaluation.json:
          cache: false
```

## Experiment Tracking with MLflow

```python
import mlflow
import mlflow.sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score

mlflow.set_tracking_uri("http://mlflow-server:5000")
mlflow.set_experiment("customer-churn-prediction")

with mlflow.start_run(run_name="random-forest-v1"):
    # Log parameters
    mlflow.log_params({
        "n_estimators": 100,
        "max_depth": 10,
        "min_samples_split": 5
    })
    
    # Train model
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    f1 = f1_score(y_test, predictions)
    
    # Log metrics
    mlflow.log_metrics({
        "accuracy": accuracy,
        "f1_score": f1
    })
    
    # Log model
    mlflow.sklearn.log_model(model, "model")
    
    # Log artifacts
    mlflow.log_artifact("feature_importance.png")
```

![Data Pipeline](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800)
*Photo by [Luke Chesser](https://unsplash.com/@lukechesser) on Unsplash*

## Feature Store Implementation

A feature store ensures consistency between training and serving:

```python
from feast import FeatureStore, Entity, FeatureView, Field
from feast.types import Float32, Int64
from datetime import timedelta

# Define entity
customer = Entity(
    name="customer_id",
    join_keys=["customer_id"],
)

# Define feature view
customer_features = FeatureView(
    name="customer_features",
    entities=[customer],
    ttl=timedelta(days=1),
    schema=[
        Field(name="total_purchases", dtype=Int64),
        Field(name="avg_order_value", dtype=Float32),
        Field(name="days_since_last_purchase", dtype=Int64),
    ],
    source=customer_data_source,
)

# Retrieve features for training
store = FeatureStore(repo_path="feature_repo/")
training_df = store.get_historical_features(
    entity_df=entity_df,
    features=[
        "customer_features:total_purchases",
        "customer_features:avg_order_value",
        "customer_features:days_since_last_purchase",
    ],
).to_df()

# Retrieve features for serving
feature_vector = store.get_online_features(
    features=[
        "customer_features:total_purchases",
        "customer_features:avg_order_value",
    ],
    entity_rows=[{"customer_id": 12345}],
).to_dict()
```

## Model Serving with BentoML

```python
import bentoml
from bentoml.io import JSON, NumpyNdarray

# Save model to BentoML
bentoml.sklearn.save_model("churn_model", model)

# Create service
@bentoml.service(
    resources={"cpu": "2", "memory": "4Gi"},
    traffic={"timeout": 30},
)
class ChurnPredictionService:
    
    def __init__(self):
        self.model = bentoml.sklearn.load_model("churn_model:latest")
    
    @bentoml.api
    def predict(self, input_data: np.ndarray) -> np.ndarray:
        return self.model.predict(input_data)
    
    @bentoml.api
    def predict_proba(self, input_data: np.ndarray) -> np.ndarray:
        return self.model.predict_proba(input_data)
```

### Deployment Configuration

```yaml
# bentofile.yaml
service: "service:ChurnPredictionService"
labels:
  owner: ml-team
  stage: production
include:
  - "*.py"
python:
  packages:
    - scikit-learn==1.3.0
    - numpy==1.24.0
docker:
  base_image: python:3.11-slim
```

## CI/CD for ML

### GitHub Actions Workflow

{% raw %}
```yaml
name: ML Pipeline

on:
  push:
    paths:
      - 'src/**'
      - 'data/**'
      - 'dvc.yaml'

jobs:
  train:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install dvc[s3]
      
      - name: Pull data
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: dvc pull
      
      - name: Run pipeline
        run: dvc repro
      
      - name: Push results
        run: |
          dvc push
          git add dvc.lock metrics.json
          git commit -m "Update model metrics"
          git push

  deploy:
    needs: train
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          bentoml build
          bentoml containerize churn_prediction:latest
          docker push $REGISTRY/churn_prediction:latest
```
{% endraw %}

## Model Monitoring

### Drift Detection

```python
from evidently import ColumnMapping
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset, TargetDriftPreset

def check_data_drift(reference_data, current_data):
    column_mapping = ColumnMapping(
        target="churn",
        prediction="prediction",
        numerical_features=["age", "tenure", "monthly_charges"],
        categorical_features=["contract_type", "payment_method"],
    )
    
    report = Report(metrics=[
        DataDriftPreset(),
        TargetDriftPreset(),
    ])
    
    report.run(
        reference_data=reference_data,
        current_data=current_data,
        column_mapping=column_mapping,
    )
    
    # Check if drift detected
    drift_detected = report.as_dict()["metrics"][0]["result"]["dataset_drift"]
    
    if drift_detected:
        alert_team("Data drift detected! Consider retraining.")
    
    return report
```

### Performance Monitoring Dashboard

```python
import prometheus_client as prom

# Define metrics
prediction_counter = prom.Counter(
    'model_predictions_total',
    'Total predictions made',
    ['model_version', 'prediction_class']
)

prediction_latency = prom.Histogram(
    'model_prediction_latency_seconds',
    'Prediction latency in seconds',
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0]
)

# Use in prediction
@prediction_latency.time()
def predict(features):
    result = model.predict(features)
    prediction_counter.labels(
        model_version="v1.2.0",
        prediction_class=str(result[0])
    ).inc()
    return result
```

## Best Practices Checklist

### Data Management
- [ ] Version all datasets with DVC or similar
- [ ] Implement data validation pipelines
- [ ] Document data schemas and lineage

### Model Development
- [ ] Track all experiments with MLflow/W&B
- [ ] Use reproducible environments (Docker/Conda)
- [ ] Implement automated testing

### Deployment
- [ ] A/B testing infrastructure
- [ ] Canary deployments
- [ ] Rollback mechanisms

### Monitoring
- [ ] Data drift detection
- [ ] Model performance metrics
- [ ] Alerting on degradation

## Conclusion

MLOps success requires:

1. **Reproducibility**: Version everything—code, data, models
2. **Automation**: CI/CD for training and deployment
3. **Monitoring**: Detect issues before they impact users
4. **Collaboration**: Enable data scientists and engineers to work together

Start with the basics—experiment tracking and versioning—then progressively add automation and monitoring.

---

*What MLOps challenges have you faced? Share your solutions in the comments!*
