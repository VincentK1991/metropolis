#! /bin/bash

eval $(minikube docker-env)
docker build -t containerized-claude-agent:latest .
