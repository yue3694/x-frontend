package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
)

type response struct {
	StatusCode int    `json:"statusCode"`
	Body       string `json:"body"`
}

// handle is a thin Lambda interface for private Go APIs. API_BASE_URL points
// at the Cloud Map DNS name (for example http://api.app.local:8080).
func handle(ctx context.Context) (response, error) {
	baseURL := strings.TrimRight(os.Getenv("API_BASE_URL"), "/")
	if baseURL == "" {
		return response{StatusCode: http.StatusInternalServerError, Body: `{"error":"api_base_url_missing"}`}, nil
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, baseURL+"/healthz", nil)
	if err != nil {
		return response{}, fmt.Errorf("create API request: %w", err)
	}

	client := &http.Client{Timeout: 3 * time.Second}
	upstream, err := client.Do(request)
	if err != nil {
		return response{StatusCode: http.StatusBadGateway, Body: `{"error":"api_unavailable"}`}, nil
	}
	defer upstream.Body.Close()

	var payload json.RawMessage
	if err := json.NewDecoder(upstream.Body).Decode(&payload); err != nil {
		return response{StatusCode: http.StatusBadGateway, Body: `{"error":"invalid_api_response"}`}, nil
	}

	return response{StatusCode: upstream.StatusCode, Body: string(payload)}, nil
}

func main() {
	lambda.Start(handle)
}
