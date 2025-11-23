"""Kubernetes resource templates for dynamic pod management."""

from typing import Any, Dict


def get_pvc_template(user_id: str) -> Dict[str, Any]:
    """
    Generate a PersistentVolumeClaim template for a user.

    Args:
        user_id: Unique identifier for the user

    Returns:
        Dictionary representing a Kubernetes PVC manifest
    """
    return {
        "apiVersion": "v1",
        "kind": "PersistentVolumeClaim",
        "metadata": {
            "name": f"pvc-agent-{user_id}",
            "labels": {
                "app": "containerized-agent",
                "user-id": user_id,
            },
        },
        "spec": {
            "accessModes": ["ReadWriteOnce"],
            "resources": {
                "requests": {
                    "storage": "10Gi",  # Adjust size as needed
                }
            },
        },
    }


def get_service_template(user_id: str) -> Dict[str, Any]:
    """
    Generate a Service template for a user's pod.

    Args:
        user_id: Unique identifier for the user

    Returns:
        Dictionary representing a Kubernetes Service manifest
    """
    return {
        "apiVersion": "v1",
        "kind": "Service",
        "metadata": {
            "name": f"svc-agent-{user_id}",
            "labels": {
                "app": "containerized-agent",
                "user-id": user_id,
            },
        },
        "spec": {
            "type": "NodePort",  # Use NodePort for external access from host
            "ports": [
                {
                    "port": 8089,
                    "targetPort": 8089,
                    "nodePort": 0,  # Let Kubernetes assign a port
                    "protocol": "TCP",
                }
            ],
            "selector": {
                "app": "containerized-agent",
                "user-id": user_id,
            },
        },
    }


def get_pod_template(user_id: str, api_key: str) -> Dict[str, Any]:
    """
    Generate a Pod template for a user's containerized agent.

    Args:
        user_id: Unique identifier for the user
        api_key: ANTHROPIC_API_KEY to inject into the pod

    Returns:
        Dictionary representing a Kubernetes Pod manifest
    """
    return {
        "apiVersion": "v1",
        "kind": "Pod",
        "metadata": {
            "name": f"pod-agent-{user_id}",
            "labels": {
                "app": "containerized-agent",
                "user-id": user_id,
            },
        },
        "spec": {
            "initContainers": [
                {
                    "name": "volume-init",
                    "image": "containerized-claude-agent:latest",
                    "imagePullPolicy": "Never",
                    "command": [
                        "/bin/bash",
                        "-c",
                        (
                            "set -e && "
                            "mkdir -p /mnt/claude/projects /mnt/claude/skills && "
                            'if [ ! -d /mnt/claude/skills ] || [ -z "$(ls -A /mnt/claude/skills 2>/dev/null)" ]; then '
                            '  if [ -d /opt/claude-skills ] && [ -n "$(ls -A /opt/claude-skills 2>/dev/null)" ]; then '
                            "    cp -r /opt/claude-skills/* /mnt/claude/skills/ 2>/dev/null || true && "
                            "    echo 'Skills initialized' || true; "
                            "  fi; "
                            "fi && "
                            "chmod -R 755 /mnt/claude 2>/dev/null || true && "
                            "echo 'Volume initialization complete'"
                        ),
                    ],
                    "volumeMounts": [
                        {
                            "name": "agent-data",
                            "mountPath": "/mnt",
                        },
                    ],
                    "securityContext": {
                        "runAsUser": 1000,  # appuser UID
                        "runAsGroup": 1000,
                    },
                }
            ],
            "containers": [
                {
                    "name": "containerized-agent",
                    "image": "containerized-claude-agent:latest",
                    "imagePullPolicy": "Never",  # Use local image in Minikube
                    "ports": [
                        {
                            "containerPort": 8089,
                            "protocol": "TCP",
                        }
                    ],
                    "env": [
                        {
                            "name": "ANTHROPIC_API_KEY",
                            "value": api_key,
                        },
                        {
                            "name": "AGENT_WORKING_DIR",
                            "value": "/app/workspace",
                        },
                        {
                            "name": "PORT",
                            "value": "8089",
                        },
                    ],
                    "volumeMounts": [
                        {
                            "name": "agent-data",
                            "mountPath": "/home/appuser/.claude",
                            "subPath": "claude",
                        },
                        {
                            "name": "agent-data",
                            "mountPath": "/app/workspace",
                            "subPath": "workspace",
                        },
                    ],
                    "resources": {
                        "requests": {
                            "memory": "512Mi",
                            "cpu": "250m",
                        },
                        "limits": {
                            "memory": "2Gi",
                            "cpu": "1000m",
                        },
                    },
                }
            ],
            "volumes": [
                {
                    "name": "agent-data",
                    "persistentVolumeClaim": {
                        "claimName": f"pvc-agent-{user_id}",
                    },
                }
            ],
            "restartPolicy": "Never",  # We manage lifecycle manually
        },
    }

