---
layout: post
title: "Kubernetes Operator Pattern in 2026: Building Production-Grade Controllers"
subtitle: "A practical guide to writing Kubernetes operators with controller-runtime, handling reconciliation loops, and managing complex stateful applications"
date: 2026-05-13 12:00:00
author: "Yun SeokJoon"
header-img: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1600&q=80"
header-mask: 0.4
catalog: true
tags:
  - Kubernetes
  - DevOps
  - Cloud Native
  - Go
  - Operators
---

The Kubernetes operator pattern has become the standard way to encode operational knowledge into code. What started as a way to manage stateful applications like databases has expanded to cover everything from certificate management to ML model deployments. In 2026, operators are so pervasive that most platform teams build at least one custom operator. Here's how to build them well.

![Kubernetes containers](https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200&q=80)
*Photo by [Growtika](https://unsplash.com/@growtika) on Unsplash*

## What Is a Kubernetes Operator?

An operator is a combination of a **Custom Resource Definition (CRD)** and a **controller**:

- **CRD**: Extends the Kubernetes API with your custom resource types
- **Controller**: Watches those resources and reconciles actual state with desired state

The reconciliation loop is the heart of any operator:

```
Observe desired state (from CRD spec)
    ↓
Observe actual state (from cluster, external APIs)
    ↓
Compute diff
    ↓
Apply changes to make actual = desired
    ↓
Update status subresource
    ↓
Return (re-queue if needed)
```

This loop runs continuously. Operators don't use webhooks or event-driven pushes — they periodically reconcile, which makes them resilient to missed events.

## Scaffolding with Operator SDK

The fastest way to start is with Operator SDK (backed by Red Hat) or Kubebuilder (backed by the Kubernetes project). Both generate the same scaffolding:

```bash
# Install operator-sdk
brew install operator-sdk

# Create a new operator project
mkdir database-operator && cd database-operator
operator-sdk init --domain mycompany.com --repo github.com/mycompany/database-operator

# Create a new API (CRD + controller)
operator-sdk create api \
  --group database \
  --version v1alpha1 \
  --kind ManagedDatabase \
  --resource \
  --controller
```

This generates:

```
database-operator/
├── api/
│   └── v1alpha1/
│       ├── manageddatabase_types.go     # CRD schema
│       └── zz_generated.deepcopy.go    # auto-generated
├── config/
│   ├── crd/                            # CRD YAML
│   ├── rbac/                           # RBAC rules
│   └── manager/                        # Deployment YAML
├── controllers/
│   └── manageddatabase_controller.go   # Your reconciler
└── main.go                             # Entry point
```

## Defining Your CRD Types

```go
// api/v1alpha1/manageddatabase_types.go

package v1alpha1

import (
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ManagedDatabaseSpec defines the desired state
type ManagedDatabaseSpec struct {
    // +kubebuilder:validation:Enum=postgres;mysql;redis
    Engine string `json:"engine"`
    
    // +kubebuilder:validation:Minimum=1
    // +kubebuilder:validation:Maximum=100
    StorageGB int `json:"storageGB"`
    
    // +kubebuilder:validation:Enum=t3.micro;t3.small;t3.medium;t3.large
    InstanceClass string `json:"instanceClass"`
    
    // +optional
    // +kubebuilder:default=false
    MultiAZ bool `json:"multiAZ,omitempty"`
    
    // +optional
    BackupRetentionDays int `json:"backupRetentionDays,omitempty"`
}

// ManagedDatabaseStatus defines the observed state
type ManagedDatabaseStatus struct {
    // Conditions represent the latest available observations
    // +optional
    // +listType=map
    // +listMapKey=type
    Conditions []metav1.Condition `json:"conditions,omitempty"`
    
    // Phase summarizes the overall state
    // +optional
    // +kubebuilder:validation:Enum=Pending;Provisioning;Ready;Failed;Deleting
    Phase string `json:"phase,omitempty"`
    
    // Endpoint is the connection endpoint
    // +optional
    Endpoint string `json:"endpoint,omitempty"`
    
    // ProviderID is the cloud provider resource ID (e.g., RDS instance ID)
    // +optional
    ProviderID string `json:"providerID,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Engine",type=string,JSONPath=`.spec.engine`
// +kubebuilder:printcolumn:name="Phase",type=string,JSONPath=`.status.phase`
// +kubebuilder:printcolumn:name="Endpoint",type=string,JSONPath=`.status.endpoint`
// +kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`
type ManagedDatabase struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   ManagedDatabaseSpec   `json:"spec,omitempty"`
    Status ManagedDatabaseStatus `json:"status,omitempty"`
}
```

The `// +kubebuilder:*` comments are **markers** that generate validation and RBAC rules. Run `make generate manifests` to regenerate after changes.

## Writing the Reconciler

