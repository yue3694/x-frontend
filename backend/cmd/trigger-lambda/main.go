// Package main implements a Lambda that receives GitHub webhook events and
// triggers a CodeBuild project for PR preview environments. The Lambda is
// exposed via a Function URL (HTTPS) and validates the GitHub HMAC-SHA256
// signature on every request.
package main

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/codebuild"
	"github.com/aws/aws-sdk-go-v2/service/codebuild/types"
)

// Configuration is read from environment variables at startup. Keep this
// struct aligned with the Terraform `aws_lambda_function.trigger.environment`
// block in infra/terraform/preview.tf.
type Configuration struct {
	ProjectName       string
	WebhookSecret     string
	SourceVersionVar  string
	PRRefEnvVar       string
	PRActionEnvVar    string
	TrustedActorID    string
	GithubBaseRef     string
	ImageTagPrefix    string
}

func loadConfig() Configuration {
	return Configuration{
		ProjectName:    os.Getenv("CODEBUILD_PROJECT_NAME"),
		WebhookSecret:  os.Getenv("GITHUB_WEBHOOK_SECRET"),
		PRRefEnvVar:    "PR_REF",
		PRActionEnvVar: "PR_ACTION",
		TrustedActorID: os.Getenv("TRUSTED_GITHUB_ACTOR_ID"),
		GithubBaseRef:  "main",
		ImageTagPrefix: "pr",
	}
}

// githubPullRequest is the subset of the GitHub pull_request webhook payload
// we care about. Field names match GitHub's JSON exactly.
type githubPullRequest struct {
	Number int `json:"number"`
	Head   struct {
		Ref string `json:"ref"`
		SHA string `json:"sha"`
	} `json:"head"`
	Base struct {
		Ref string `json:"ref"`
	} `json:"base"`
	State string `json:"state"` // "open" | "closed"
}

// githubSender is the user that triggered the event.
type githubSender struct {
	ID    int64  `json:"id"`
	Login string `json:"login"`
}

// githubEnvelope is the top-level webhook payload.
type githubEnvelope struct {
	Action      string             `json:"action"`
	PullRequest githubPullRequest   `json:"pull_request"`
	Sender      githubSender       `json:"sender"`
	Repository  struct {
		FullName string `json:"full_name"`
	} `json:"repository"`
}

// response is the Lambda Function URL shape.
type response struct {
	StatusCode int               `json:"statusCode"`
	Headers    map[string]string `json:"headers,omitempty"`
	Body       string            `json:"body"`
}

var (
	cfg     Configuration
	cb      *codebuild.Client
	started = time.Now()
)

func main() {
	cfg = loadConfig()
	if cfg.ProjectName == "" {
		panic("CODEBUILD_PROJECT_NAME is required")
	}

	ctx := context.Background()
	awsCfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		panic(fmt.Errorf("load aws config: %w", err))
	}
	cb = codebuild.NewFromConfig(awsCfg)

	lambda.Start(handler)
}

