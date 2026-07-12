.PHONY: help dev dev-bg build run-bg stop logs restart status clean health web-dev web-build web-start

# ──────────────────────────────────────────────────────────────────────
# Composite Makefile — wraps backend/ for Go + root for Next.js
# Run from project root. Run `make help` for all targets.
# ──────────────────────────────────────────────────────────────────────

help: ## Show all targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' Makefile backend/Makefile 2>/dev/null | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

# ── Go API ────────────────────────────────────────────────────────────
dev: ## Hot-reload Go dev mode (foreground)
	$(MAKE) -C backend dev

dev-bg: ## Hot-reload Go dev mode in background
	$(MAKE) -C backend dev-bg

build: ## Build Go binary to backend/tmp/api
	$(MAKE) -C backend build

run-bg: ## Build + run Go in background
	$(MAKE) -C backend run-bg

stop: ## Stop background Go process
	$(MAKE) -C backend stop

logs: ## Tail Go logs
	$(MAKE) -C backend logs

restart: ## Restart background Go process
	$(MAKE) -C backend restart

status: ## Show pid + port status
	$(MAKE) -C backend status

clean: ## Remove build artifacts
	$(MAKE) -C backend clean

health: ## Curl Go /healthz
	$(MAKE) -C backend health

# ── Web / Next.js ─────────────────────────────────────────────────────
web-install: ## npm install
	npm install

web-dev: ## npm run dev (foreground, :3000)
	npm run dev

web-build: ## npm run build (production)
	npm run build

web-start: ## Build + start production server on PORT (default 3001)
	@test -d .next || $(MAKE) web-build
	PORT=$${PORT:-3001} npm start

# ── Combined ──────────────────────────────────────────────────────────
all-up: ## Build + start both Go (background) and Next.js (background)
	$(MAKE) -C backend run-bg
	$(MAKE) web-build
	@PORT=$${PORT:-3001} nohup npm start > /tmp/next.log 2>&1 & echo $$! > /tmp/next.pid; \
	  sleep 1; \
	  echo "next.js started (pid $$(cat /tmp/next.pid))"; \
	  echo "logs: tail -f /tmp/next.log"; \
	  echo "all-up: make status-all"

all-down: ## Stop both Go and Next.js background processes
	$(MAKE) stop
	@if [ -f /tmp/next.pid ] && kill -0 $$(cat /tmp/next.pid) 2>/dev/null; then \
	  kill $$(cat /tmp/next.pid) && echo "next.js stopped"; \
	  rm -f /tmp/next.pid; \
	fi

status-all: ## Show status of both services
	@echo "── Go API ──"
	@$(MAKE) -s -C backend status
	@echo ""
	@echo "── Next.js ──"
	@if [ -f /tmp/next.pid ] && kill -0 $$(cat /tmp/next.pid) 2>/dev/null; then \
	  echo "running pid=$$(cat /tmp/next.pid)"; \
	else \
	  echo "not running"; \
	fi
	@echo -n "port 3000: "; lsof -nP -iTCP:3000 -sTCP:LISTEN 2>/dev/null | tail -1 || echo "free"
	@echo -n "port 3001: "; lsof -nP -iTCP:3001 -sTCP:LISTEN 2>/dev/null | tail -1 || echo "free"