import asyncio
import logging
import socket
import subprocess

logger = logging.getLogger(__name__)


class PortForwarder:
    """Manages kubectl port-forward processes."""

    async def ensure_port_forward(
        self, service_name: str, local_port: int = 8089
    ) -> None:
        """
        Ensure port-forward is running for a service.

        Args:
            service_name: Name of the service
            local_port: Local port to forward to

        Raises:
            Exception: If port-forward fails to start
        """
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
                if self._is_port_open(local_port):
                    logger.info(
                        f"[PORT_FORWARD] Port-forward already exists and is "
                        f"working for {service_name}"
                    )
                    return
                else:
                    logger.warning(
                        f"[PORT_FORWARD] Port-forward process exists but port "
                        f"{local_port} is not listening, restarting..."
                    )
                    # Kill the dead process
                    await self.kill_existing_port_forward(service_name, local_port)
        except Exception as e:
            logger.debug(f"Failed to check existing port-forward: {e}")

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
                    f"[PORT_FORWARD] Port-forward process exited immediately: "
                    f"{error_msg}"
                )
                raise Exception(f"Port-forward failed: {error_msg}")

            # Verify port-forward is actually working
            if not self._is_port_open(local_port):
                logger.error(
                    f"[PORT_FORWARD] Port {local_port} is not listening after "
                    f"starting, port-forward failed. Process PID: {process.pid}"
                )
                try:
                    stdout, stderr = process.communicate(timeout=1)
                    error_msg = stderr.decode() if stderr else stdout.decode()
                    if error_msg:
                        logger.error(f"[PORT_FORWARD] Error output: {error_msg}")
                except Exception as e:
                    logger.debug(f"Failed to read process output: {e}")
                raise Exception(
                    f"Port-forward started but port {local_port} is not listening"
                )
            else:
                logger.info(
                    f"[PORT_FORWARD] Port-forward started successfully for "
                    f"{service_name} on localhost:{local_port} "
                    f"(PID: {process.pid})"
                )
        except Exception as e:
            logger.error(
                f"[PORT_FORWARD] Failed to start port-forward: {e}. "
                f"Please start manually: kubectl port-forward "
                f"svc/{service_name} {local_port}:8089 --address=127.0.0.1",
                exc_info=True,
            )
            raise

    async def kill_existing_port_forward(
        self, service_name: str, local_port: int = 8089
    ) -> None:
        """Kill any existing port-forward processes for a service."""
        try:
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
                        except Exception as e:
                            logger.debug(f"Failed to kill process {pid.strip()}: {e}")
        except Exception as e:
            logger.debug(f"Failed to find port-forward processes: {e}")

    def _is_port_open(self, port: int, host: str = "127.0.0.1") -> bool:
        """Check if a port is open on the given host."""
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        try:
            result_code = sock.connect_ex((host, port))
            return result_code == 0
        finally:
            sock.close()
