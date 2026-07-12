package main

import (
	"context"
	"encoding/json"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/example/neural-synthesis/backend/internal/auth"
	"github.com/example/neural-synthesis/backend/internal/db"
	"github.com/example/neural-synthesis/backend/internal/profile"
)

type healthResponse struct {
	Status  string `json:"status"`
	Service string `json:"service"`
	Version string `json:"version"`
}

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pool, err := db.New(ctx)
	if err != nil {
		slog.Error("connect db", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	if _, err := pool.Exec(ctx, auth.Schema()); err != nil {
		slog.Error("apply schema", "err", err)
		os.Exit(1)
	}
	slog.Info("users table ready")

	store := auth.NewPostgresUserStore(pool)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(healthResponse{Status: "ok", Service: "go-api", Version: "0.2.0"})
	})

	authedMux := http.NewServeMux()
	authedMux.HandleFunc("GET /profile", profile.Get)

	mux.Handle("POST /auth/register", auth.Register(store))
	mux.Handle("POST /auth/login", auth.Login(store))
	mux.Handle("POST /auth/logout", auth.Logout())
	mux.Handle("GET /auth/me", auth.Me(store))
	mux.Handle("/profile", auth.AuthMiddleware(store, authedMux))

	server := &http.Server{Addr: ":8080", Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	go func() {
		slog.Info("Go API listening", "addr", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	sctx, scancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer scancel()
	if err := server.Shutdown(sctx); err != nil {
		slog.Error("shutdown", "err", err)
	}
	_ = pool
	_ = pgxpool.Pool{}
}