"""Kubernetes Pod Manager for dynamic containerized agent lifecycle management."""

import asyncio
import logging
import os
from datetime import UTC, datetime, timedelta
from typing import Optional

import httpx
import redis.asyncio as aioredis
from kubernetes import client, config
from kubernetes.client.rest import ApiException

from metropolis.config.settings import (
    containerized_agent_config,
    kubernetes_config,
    redis_config,
)

logger = logging.getLogger(__name__)

# Redis key patterns
REDIS_KEY_POD_STATUS = "pod:{user_id}:status"
REDIS_KEY_POD_URL = "pod:{user_id}:url"
REDIS_KEY_LAST_USED = "pod:{user_id}:last_used"
REDIS_KEY_POD_NAME = "pod:{user_id}:pod_name"
REDIS_KEY_SERVICE_NAME = "pod:{user_id}:service_name"


class PodManager:
    """Manages Kubernetes pods for containerized agents with Redis-backed state."""

    def __init__(self):
        """Initialize the PodManager with Redis and Kubernetes clients."""
        self.redis_client: Optional[aioredis.Redis] = None
        self.core_v1: Optional[client.CoreV1Api] = None
        self.namespace = kubernetes_config.namespace
        self.idle_timeout = timedelta(minutes=kubernetes_config.idle_timeout_minutes)

    async def initialize(self):
        """Initialize Redis and Kubernetes clients."""
        # Initialize Redis client
        redis_kwargs = {
            "host": redis_config.host,
            "port": redis_config.port,
            "db": redis_config.db,
            "decode_responses": True,
        }
        if redis_config.password:
            redis_kwargs["password"] = redis_config.password

        self.redis_client = aioredis.Redis(**redis_kwargs)
        logger.info(
            f"Redis client initialized: {redis_config.host}:{redis_config.port}"
        )

        # Initialize Kubernetes client
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
                        f"Loaded Kubernetes config with context: {kubernetes_config.context}"
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

    async def close(self):
        """Close Redis connection."""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Redis client closed")

    def _get_redis_key(self, pattern: str, user_id: str) -> str:
        """Format Redis key with user_id."""
        return pattern.format(user_id=user_id)

    async def get_or_create_pod(self, user_id: str) -> str:
        """
        Get existing pod URL or create a new pod for the user.

        Args:
            user_id: Unique identifier for the user

        Returns:
            URL to access the pod's service

        Raises:
            Exception: If pod creation fails
        """
        if not self.redis_client or not self.core_v1:
            raise RuntimeError("PodManager not initialized. Call initialize() first.")

        # Check if pod already exists and is running
        status_key = self._get_redis_key(REDIS_KEY_POD_STATUS, user_id)
        url_key = self._get_redis_key(REDIS_KEY_POD_URL, user_id)
        pod_name_key = self._get_redis_key(REDIS_KEY_POD_NAME, user_id)

        existing_status = await self.redis_client.get(status_key)
        existing_url = await self.redis_client.get(url_key)
        existing_pod_name = await self.redis_client.get(pod_name_key)

        logger.info(
            f"[POD_CHECK] Checking existing pod state: status={existing_status}, "
            f"url={existing_url}, pod_name={existing_pod_name}"
        )

        if existing_status == "running" and existing_url:
            # Verify pod is actually running
            if existing_pod_name:
                try:
                    logger.info(
                        f"[POD_CHECK] Verifying pod {existing_pod_name} is still running..."
                    )
                    pod = self.core_v1.read_namespaced_pod(
                        name=existing_pod_name, namespace=self.namespace
                    )
                    logger.info(
                        f"[POD_CHECK] Pod status: phase={pod.status.phase}, "
                        f"ip={pod.status.pod_ip}"
                    )
                    if pod.status.phase == "Running":
                        # Ensure port-forward is running if using port-forward
                        use_port_forward = (
                            os.getenv("K8S_USE_PORT_FORWARD", "true").lower() == "true"
                        )
                        if use_port_forward and existing_url.startswith(
                            "http://localhost"
                        ):
                            # Extract service name from pod labels or use default pattern
                            service_name = f"svc-agent-{user_id}"
                            local_port = 8089
                            # Kill any stale port-forwards first
                            await self._kill_existing_port_forward(
                                service_name, local_port
                            )
                            await self._ensure_port_forward(service_name, local_port)

                            # Verify port-forward is actually working
                            import socket

                            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                            sock.settimeout(2)
                            result = sock.connect_ex(("127.0.0.1", local_port))
                            sock.close()

                            if result != 0:
                                logger.error(
                                    f"[POD_CHECK] Port-forward verification failed: "
                                    f"port {local_port} is not accessible. "
                                    f"Pod exists but cannot be reached."
                                )
                                # Don't return the URL - force pod recreation or wait
                                raise Exception(
                                    f"Port-forward to {service_name} is not working. "
                                    f"Port {local_port} is not accessible."
                                )

                            logger.info(
                                f"[POD_CHECK] Port-forward verified and working for {service_name}"
                            )

                        # Update last used timestamp
                        await self.update_last_used(user_id)
                        logger.info(
                            f"[POD_CHECK] Using existing pod for user {user_id}: {existing_url}"
                        )
                        return existing_url
                    else:
                        logger.warning(
                            f"[POD_CHECK] Pod exists but not running: phase={pod.status.phase}"
                        )
                except ApiException as e:
                    if e.status == 404:
                        # Pod doesn't exist, need to create new one
                        logger.info(
                            f"Pod {existing_pod_name} not found, creating new one"
                        )
                    else:
                        logger.warning(f"Error checking pod status: {e}", exc_info=True)

        # Need to create new pod
        logger.info(
            f"[POD_CREATE] No existing pod found, creating new pod for user {user_id}"
        )
        return await self._create_pod(user_id)

    async def _create_pod(self, user_id: str) -> str:
        """
        Create a new pod, service, and PVC for a user.

        Args:
            user_id: Unique identifier for the user

        Returns:
            URL to access the pod's service

        Raises:
            Exception: If creation fails
        """
        from metropolis.services.k8s_templates import (
            get_pod_template,
            get_pvc_template,
            get_service_template,
        )

        # Check if API key is available
        api_key = containerized_agent_config.anthropic_api_key
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not configured")

        # Generate templates
        pvc_template = get_pvc_template(user_id)
        service_template = get_service_template(user_id)
        pod_template = get_pod_template(user_id, api_key)

        pvc_name = pvc_template["metadata"]["name"]
        service_name = service_template["metadata"]["name"]
        pod_name = pod_template["metadata"]["name"]

        try:
            # Create or get PVC
            try:
                self.core_v1.create_namespaced_persistent_volume_claim(
                    namespace=self.namespace, body=pvc_template
                )
                logger.info(f"Created PVC: {pvc_name}")
            except ApiException as e:
                if e.status == 409:  # Already exists
                    logger.info(f"PVC {pvc_name} already exists")
                else:
                    raise

            # Create Service
            try:
                self.core_v1.create_namespaced_service(
                    namespace=self.namespace, body=service_template
                )
                logger.info(f"Created Service: {service_name}")
            except ApiException as e:
                if e.status == 409:  # Already exists
                    logger.info(f"Service {service_name} already exists")
                else:
                    raise

            # Create Pod
            self.core_v1.create_namespaced_pod(
                namespace=self.namespace, body=pod_template
            )
            logger.info(f"Created Pod: {pod_name}")

            # Store status in Redis
            status_key = self._get_redis_key(REDIS_KEY_POD_STATUS, user_id)
            url_key = self._get_redis_key(REDIS_KEY_POD_URL, user_id)
            pod_name_key = self._get_redis_key(REDIS_KEY_POD_NAME, user_id)
            service_name_key = self._get_redis_key(REDIS_KEY_SERVICE_NAME, user_id)

            await self.redis_client.set(status_key, "starting")
            await self.redis_client.set(pod_name_key, pod_name)
            await self.redis_client.set(service_name_key, service_name)
            await self.update_last_used(user_id)

            # Get service info first so we know if NodePort is available.
            # For Minikube + Docker driver we normally rely on port-forwarding.
            use_port_forward = (
                os.getenv("K8S_USE_PORT_FORWARD", "true").lower() == "true"
            )
            node_port: Optional[int] = None
            minikube_ip: Optional[str] = None

            try:
                service = self.core_v1.read_namespaced_service(
                    name=service_name, namespace=self.namespace
                )
                if service.spec.ports:
                    node_port = service.spec.ports[0].node_port
                    if node_port and not use_port_forward:
                        # Try to get Minikube IP for NodePort access
                        minikube_ip = os.getenv("MINIKUBE_IP", "192.168.49.2")
                        try:
                            import subprocess

                            result = subprocess.run(
                                ["minikube", "ip"],
                                capture_output=True,
                                text=True,
                                timeout=5,
                            )
                            if result.returncode == 0:
                                minikube_ip = result.stdout.strip()
                        except Exception:
                            # If this fails we'll just use the default IP/env var
                            pass
            except Exception as e:
                logger.warning(
                    f"[POD_CREATE] Failed to get service info: {e}, will "
                    f"use port-forward"
                )

            # Wait for pod to be ready and get its IP. Any port-forwarding needed
            # for HTTP health checks will be handled inside _wait_for_pod_ready
            # *after* the pod is Running to avoid the "pod is not running" error
            # from kubectl port-forward.
            logger.info(f"[POD_CREATE] Waiting for pod {pod_name} to be ready...")
            pod_ip = await self._wait_for_pod_ready(
                pod_name, service_name, node_port, minikube_ip
            )
            logger.info(f"[POD_CREATE] Pod {pod_name} is ready with IP: {pod_ip}")

            # Determine the URL to use for accessing the pod
            if use_port_forward:
                # Use port-forwarding via localhost
                pod_url = "http://localhost:8089"
                logger.info(f"[POD_CREATE] Using port-forward access: {pod_url}")
            elif node_port and minikube_ip:
                # Try NodePort (may not work with Docker driver)
                pod_url = f"http://{minikube_ip}:{node_port}"
                logger.info(
                    f"[POD_CREATE] Using NodePort access: "
                    f"minikube_ip={minikube_ip}, node_port={node_port}"
                )
            else:
                # Fallback to pod IP (won't work from host)
                pod_url = f"http://{pod_ip}:8089"
                logger.warning(
                    f"[POD_CREATE] No port-forward or NodePort, using pod IP "
                    f"(will not be accessible from host): {pod_url}"
                )

            # Update status to running
            await self.redis_client.set(status_key, "running")
            await self.redis_client.set(url_key, pod_url)  # Update with pod URL
            logger.info(
                f"[POD_CREATE] Pod {pod_name} setup complete. "
                f"Status=running, URL={pod_url}, stored in Redis"
            )

            return pod_url

        except ApiException as e:
            logger.error(
                f"Failed to create resources for user {user_id}: {e}", exc_info=True
            )
            raise Exception(f"Failed to create pod: {e.reason}")

    async def _wait_for_pod_ready(
        self,
        pod_name: str,
        service_name: Optional[str] = None,
        node_port: Optional[int] = None,
        minikube_ip: Optional[str] = None,
        timeout: int = 300,
    ) -> str:
        """
        Wait for a pod to become ready and the HTTP service to be accessible.

        Args:
            pod_name: Name of the pod
            timeout: Maximum time to wait in seconds

        Returns:
            Pod IP address

        Raises:
            TimeoutError: If pod doesn't become ready within timeout
        """
        start_time = datetime.now(UTC)
        pod_ip: Optional[str] = None

        # First, wait for pod to be running and get its IP
        logger.info(f"Waiting for pod {pod_name} to be running...")
        while True:
            try:
                pod = self.core_v1.read_namespaced_pod(
                    name=pod_name, namespace=self.namespace
                )

                if pod.status.phase == "Running":
                    # Check if container is ready
                    if pod.status.container_statuses:
                        container_status = pod.status.container_statuses[0]
                        if container_status.ready:
                            pod_ip = pod.status.pod_ip
                            if pod_ip:
                                logger.info(
                                    f"Pod {pod_name} container is ready with IP: {pod_ip}"
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

                await asyncio.sleep(2)  # Check every 2 seconds

            except ApiException as e:
                if e.status == 404:
                    # Pod not found yet, wait a bit
                    await asyncio.sleep(1)
                else:
                    logger.error(f"Error checking pod status: {e}", exc_info=True)
                    raise

        # Now wait for the HTTP service to be accessible from the host.
        # For Minikube with Docker driver we typically rely on port-forward.
        use_port_forward = os.getenv("K8S_USE_PORT_FORWARD", "true").lower() == "true"

        # If using port-forward, ensure it's running *after* the pod is ready.
        if use_port_forward and service_name:
            try:
                # Kill any stale port-forwards first, then start a fresh one
                await self._kill_existing_port_forward(service_name, 8089)
                await self._ensure_port_forward(service_name, 8089)
            except Exception as e:
                logger.error(
                    f"[POD_HEALTH] Failed to establish port-forward for {service_name}: {e}"
                )

        # Decide which URL to probe for health.
        if use_port_forward and service_name:
            # Use localhost via port-forward
            health_check_url = "http://localhost:8089/ping"
            logger.info(
                f"[POD_HEALTH] Checking HTTP service via port-forward: {health_check_url}"
            )
        elif node_port and minikube_ip:
            # Use NodePort (may not be available with Docker driver)
            health_check_url = f"http://{minikube_ip}:{node_port}/ping"
            logger.info(
                f"[POD_HEALTH] Checking HTTP service via NodePort: {health_check_url}"
            )
        else:
            # No accessible endpoint - can't check health from host.
            # Just wait a bit for the service to start, then return.
            logger.info(
                f"[POD_HEALTH] No accessible endpoint, skipping HTTP health check. "
                f"Pod IP {pod_ip} is not accessible from host. "
                f"Waiting 5 seconds for service to initialize..."
            )
            await asyncio.sleep(5)  # Give service a moment to start
            return pod_ip

        # Health check loop (only reached if we have an accessible endpoint)
        health_check_start = datetime.now(UTC)
        max_health_check_time = 120  # 2 minutes

        while True:
            try:
                async with httpx.AsyncClient(timeout=5.0) as http_client:
                    response = await http_client.get(health_check_url)
                    if response.status_code == 200:
                        logger.info(
                            f"[POD_HEALTH] Pod {pod_name} HTTP service is ready "
                            f"and responding"
                        )
                        return pod_ip
            except (
                httpx.ConnectError,
                httpx.TimeoutException,
                httpx.RequestError,
                httpx.RemoteProtocolError,
            ) as e:
                # Service not ready yet, continue waiting
                elapsed = (datetime.now(UTC) - health_check_start).total_seconds()

                # Log progress every 10 seconds
                if int(elapsed) % 10 == 0 and elapsed > 0:
                    logger.info(
                        f"[POD_HEALTH] Still waiting for pod {pod_name} HTTP service "
                        f"({int(elapsed)}s elapsed, error: {type(e).__name__})"
                    )

                if elapsed > max_health_check_time:
                    logger.warning(
                        f"[POD_HEALTH] HTTP service on pod {pod_name} not responding "
                        f"after {max_health_check_time}s: {e}. "
                        f"Returning pod IP anyway - service may still be starting."
                    )
                    # Still return the IP - the service might be starting
                    return pod_ip

                await asyncio.sleep(2)  # Check every 2 seconds
            except Exception as e:
                elapsed = (datetime.now(UTC) - health_check_start).total_seconds()
                logger.warning(
                    f"[POD_HEALTH] Unexpected error checking HTTP health "
                    f"({int(elapsed)}s elapsed): {e}",
                    exc_info=True,
                )
                if elapsed > max_health_check_time:
                    return pod_ip
                await asyncio.sleep(2)

        return pod_ip

    async def _kill_existing_port_forward(
        self, service_name: str, local_port: int = 8089
    ) -> None:
        """
        Kill any existing port-forward processes for a service.

        Args:
            service_name: Name of the service
            local_port: Local port to forward to
        """
        import subprocess

        try:
            # Find and kill existing port-forward processes
            result = subprocess.run(
                [
                    "pgrep",
                    "-f",
                    f"kubectl.*port-forward.*{service_name}.*{local_port}",
                ],
                capture_output=True,
                text=True,
                timeout=2,
            )
            if result.returncode == 0:
                pids = result.stdout.strip().split("\n")
                for pid in pids:
                    if pid.strip():
                        try:
                            subprocess.run(
                                ["kill", "-9", pid.strip()],
                                capture_output=True,
                                timeout=1,
                            )
                            logger.info(
                                f"[PORT_FORWARD] Killed existing port-forward "
                                f"process {pid.strip()} for {service_name}"
                            )
                        except Exception:
                            pass
        except Exception:
            pass  # pgrep might not be available or command failed

    async def _ensure_port_forward(
        self, service_name: str, local_port: int = 8089
    ) -> None:
        """
        Ensure port-forward is running for a service.

        Args:
            service_name: Name of the service
            local_port: Local port to forward to
        """
        import subprocess

        # Check if port-forward is already running and actually working
        try:
            result = subprocess.run(
                [
                    "pgrep",
                    "-f",
                    f"kubectl.*port-forward.*{service_name}.*{local_port}",
                ],
                capture_output=True,
                timeout=2,
            )
            if result.returncode == 0:
                # Process exists, verify port is actually listening
                import socket

                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(1)
                result = sock.connect_ex(("127.0.0.1", local_port))
                sock.close()

                if result == 0:
                    logger.info(
                        f"[PORT_FORWARD] Port-forward already exists and is working "
                        f"for {service_name}"
                    )
                    return
                else:
                    logger.warning(
                        f"[PORT_FORWARD] Port-forward process exists but port "
                        f"{local_port} is not listening, restarting..."
                    )
                    # Kill the dead process
                    await self._kill_existing_port_forward(service_name, local_port)
        except Exception:
            pass  # pgrep might not be available or command failed

        # Start port-forward in background
        logger.info(
            f"[PORT_FORWARD] Starting port-forward for {service_name} "
            f"on localhost:{local_port}"
        )
        try:
            process = subprocess.Popen(
                [
                    "kubectl",
                    "port-forward",
                    f"svc/{service_name}",
                    f"{local_port}:8089",
                    "--address=127.0.0.1",
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            # Give it a moment to start and check if it's still running
            await asyncio.sleep(3)

            # Check if process is still running
            if process.poll() is not None:
                # Process exited, read error
                stdout, stderr = process.communicate()
                error_msg = stderr.decode() if stderr else stdout.decode()
                logger.error(
                    f"[PORT_FORWARD] Port-forward process exited immediately: {error_msg}"
                )
                raise Exception(f"Port-forward failed: {error_msg}")

            # Verify port-forward is actually working by checking if port is listening
            import socket

            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex(("127.0.0.1", local_port))
            sock.close()

            if result != 0:
                logger.error(
                    f"[PORT_FORWARD] Port {local_port} is not listening after starting, "
                    f"port-forward failed. Process PID: {process.pid}"
                )
                # Try to read any error output
                try:
                    stdout, stderr = process.communicate(timeout=1)
                    error_msg = stderr.decode() if stderr else stdout.decode()
                    if error_msg:
                        logger.error(f"[PORT_FORWARD] Error output: {error_msg}")
                except Exception:
                    pass
                raise Exception(
                    f"Port-forward started but port {local_port} is not listening"
                )
            else:
                logger.info(
                    f"[PORT_FORWARD] Port-forward started successfully for {service_name} "
                    f"on localhost:{local_port} (PID: {process.pid})"
                )
        except Exception as e:
            logger.error(
                f"[PORT_FORWARD] Failed to start port-forward: {e}. "
                f"Please start manually: kubectl port-forward svc/{service_name} "
                f"{local_port}:8089 --address=127.0.0.1",
                exc_info=True,
            )
            raise

    async def update_last_used(self, user_id: str):
        """Update the last used timestamp for a user's pod."""
        if not self.redis_client:
            return

        last_used_key = self._get_redis_key(REDIS_KEY_LAST_USED, user_id)
        now = datetime.now(UTC).isoformat()
        await self.redis_client.set(last_used_key, now)

    async def cleanup_idle_pods(self):
        """
        Clean up pods that have been idle for longer than the timeout.

        This should be called periodically (e.g., every minute).
        """
        if not self.redis_client or not self.core_v1:
            return

        try:
            # Get all pod keys
            pattern = REDIS_KEY_LAST_USED.format(user_id="*")
            keys = await self.redis_client.keys(pattern)

            now = datetime.now(UTC)
            cleaned_count = 0

            for key in keys:
                # Extract user_id from key (format: pod:{user_id}:last_used)
                user_id = key.split(":")[1]

                last_used_str = await self.redis_client.get(key)
                if not last_used_str:
                    continue

                try:
                    last_used = datetime.fromisoformat(
                        last_used_str.replace("Z", "+00:00")
                    )
                    if last_used.tzinfo is None:
                        last_used = last_used.replace(tzinfo=UTC)

                    idle_duration = now - last_used

                    if idle_duration > self.idle_timeout:
                        logger.info(
                            f"Pod for user {user_id} has been idle for {idle_duration}, cleaning up"
                        )
                        await self._delete_pod(user_id)
                        cleaned_count += 1
                except (ValueError, TypeError) as e:
                    logger.warning(
                        f"Failed to parse last_used timestamp for user {user_id}: {e}"
                    )
                    continue

            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} idle pods")

        except Exception as e:
            logger.error(f"Error during pod cleanup: {e}", exc_info=True)

    async def _delete_pod(self, user_id: str):
        """
        Delete pod, service, and associated Redis keys for a user.

        Note: PVC is NOT deleted to preserve user data.

        Args:
            user_id: Unique identifier for the user
        """
        pod_name_key = self._get_redis_key(REDIS_KEY_POD_NAME, user_id)
        service_name_key = self._get_redis_key(REDIS_KEY_SERVICE_NAME, user_id)

        pod_name = await self.redis_client.get(pod_name_key)
        service_name = await self.redis_client.get(service_name_key)

        try:
            # Delete pod
            if pod_name:
                try:
                    self.core_v1.delete_namespaced_pod(
                        name=pod_name,
                        namespace=self.namespace,
                        grace_period_seconds=30,
                    )
                    logger.info(f"Deleted pod: {pod_name}")
                except ApiException as e:
                    if e.status != 404:  # Ignore if already deleted
                        logger.warning(f"Error deleting pod {pod_name}: {e}")

            # Delete service
            if service_name:
                try:
                    self.core_v1.delete_namespaced_service(
                        name=service_name, namespace=self.namespace
                    )
                    logger.info(f"Deleted service: {service_name}")
                except ApiException as e:
                    if e.status != 404:  # Ignore if already deleted
                        logger.warning(f"Error deleting service {service_name}: {e}")

        except Exception as e:
            logger.error(
                f"Error deleting resources for user {user_id}: {e}", exc_info=True
            )

        # Clean up Redis keys
        status_key = self._get_redis_key(REDIS_KEY_POD_STATUS, user_id)
        url_key = self._get_redis_key(REDIS_KEY_POD_URL, user_id)
        last_used_key = self._get_redis_key(REDIS_KEY_LAST_USED, user_id)

        await self.redis_client.delete(
            status_key, url_key, pod_name_key, service_name_key, last_used_key
        )
        logger.info(f"Cleaned up Redis keys for user {user_id}")
