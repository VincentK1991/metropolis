import asyncio
import logging
import os
import subprocess
from datetime import UTC, datetime, timedelta
from typing import Optional

import httpx

from metropolis.config.settings import (
    containerized_agent_config,
    kubernetes_config,
)
from metropolis.services.k8s.client import KubernetesClient
from metropolis.services.k8s.port_forward import PortForwarder
from metropolis.services.k8s.state import PodStateManager
from metropolis.services.k8s.templates import (
    get_pod_template,
    get_pvc_template,
    get_service_template,
)

logger = logging.getLogger(__name__)


class PodManager:
    """Manages Kubernetes pods for containerized agents with Redis-backed state."""

    def __init__(self):
        """Initialize the PodManager with modular components."""
        self.namespace = kubernetes_config.namespace
        self.idle_timeout = timedelta(minutes=kubernetes_config.idle_timeout_minutes)

        self.k8s_client = KubernetesClient(self.namespace)
        self.state_manager = PodStateManager()
        self.port_forwarder = PortForwarder()

    async def initialize(self):
        """Initialize underlying clients."""
        self.k8s_client.initialize()
        await self.state_manager.initialize()

    async def close(self):
        """Close connections."""
        await self.state_manager.close()

    async def _check_http_health(self, url: str, timeout: float = 2.0) -> bool:
        """Check if the HTTP service is responsive."""
        try:
            async with httpx.AsyncClient(timeout=timeout) as http_client:
                response = await http_client.get(url)
                return response.status_code == 200
        except Exception:
            return False

    async def get_or_create_pod(self, user_id: str) -> str:
        """
        Get existing pod URL or create a new pod for the user.

        Args:
            user_id: Unique identifier for the user

        Returns:
            URL to access the pod's service
        """
        # Check if pod already exists and is running
        state = await self.state_manager.get_pod_state(user_id)
        existing_status = state.get("status")
        existing_url = state.get("url")
        existing_pod_name = state.get("pod_name")

        logger.info(
            f"[POD_CHECK] Checking existing pod state: status={existing_status}, "
            f"url={existing_url}, pod_name={existing_pod_name}"
        )

        if existing_status == "running" and existing_url:
            # Verify pod is actually running
            if existing_pod_name:
                try:
                    logger.info(
                        f"[POD_CHECK] Verifying pod {existing_pod_name} "
                        f"is still running..."
                    )
                    pod = self.k8s_client.get_pod(existing_pod_name)

                    if pod and pod.status:
                        phase = pod.status.phase
                        pod_ip = pod.status.pod_ip
                        logger.info(
                            f"[POD_CHECK] Pod status: phase={phase}, ip={pod_ip}"
                        )
                        if phase == "Running":
                            # Ensure port-forward is running if using port-forward
                            use_port_forward = (
                                os.getenv("K8S_USE_PORT_FORWARD", "true").lower()
                                == "true"
                            )
                            if use_port_forward and existing_url.startswith(
                                "http://localhost"
                            ):
                                service_name = f"svc-agent-{user_id}"
                                local_port = 8089

                                # Verify port-forward is actually working via HTTP check
                                is_healthy = await self._check_http_health(
                                    "http://localhost:8089/ping"
                                )

                                if not is_healthy:
                                    logger.warning(
                                        f"[POD_CHECK] Port-forward HTTP health check "
                                        f"failed for {local_port}. "
                                        f"Restarting port-forward."
                                    )
                                    await (
                                        self.port_forwarder.kill_existing_port_forward(
                                            service_name, local_port
                                        )
                                    )
                                    await self.port_forwarder.ensure_port_forward(
                                        service_name, local_port
                                    )

                                    # Wait a moment for service to be ready
                                    await asyncio.sleep(1)

                            # Update last used timestamp
                            await self.state_manager.update_last_used(user_id)
                            logger.info(
                                f"[POD_CHECK] Using existing pod for user "
                                f"{user_id}: {existing_url}"
                            )
                            return existing_url
                        else:
                            logger.warning(
                                f"[POD_CHECK] Pod exists but not running: phase={phase}"
                            )
                    else:
                        # Pod doesn't exist, need to create new one
                        logger.info(
                            f"Pod {existing_pod_name} not found, creating new one"
                        )
                except Exception as e:
                    logger.warning(f"Error checking pod status: {e}", exc_info=True)

        # Need to create new pod
        logger.info(
            f"[POD_CREATE] No existing pod found, creating new pod for user {user_id}"
        )
        return await self._create_pod(user_id)

    async def _create_pod(self, user_id: str) -> str:
        """Create a new pod, service, and PVC for a user."""
        # Check if API key is available
        api_key_secret = containerized_agent_config.anthropic_api_key
        api_key = api_key_secret.get_secret_value() if api_key_secret else ""
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not configured")

        # Generate templates
        pvc_template = get_pvc_template(user_id)
        service_template = get_service_template(user_id)
        pod_template = get_pod_template(user_id, api_key)

        _ = pvc_template["metadata"]["name"]
        service_name = service_template["metadata"]["name"]
        pod_name = pod_template["metadata"]["name"]

        try:
            # Create Resources
            self.k8s_client.create_pvc(pvc_template)
            self.k8s_client.create_service(service_template)
            self.k8s_client.create_pod(pod_template)

            # Store status in Redis
            await self.state_manager.set_pod_starting(user_id, pod_name, service_name)

            # Get service info first so we know if NodePort is available.
            use_port_forward = (
                os.getenv("K8S_USE_PORT_FORWARD", "true").lower() == "true"
            )
            node_port: Optional[int] = None
            minikube_ip: Optional[str] = None

            try:
                service = self.k8s_client.get_service(service_name)
                if service and service.spec and service.spec.ports:
                    node_port = service.spec.ports[0].node_port
                    if node_port and not use_port_forward:
                        minikube_ip = self._get_minikube_ip()
            except Exception as e:
                logger.warning(
                    f"[POD_CREATE] Failed to get service info: {e}, will "
                    f"use port-forward"
                )

            # Wait for pod to be ready and get its IP
            logger.info(f"[POD_CREATE] Waiting for pod {pod_name} to be ready...")
            pod_ip = await self._wait_for_pod_ready(
                pod_name, service_name, node_port, minikube_ip
            )
            logger.info(f"[POD_CREATE] Pod {pod_name} is ready with IP: {pod_ip}")

            # Determine the URL to use for accessing the pod
            if use_port_forward:
                pod_url = "http://localhost:8089"
                logger.info(f"[POD_CREATE] Using port-forward access: {pod_url}")
            elif node_port and minikube_ip:
                pod_url = f"http://{minikube_ip}:{node_port}"
                logger.info(
                    f"[POD_CREATE] Using NodePort access: "
                    f"minikube_ip={minikube_ip}, node_port={node_port}"
                )
            else:
                pod_url = f"http://{pod_ip}:8089"
                logger.warning(
                    f"[POD_CREATE] No port-forward or NodePort, using pod IP "
                    f"(will not be accessible from host): {pod_url}"
                )

            # Update status to running
            await self.state_manager.set_pod_running(user_id, pod_url)
            logger.info(
                f"[POD_CREATE] Pod {pod_name} setup complete. "
                f"Status=running, URL={pod_url}, stored in Redis"
            )

            return pod_url

        except Exception as e:
            logger.error(
                f"Failed to create resources for user {user_id}: {e}",
                exc_info=True,
            )
            raise Exception(f"Failed to create pod: {e}") from e

    def _get_minikube_ip(self) -> str:
        """Try to get Minikube IP for NodePort access."""
        minikube_ip = os.getenv("MINIKUBE_IP", "192.168.49.2")
        try:
            result = subprocess.run(
                ["minikube", "ip"],  # noqa: S607
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0:
                minikube_ip = result.stdout.strip()
        except Exception as e:
            logger.debug(f"Failed to get minikube IP: {e}, using default")
        return minikube_ip

    async def _wait_for_pod_ready(
        self,
        pod_name: str,
        service_name: Optional[str] = None,
        node_port: Optional[int] = None,
        minikube_ip: Optional[str] = None,
        timeout: int = 300,
    ) -> str:
        """Wait for a pod to become ready and the HTTP service to be accessible."""
        start_time = datetime.now(UTC)
        pod_ip: Optional[str] = None

        # First, wait for pod to be running and get its IP
        while True:
            try:
                pod = self.k8s_client.get_pod(pod_name)
                if pod and pod.status and pod.status.phase == "Running":
                    if pod.status.container_statuses:
                        container_status = pod.status.container_statuses[0]
                        if container_status.ready:
                            pod_ip = pod.status.pod_ip
                            if pod_ip:
                                logger.info(
                                    f"Pod {pod_name} container is ready with "
                                    f"IP: {pod_ip}"
                                )
                                break
                            else:
                                logger.warning(
                                    f"Pod {pod_name} is ready but IP not assigned yet"
                                )

                elapsed = (datetime.now(UTC) - start_time).total_seconds()
                if elapsed > timeout:
                    raise TimeoutError(
                        f"Pod {pod_name} did not become ready within {timeout} seconds"
                    )

                await asyncio.sleep(2)

            except Exception as e:
                logger.error(f"Error checking pod status: {e}", exc_info=True)
                await asyncio.sleep(2)

        if pod_ip is None:
            raise RuntimeError(f"Pod {pod_name} ready but IP not assigned")

        # Port-forwarding logic
        use_port_forward = os.getenv("K8S_USE_PORT_FORWARD", "true").lower() == "true"

        if use_port_forward and service_name:
            try:
                await self.port_forwarder.kill_existing_port_forward(service_name, 8089)
                await self.port_forwarder.ensure_port_forward(service_name, 8089)
            except Exception as e:
                logger.error(
                    f"[POD_HEALTH] Failed to establish port-forward for "
                    f"{service_name}: {e}"
                )

        # Health check URL
        if use_port_forward and service_name:
            health_check_url = "http://localhost:8089/ping"
        elif node_port and minikube_ip:
            health_check_url = f"http://{minikube_ip}:{node_port}/ping"
        else:
            logger.info(
                "[POD_HEALTH] No accessible endpoint, skipping HTTP health check. "
                "Waiting 5 seconds for service to initialize..."
            )
            await asyncio.sleep(5)
            return pod_ip

        # Health check loop
        health_check_start = datetime.now(UTC)
        max_health_check_time = 120

        while True:
            try:
                # Use the new health check method if it's a ping to localhost
                if health_check_url == "http://localhost:8089/ping":
                    if await self._check_http_health(health_check_url, timeout=5.0):
                        logger.info(
                            f"[POD_HEALTH] Pod {pod_name} HTTP service is ready"
                        )
                        return pod_ip
                else:
                    # Fallback for other URLs
                    async with httpx.AsyncClient(timeout=5.0) as http_client:
                        response = await http_client.get(health_check_url)
                        if response.status_code == 200:
                            logger.info(
                                f"[POD_HEALTH] Pod {pod_name} HTTP service is ready"
                            )
                            return pod_ip
            except Exception:
                # Ignore health check errors until timeout
                pass

            # Common waiting logic
            elapsed = (datetime.now(UTC) - health_check_start).total_seconds()
            if int(elapsed) % 10 == 0 and elapsed > 0:
                logger.info(
                    f"[POD_HEALTH] Still waiting for pod {pod_name} HTTP service "
                    f"({int(elapsed)}s elapsed)"
                )

            if elapsed > max_health_check_time:
                logger.warning(
                    f"[POD_HEALTH] HTTP service on pod {pod_name} not responding "
                    f"after {max_health_check_time}s. Returning pod IP anyway."
                )
                return pod_ip

            await asyncio.sleep(2)

        return pod_ip

    async def cleanup_idle_pods(self) -> None:
        """Clean up pods that have been idle for longer than the timeout."""
        try:
            idle_users = await self.state_manager.get_idle_pods(self.idle_timeout)

            cleaned_count = 0
            for user_id in idle_users:
                logger.info(f"Pod for user {user_id} has been idle, cleaning up")
                await self._delete_pod(user_id)
                cleaned_count += 1

            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} idle pods")

        except Exception as e:
            logger.error(f"Error during pod cleanup: {e}", exc_info=True)

    async def _delete_pod(self, user_id: str) -> None:
        """Delete pod, service, and associated Redis keys for a user."""
        state = await self.state_manager.get_pod_state(user_id)
        pod_name = state.get("pod_name")
        service_name = state.get("service_name")

        try:
            if pod_name:
                self.k8s_client.delete_pod(pod_name)
            if service_name:
                self.k8s_client.delete_service(service_name)
        except Exception as e:
            logger.error(
                f"Error deleting resources for user {user_id}: {e}",
                exc_info=True,
            )

        await self.state_manager.clear_pod_state(user_id)
        logger.info(f"Cleaned up Redis keys for user {user_id}")
