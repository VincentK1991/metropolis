#!/bin/bash

export PORT=8090
export AGENT_WORKING_DIR=/home/vkieuvongngam/exploration/metropolis/containerized_agent/local_data

uvicorn main:app --host 0.0.0.0 --port "${PORT}"

