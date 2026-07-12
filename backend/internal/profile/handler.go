package profile

import (
	"net/http"
	"time"

	"github.com/example/neural-synthesis/backend/internal/auth"
)

// Get returns the profile for the authenticated user.
func Get(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFromContext(r.Context())
	if u == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]any{
			"error":   "unauthenticated",
			"message": "no valid session",
		})
		return
	}
	resp := Response{User: publicUser(*u), Profile: ForUser(*u)}
	writeJSON(w, http.StatusOK, resp)
}

func publicUser(u auth.User) auth.User {
	return auth.User{
		ID:        u.ID,
		Name:      u.Name,
		Email:     u.Email,
		CreatedAt: u.CreatedAt.UTC(),
	}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = encodeJSON(w, body)
}

// keep time import used
var _ = time.Time{}