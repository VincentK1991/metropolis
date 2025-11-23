import logging
from typing import Any, Dict, Optional, cast

from kubernetes import client, config
from kubernetes.client import V1Pod, V1Service
from kubernetes.client.rest import ApiException

from metropolis.config.settings import kubernetes_config

logger = logging.getLogger(__name__)


class KubernetesClient:
    """Handles direct interactions with the Kubernetes API."""

    def __init__(self, namespace: str):
        self.core_v1: Optional[client.CoreV1Api] = None
        self.namespace = namespace

    def initialize(self) -> None:
        """Initialize Kubernetes client configuration."""
        try:
            # Try to load in-cluster config first (if running in K8s)
            try:
                config.load_incluster_config()
                logger.info("Loaded in-cluster Kubernetes config")
            except config.ConfigException:
                # Fall back to kubeconfig file
                if kubernetes_config.context:
                    config.load_kube_config(context=kubernetes_config.context)
                    logger.info(
                        f"Loaded Kubernetes config with context: "
                        f"{kubernetes_config.context}"
                    )
                else:
                    config.load_kube_config()
                    logger.info("Loaded Kubernetes config from default kubeconfig")

            self.core_v1 = client.CoreV1Api()
            logger.info(
                f"Kubernetes client initialized for namespace: {self.namespace}"
            )
        except Exception as e:
            logger.error(f"Failed to initialize Kubernetes client: {e}", exc_info=True)
            raise

    def get_pod(self, pod_name: str) -> Optional[V1Pod]:
        """Get a pod by name."""
        if not self.core_v1:
            raise RuntimeError("Kubernetes client not initialized")
        try:
            pod = self.core_v1.read_namespaced_pod(
                name=pod_name, namespace=self.namespace
            )
            return cast(V1Pod, pod)
        except ApiException as e:
            if e.status == 404:
                return None
            raise

    def get_service(self, service_name: str) -> Optional[V1Service]:
        """Get a service by name."""
        if not self.core_v1:
            raise RuntimeError("Kubernetes client not initialized")
        try:
            service = self.core_v1.read_namespaced_service(
                name=service_name, namespace=self.namespace
            )
            return cast(V1Service, service)
        except ApiException as e:
            if e.status == 404:
                return None
            raise

    def create_pvc(self, pvc_manifest: Dict[str, Any]) -> None:
        """Create a PersistentVolumeClaim."""
        if not self.core_v1:
            raise RuntimeError("Kubernetes client not initialized")
        pvc_name = pvc_manifest["metadata"]["name"]
        try:
            self.core_v1.create_namespaced_persistent_volume_claim(
                namespace=self.namespace, body=pvc_manifest
            )
            logger.info(f"Created PVC: {pvc_name}")
        except ApiException as e:
            if e.status == 409:  # Already exists
                logger.info(f"PVC {pvc_name} already exists")
            else:
                raise

    def create_service(self, service_manifest: Dict[str, Any]) -> None:
        """Create a Service."""
        if not self.core_v1:
            raise RuntimeError("Kubernetes client not initialized")
        service_name = service_manifest["metadata"]["name"]
        try:
            self.core_v1.create_namespaced_service(
                namespace=self.namespace, body=service_manifest
            )
            logger.info(f"Created Service: {service_name}")
        except ApiException as e:
            if e.status == 409:  # Already exists
                logger.info(f"Service {service_name} already exists")
            else:
                raise

    def create_pod(self, pod_manifest: Dict[str, Any]) -> None:
        """Create a Pod."""
        if not self.core_v1:
            raise RuntimeError("Kubernetes client not initialized")
        pod_name = pod_manifest["metadata"]["name"]
        self.core_v1.create_namespaced_pod(namespace=self.namespace, body=pod_manifest)
        logger.info(f"Created Pod: {pod_name}")

    def delete_pod(self, pod_name: str) -> None:
        """Delete a pod."""
        if not self.core_v1:
            raise RuntimeError("Kubernetes client not initialized")
        try:
            self.core_v1.delete_namespaced_pod(
                name=pod_name,
                namespace=self.namespace,
                grace_period_seconds=30,
            )
            logger.info(f"Deleted pod: {pod_name}")
        except ApiException as e:
            if e.status != 404:
                logger.warning(f"Error deleting pod {pod_name}: {e}")

    def delete_service(self, service_name: str) -> None:
        """Delete a service."""
        if not self.core_v1:
            raise RuntimeError("Kubernetes client not initialized")
        try:
            self.core_v1.delete_namespaced_service(
                name=service_name, namespace=self.namespace
            )
            logger.info(f"Deleted service: {service_name}")
        except ApiException as e:
            if e.status != 404:
                logger.warning(f"Error deleting service {service_name}: {e}")
