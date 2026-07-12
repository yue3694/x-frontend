package auth

import "golang.org/x/crypto/bcrypt"

// HashPassword hashes a plaintext password using bcrypt cost=10.
func HashPassword(plain string) ([]byte, error) {
	return bcrypt.GenerateFromPassword([]byte(plain), 10)
}

// VerifyPassword returns nil if hash matches plain.
func VerifyPassword(hash []byte, plain string) error {
	return bcrypt.CompareHashAndPassword(hash, []byte(plain))
}