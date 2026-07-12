package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// User is the canonical user record.
type User struct {
	ID           string
	Name         string
	Email        string
	PasswordHash []byte `json:"-"`
	CreatedAt    time.Time
}

// UserStore is the persistence interface for users.
type UserStore interface {
	Create(ctx context.Context, u User) error
	FindByEmail(ctx context.Context, email string) (User, error)
	FindByID(ctx context.Context, id string) (User, error)
}

// ErrEmailTaken is returned when Create collides with a unique email.
var ErrEmailTaken = errors.New("email_taken")

// PostgresUserStore persists users in PostgreSQL via pgxpool.
type PostgresUserStore struct {
	pool *pgxpool.Pool
}

func NewPostgresUserStore(pool *pgxpool.Pool) *PostgresUserStore {
	return &PostgresUserStore{pool: pool}
}

func (s *PostgresUserStore) Create(ctx context.Context, u User) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO users (id, name, email, password_hash, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`, u.ID, u.Name, strings.ToLower(u.Email), u.PasswordHash, u.CreatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" { // unique_violation
			return ErrEmailTaken
		}
		return fmt.Errorf("insert user: %w", err)
	}
	return nil
}

func (s *PostgresUserStore) FindByEmail(ctx context.Context, email string) (User, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, name, email, password_hash, created_at
		FROM users
		WHERE email = $1
	`, strings.ToLower(email))
	var u User
	err := row.Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	if err != nil {
		return User{}, fmt.Errorf("scan user: %w", err)
	}
	return u, nil
}

func (s *PostgresUserStore) FindByID(ctx context.Context, id string) (User, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, name, email, password_hash, created_at
		FROM users
		WHERE id = $1
	`, id)
	var u User
	err := row.Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	if err != nil {
		return User{}, fmt.Errorf("scan user: %w", err)
	}
	return u, nil
}

// ErrNotFound is returned when no user matches the lookup.
var ErrNotFound = errors.New("not_found")