```go
// controllers/manageddatabase_controller.go

package controllers

import (
    "context"
    "fmt"
    
    apierrors "k8s.io/apimachinery/pkg/api/errors"
    "k8s.io/apimachinery/pkg/api/meta"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
    "sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
    "sigs.k8s.io/controller-runtime/pkg/log"
    
    databasev1alpha1 "github.com/mycompany/database-operator/api/v1alpha1"
)

const (
    finalizerName = "database.mycompany.com/finalizer"
    
    conditionTypeReady       = "Ready"
    conditionTypeProvisioned = "Provisioned"
)

type ManagedDatabaseReconciler struct {
    client.Client
    CloudProvider CloudProviderInterface
}

func (r *ManagedDatabaseReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    logger := log.FromContext(ctx)
    
    // Fetch the resource
    db := &databasev1alpha1.ManagedDatabase{}
    if err := r.Get(ctx, req.NamespacedName, db); err != nil {
        if apierrors.IsNotFound(err) {
            // Object deleted before we could reconcile — ignore
            return ctrl.Result{}, nil
        }
        return ctrl.Result{}, fmt.Errorf("fetching ManagedDatabase: %w", err)
    }
    
    // Handle deletion
    if db.DeletionTimestamp != nil {
        return r.reconcileDelete(ctx, db)
    }
    
    // Add finalizer if not present
    if !controllerutil.ContainsFinalizer(db, finalizerName) {
        controllerutil.AddFinalizer(db, finalizerName)
        if err := r.Update(ctx, db); err != nil {
            return ctrl.Result{}, fmt.Errorf("adding finalizer: %w", err)
        }
        return ctrl.Result{Requeue: true}, nil
    }
    
    // Reconcile the desired state
    return r.reconcileNormal(ctx, db)
}

func (r *ManagedDatabaseReconciler) reconcileNormal(
    ctx context.Context, 
    db *databasev1alpha1.ManagedDatabase,
) (ctrl.Result, error) {
    logger := log.FromContext(ctx)
    
    // Check if database already exists in cloud provider
    existingDB, err := r.CloudProvider.GetDatabase(ctx, db.Status.ProviderID)
    if err != nil && !IsNotFoundError(err) {
        return ctrl.Result{}, fmt.Errorf("checking cloud provider: %w", err)
    }
    
    if existingDB == nil {
        // Database doesn't exist — create it
        logger.Info("Creating database", "engine", db.Spec.Engine)
        
        r.setPhase(db, "Provisioning")
        if err := r.Status().Update(ctx, db); err != nil {
            return ctrl.Result{}, err
        }
        
        providerID, err := r.CloudProvider.CreateDatabase(ctx, CreateDatabaseInput{
            Name:          db.Name,
            Engine:        db.Spec.Engine,
            StorageGB:     db.Spec.StorageGB,
            InstanceClass: db.Spec.InstanceClass,
            MultiAZ:       db.Spec.MultiAZ,
        })
        if err != nil {
            r.setCondition(db, conditionTypeProvisioned, metav1.ConditionFalse, 
                "CreateFailed", err.Error())
            r.setPhase(db, "Failed")
            _ = r.Status().Update(ctx, db)
            return ctrl.Result{}, fmt.Errorf("creating database: %w", err)
        }
        
        db.Status.ProviderID = providerID
        // Requeue to check provisioning status
        return ctrl.Result{RequeueAfter: 30 * time.Second}, r.Status().Update(ctx, db)
    }
    
    // Database exists — check status
    if !existingDB.IsAvailable() {
        logger.Info("Database still provisioning", "status", existingDB.Status)
        r.setPhase(db, "Provisioning")
        _ = r.Status().Update(ctx, db)
        return ctrl.Result{RequeueAfter: 30 * time.Second}, nil
    }
    
    // Database is ready!
    db.Status.Endpoint = existingDB.Endpoint
    r.setPhase(db, "Ready")
    r.setCondition(db, conditionTypeReady, metav1.ConditionTrue, "DatabaseReady", 
        "Database is available and accepting connections")
    
    return ctrl.Result{RequeueAfter: 5 * time.Minute}, r.Status().Update(ctx, db)
}

func (r *ManagedDatabaseReconciler) reconcileDelete(
    ctx context.Context,
    db *databasev1alpha1.ManagedDatabase,
) (ctrl.Result, error) {
    if !controllerutil.ContainsFinalizer(db, finalizerName) {
        return ctrl.Result{}, nil // already cleaned up
    }
    
    // Delete from cloud provider
    if db.Status.ProviderID != "" {
        if err := r.CloudProvider.DeleteDatabase(ctx, db.Status.ProviderID); err != nil {
            return ctrl.Result{}, fmt.Errorf("deleting from cloud provider: %w", err)
        }
    }
    
    // Remove finalizer
    controllerutil.RemoveFinalizer(db, finalizerName)
    return ctrl.Result{}, r.Update(ctx, db)
}
```

