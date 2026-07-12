SHELL := /bin/bash
GO ?= go
AIR ?= ~/go/bin/air

LOG_FILE ?= /tmp/go-api.log
PID_FILE ?= /tmp/go-api.pid
PORT ?= 8080

DATABASE_URL ?= postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable
AUTH_JWT_SECRET ?= dev-secret-change-me

export DATABASE_URL
export AUTH_JWT_SECRET

.PHONY: help dev dev-bg build run stop logs restart status clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

dev: ## Hot-reload dev mode (foreground, Ctrl-C to stop)
	$(AIR)

dev-bg: ## Hot-reload dev mode in background; logs → $(LOG_FILE)
	@mkdir -p tmp
	@if [ -f $(PID_FILE) ] && kill -0 $$(cat $(PID_FILE)) 2>/dev/null; then \
		echo "air already running (pid $$(cat $(PID_FILE)))"; \
	else \
		nohup $(AIR) > $(LOG_FILE) 2>&1 & echo $$! > $(PID_FILE); \
		sleep 2; \
		echo "air started in background (pid $$(cat $(PID_FILE)))"; \
		echo "logs: tail -f $(LOG_FILE)"; \
	fi

build: ## Compile to ./tmp/api
	@mkdir -p tmp
	$(GO) build -o ./tmp/api ./cmd/api

run: build ## Build + run once (foreground)
	./tmp/api

run-bg: build ## Build + run in background; logs → $(LOG_FILE)
	@if [ -f $(PID_FILE) ] && kill -0 $$(cat $(PID_FILE)) 2>/dev/null; then \
		echo "go-api already running (pid $$(cat $(PID_FILE)))"; \
	else \
		nohup ./tmp/api > $(LOG_FILE) 2>&1 & echo $$! > $(PID_FILE); \
		sleep 1; \
		echo "go-api started (pid $$(cat $(PID_FILE)))"; \
	fi

stop: ## Stop background process (dev-bg or run-bg)
	@if [ -f $(PID_FILE) ]; then \
		PID=$$(cat $(PID_FILE)); \
		if kill -0 $$PID 2>/dev/null; then \
			kill $$PID && echo "stopped pid $$PID"; \
			rm -f $(PID_FILE); \
		else \
			echo "stale pidfile, removing"; \
			rm -f $(PID_FILE); \
		fi \
	else \
		echo "no pidfile; killing anything on :$(PORT)"; \
		lsof -ti :$(PORT) | xargs -r kill && echo "killed listener on :$(PORT)" || echo "no listener"; \
	fi

logs: ## Tail logs (Ctrl-C to exit)
	@if [ -f $(LOG_FILE) ]; then tail -f $(LOG_FILE); else echo "no log file: $(LOG_FILE)"; fi

restart: stop run-bg ## Restart background process

status: ## Show pid + port status
	@if [ -f $(PID_FILE) ] && kill -0 $$(cat $(PID_FILE)) 2>/dev/null; then \
		echo "running pid=$$(cat $(PID_FILE))"; \
	else \
		echo "not running"; \
	fi
	@echo -n "port $(PORT): "; lsof -nP -iTCP:$(PORT) -sTCP:LISTEN 2>/dev/null | tail -1 || echo "free"

clean: ## Remove tmp/ build artifacts
	rm -rf tmp

health: ## Curl healthz
	@curl -s http://localhost:$(PORT)/healthz | head -c 200; echo