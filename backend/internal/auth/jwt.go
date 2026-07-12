package auth

import (
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const tokenLifetime = 24 * time.Hour

// Claims is the JWT payload.
type Claims struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	Name  string `json:"name"`
	jwt.RegisteredClaims
}

func secret() []byte {
	s := os.Getenv("AUTH_JWT_SECRET")
	if s == "" {
		fmt.Fprintln(os.Stderr, "WARN: AUTH_JWT_SECRET not set, using dev default")
		s = "dev-secret-change-me"
	}
	return []byte(s)
}

// IssueToken signs an HS256 JWT for the given user.
func IssueToken(u User) (string, error) {
	now := time.Now()
	claims := Claims{
		Sub:   u.ID,
		Email: u.Email,
		Name:  u.Name,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(tokenLifetime)),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString(secret())
}

// ParseToken verifies signature + expiry and returns claims.
func ParseToken(tokenStr string) (*Claims, error) {
	parsed, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return secret(), nil
	}, jwt.WithValidMethods([]string{"HS256"}))
	if err != nil {
		return nil, err
	}
	c, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid {
		return nil, errors.New("invalid token")
	}
	return c, nil
}