## Key Patterns for Production Operators

### 1. Status Conditions

Always use the standard `metav1.Condition` type for status conditions. This is the Kubernetes-native way to communicate state:

```go
func (r *Reconciler) setCondition(
    obj *databasev1alpha1.ManagedDatabase,
    condType string,
    status metav1.ConditionStatus,
    reason, message string,
) {
    meta.SetStatusCondition(&obj.Status.Conditions, metav1.Condition{
        Type:               condType,
        Status:             status,
        Reason:             reason,
        Message:            message,
        LastTransitionTime: metav1.Now(),
        ObservedGeneration: obj.Generation,
    })
}
```

### 2. Idempotency is Everything

Your reconciler will run multiple times for the same resource. Design accordingly:

```go
// ❌ Wrong: Not idempotent
func createDatabase() {
    db.Create(name)  // Will error on second run: "already exists"
}

// ✅ Correct: Check and create if needed
func ensureDatabase(ctx context.Context, name string) error {
    existing, err := provider.GetDatabase(ctx, name)
    if err != nil && !IsNotFound(err) {
        return err
    }
    if existing != nil {
        return nil  // already exists, nothing to do
    }
    return provider.CreateDatabase(ctx, name)
}
```

### 3. Use Exponential Backoff for Requeue

```go
// On transient error: requeue with backoff
return ctrl.Result{RequeueAfter: 30 * time.Second}, nil

// On permanent error: don't requeue (fix the spec)
return ctrl.Result{}, nil

// On "still waiting": requeue to poll
return ctrl.Result{RequeueAfter: 10 * time.Second}, nil

// Completed successfully: periodic health check
return ctrl.Result{RequeueAfter: 5 * time.Minute}, nil
```

### 4. Watch Related Resources

```go
func (r *ManagedDatabaseReconciler) SetupWithManager(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&databasev1alpha1.ManagedDatabase{}).
        // Watch Secrets that reference this DB
        Watches(
            &corev1.Secret{},
            handler.EnqueueRequestsFromMapFunc(r.secretToDatabase),
        ).
        // Watch owned resources (Deployments, Services this operator creates)
        Owns(&corev1.ConfigMap{}).
        // Rate limit reconciliation
        WithOptions(controller.Options{
            MaxConcurrentReconciles: 5,
            RateLimiter: workqueue.NewItemExponentialFailureRateLimiter(
                5*time.Millisecond,
                1000*time.Second,
            ),
        }).
        Complete(r)
}
```

## Testing Your Operator

```go
// controllers/manageddatabase_controller_test.go

package controllers_test

import (
    "context"
    "time"
    
    . "github.com/onsi/ginkgo/v2"
    . "github.com/onsi/gomega"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "sigs.k8s.io/controller-runtime/pkg/client"
    
    databasev1alpha1 "github.com/mycompany/database-operator/api/v1alpha1"
)

var _ = Describe("ManagedDatabase Controller", func() {
    Context("When creating a ManagedDatabase", func() {
        It("Should provision the database and update status", func() {
            ctx := context.Background()
            
            db := &databasev1alpha1.ManagedDatabase{
                ObjectMeta: metav1.ObjectMeta{
                    Name:      "test-db",
                    Namespace: "default",
                },
                Spec: databasev1alpha1.ManagedDatabaseSpec{
                    Engine:        "postgres",
                    StorageGB:     10,
                    InstanceClass: "t3.micro",
                },
            }
            
            Expect(k8sClient.Create(ctx, db)).To(Succeed())
            
            // Wait for reconciliation
            Eventually(func() string {
                _ = k8sClient.Get(ctx, client.ObjectKeyFromObject(db), db)
                return db.Status.Phase
            }, time.Second*30, time.Second).Should(Equal("Ready"))
            
            Expect(db.Status.Endpoint).NotTo(BeEmpty())
        })
    })
})
```

The `envtest` package from controller-runtime runs a real Kubernetes API server in-process for tests — no cluster needed.

## Conclusion

Kubernetes operators encode operational expertise that would otherwise live in runbooks, Slack messages, and tribal knowledge. The controller pattern — observe, compare, reconcile — is elegant once internalized.

The controller-runtime library has matured to the point where the boilerplate is manageable, and the Operator SDK adds scaffolding that gets you to a working operator in minutes. The hard part isn't the code; it's the operational model: what does "desired state" mean for your resource? What compensations are needed on failure? How does deletion work?

Answer those questions clearly, implement them in your reconciler, and you'll have infrastructure that manages itself.

---

*Related: [Service Mesh: Cilium vs Istio in 2026](/2026/05/09/service-mesh-cilium-vs-istio-2026/)*