func handler(req events.LambdaFunctionURLRequest) (response, error) {
	// Ping endpoint so we can check liveness without GitHub plumbing.
	if req.RawPath == "/healthz" || req.RawPath == "/ping" {
		return ok("ok"), nil
	}

	if req.RequestContext.HTTP.Method != http.MethodPost {
		return errorResp(http.StatusMethodNotAllowed, "method not allowed"), nil
	}

	eventType := req.Headers["x-github-event"]
	if eventType == "" {
		eventType = req.Headers["X-GitHub-Event"]
	}
	if eventType != "pull_request" {
		// Ignore everything else (push, ping, etc.) but acknowledge.
		return ok(fmt.Sprintf("ignored event %q", eventType)), nil
	}

	// Decode the body. Lambda Function URL sets isBase64Encoded=true when
	// the Content-Type isn't a text/* type (including application/json in
	// some configs). We try base64 first if the flag is set, then fall back
	// to raw.
	body := req.Body
	if req.IsBase64Encoded {
		decoded, err := base64.StdEncoding.DecodeString(body)
		if err != nil {
			return errorResp(http.StatusBadRequest, fmt.Sprintf("base64 decode: %v", err)), nil
		}
		body = string(decoded)
	}

	// Verify the HMAC signature against the raw body bytes (GitHub signs the
	// raw payload, not the base64 wrapper).
	signature := req.Headers["x-hub-signature-256"]
	if signature == "" {
		signature = req.Headers["X-Hub-Signature-256"]
	}
	if cfg.WebhookSecret == "" {
		return errorResp(http.StatusInternalServerError, "webhook secret not configured"), nil
	}
	if !verifySignature(cfg.WebhookSecret, signature, body) {
		return errorResp(http.StatusUnauthorized, "signature mismatch"), nil
	}

	var env githubEnvelope
	if err := json.Unmarshal([]byte(body), &env); err != nil {
		return errorResp(http.StatusBadRequest, fmt.Sprintf("invalid json: %v", err)), nil
	}
	if env.PullRequest.Number == 0 {
		return errorResp(http.StatusBadRequest, "pull_request.number missing"), nil
	}

	// Restrict to PRs targeting the configured base branch.
	if env.PullRequest.Base.Ref != cfg.GithubBaseRef {
		return ok(fmt.Sprintf("ignored base=%s", env.PullRequest.Base.Ref)), nil
	}

	// Optional: restrict to trusted actors (same filter as the CodeBuild
	// webhook used to enforce). Empty TrustedActorID disables the filter.
	if cfg.TrustedActorID != "" {
		want, err := strconv.ParseInt(cfg.TrustedActorID, 10, 64)
		if err != nil {
			return errorResp(http.StatusInternalServerError, "invalid TRUSTED_GITHUB_ACTOR_ID"), nil
		}
		if env.Sender.ID != want {
			return ok(fmt.Sprintf("ignored actor id=%d login=%s", env.Sender.ID, env.Sender.Login)), nil
		}
	}

	// Map GitHub action to PR lifecycle. We treat all "open" sub-actions
	// (opened, reopened, synchronize, edited, ready_for_review) as a build,
	// and "closed" as a teardown.
	var prAction string
	switch env.Action {
	case "opened", "reopened", "synchronize", "edited", "ready_for_review":
		prAction = "build"
	case "closed":
		prAction = "closed"
	default:
		return ok(fmt.Sprintf("ignored action=%s", env.Action)), nil
	}

	imageTag := fmt.Sprintf("%s-%d-%s", cfg.ImageTagPrefix, env.PullRequest.Number, shortSHA(env.PullRequest.Head.SHA))
	prNumber := strconv.Itoa(env.PullRequest.Number)

	envVars := []types.EnvironmentVariable{
		{Name: aws.String("PR_NUMBER"), Value: aws.String(prNumber), Type: types.EnvironmentVariableTypePlaintext},
		{Name: aws.String(cfg.PRRefEnvVar), Value: aws.String(env.PullRequest.Head.Ref), Type: types.EnvironmentVariableTypePlaintext},
		{Name: aws.String("PR_SHA"), Value: aws.String(env.PullRequest.Head.SHA), Type: types.EnvironmentVariableTypePlaintext},
		{Name: aws.String(cfg.PRActionEnvVar), Value: aws.String(prAction), Type: types.EnvironmentVariableTypePlaintext},
	}

	startOut, err := cb.StartBuild(context.Background(), &codebuild.StartBuildInput{
		ProjectName:               aws.String(cfg.ProjectName),
		SourceVersion:             aws.String(env.PullRequest.Head.SHA),
		EnvironmentVariablesOverride: envVars,
	})
	if err != nil {
		return errorResp(http.StatusBadGateway, fmt.Sprintf("start_build: %v", err)), nil
	}

	respBody, _ := json.Marshal(map[string]any{
		"build_id":  aws.ToString(startOut.Build.Id),
		"pr":        prNumber,
		"action":    prAction,
		"image_tag": imageTag,
	})
	return response{StatusCode: http.StatusAccepted, Headers: map[string]string{"content-type": "application/json"}, Body: string(respBody)}, nil
}

// verifySignature implements GitHub's HMAC-SHA256 webhook auth. Returns true
// if the signature matches.
func verifySignature(secret, gotSignature, body string) bool {
	if gotSignature == "" {
		return false
	}
	const prefix = "sha256="
	if len(gotSignature) < len(prefix) || gotSignature[:len(prefix)] != prefix {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(body))
	want := hex.EncodeToString(mac.Sum(nil))
	got := gotSignature[len(prefix):]
	return hmac.Equal([]byte(want), []byte(got))
}

func shortSHA(s string) string {
	if len(s) >= 12 {
		return s[:12]
	}
	return s
}

func ok(body string) response {
	return response{StatusCode: http.StatusOK, Headers: map[string]string{"content-type": "text/plain"}, Body: body}
}

func errorResp(code int, msg string) response {
	return response{StatusCode: code, Headers: map[string]string{"content-type": "text/plain"}, Body: msg}
}

// Unused but kept to ensure imports are referenced when refactoring.
var _ = io.Discard
