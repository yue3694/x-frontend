package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

const cookieName = "ns_session"

type apiError struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

type authResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// Register creates a new user and sets the session cookie.
func Register(store UserStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input struct {
			Name     string `json:"name"`
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_input", "malformed body")
			return
		}
		input.Name = strings.TrimSpace(input.Name)
		input.Email = strings.ToLower(strings.TrimSpace(input.Email))
		if input.Name == "" || len(input.Name) > 80 {
			writeError(w, http.StatusBadRequest, "invalid_input", "name must be 1-80 chars")
			return
		}
		if !strings.Contains(input.Email, "@") {
			writeError(w, http.StatusBadRequest, "invalid_input", "invalid email")
			return
		}
		if len(input.Password) < 8 {
			writeError(w, http.StatusBadRequest, "invalid_input", "password must be at least 8 chars")
			return
		}

		hash, err := HashPassword(input.Password)
		if err != nil {
			slog.Error("hash password", "err", err)
			writeError(w, http.StatusInternalServerError, "internal_error", "hash failed")
			return
		}

		id, err := newID()
		if err != nil {
			slog.Error("gen id", "err", err)
			writeError(w, http.StatusInternalServerError, "internal_error", "id gen failed")
			return
		}

		u := User{
			ID:           id,
			Name:         input.Name,
			Email:        input.Email,
			PasswordHash: hash,
			CreatedAt:    time.Now().UTC(),
		}
		if err := store.Create(r.Context(), u); err != nil {
			if errors.Is(err, ErrEmailTaken) {
				writeError(w, http.StatusConflict, "email_taken", "email already registered")
				return
			}
			slog.Error("create user", "err", err)
			writeError(w, http.StatusInternalServerError, "internal_error", "create failed")
			return
		}

		tok, err := IssueToken(u)
		if err != nil {
			slog.Error("issue token", "err", err)
			writeError(w, http.StatusInternalServerError, "internal_error", "token failed")
			return
		}
		setSessionCookie(w, tok)
		writeJSON(w, http.StatusCreated, authResponse{Token: tok, User: u})
	}
}

// Login authenticates an existing user.
func Login(store UserStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_input", "malformed body")
			return
		}
		input.Email = strings.ToLower(strings.TrimSpace(input.Email))
		if input.Email == "" || input.Password == "" {
			writeError(w, http.StatusBadRequest, "invalid_input", "missing email or password")
			return
		}

		u, err := store.FindByEmail(r.Context(), input.Email)
		if err != nil {
			if errors.Is(err, ErrNotFound) {
				writeError(w, http.StatusUnauthorized, "invalid_credentials", "invalid email or password")
				return
			}
			slog.Error("find user", "err", err)
			writeError(w, http.StatusInternalServerError, "internal_error", "lookup failed")
			return
		}
		if err := VerifyPassword(u.PasswordHash, input.Password); err != nil {
			writeError(w, http.StatusUnauthorized, "invalid_credentials", "invalid email or password")
			return
		}

		tok, err := IssueToken(u)
		if err != nil {
			slog.Error("issue token", "err", err)
			writeError(w, http.StatusInternalServerError, "internal_error", "token failed")
			return
		}
		setSessionCookie(w, tok)
		writeJSON(w, http.StatusOK, authResponse{Token: tok, User: u})
	}
}

// Logout clears the session cookie.
func Logout() http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		clearSessionCookie(w)
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	}
}

// Me returns the current user from cookie, or 401.
func Me(store UserStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, err := claimsFromRequest(r)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "unauthenticated", "no valid session")
			return
		}
		u, err := store.FindByID(r.Context(), claims.Sub)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "unauthenticated", "user not found")
			return
		}
		writeJSON(w, http.StatusOK, publicUser(u))
	}
}

// publicUser returns the user without sensitive fields like password hash.
func publicUser(u User) any {
	return struct {
		ID        string    `json:"ID"`
		Name      string    `json:"Name"`
		Email     string    `json:"Email"`
		CreatedAt time.Time `json:"CreatedAt"`
	}{ID: u.ID, Name: u.Name, Email: u.Email, CreatedAt: u.CreatedAt}
}

// UserFromContext returns the user attached by AuthMiddleware, or nil.
func UserFromContext(ctx context.Context) *User {
	if u, ok := ctx.Value(userCtxKey{}).(User); ok {
		return &u
	}
	return nil
}

type userCtxKey struct{}

// AuthMiddleware reads the session cookie and attaches user to context.
// Endpoints that strictly need auth should check UserFromContext themselves.
func AuthMiddleware(store UserStore, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if c, err := r.Cookie(cookieName); err == nil && c.Value != "" {
			if claims, err := ParseToken(c.Value); err == nil {
				if u, err := store.FindByID(r.Context(), claims.Sub); err == nil {
					r = r.WithContext(context.WithValue(r.Context(), userCtxKey{}, u))
				}
			}
		}
		next.ServeHTTP(w, r)
	})
}

// ---- helpers ----

func newID() (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	return hex.EncodeToString(b[:]), nil
}

func claimsFromRequest(r *http.Request) (*Claims, error) {
	c, err := r.Cookie(cookieName)
	if err != nil || c.Value == "" {
		return nil, errors.New("no cookie")
	}
	return ParseToken(c.Value)
}

func setSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(tokenLifetime.Seconds()),
	})
}

func clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, code, msg string) {
	writeJSON(w, status, apiError{Error: code, Message: msg})
}