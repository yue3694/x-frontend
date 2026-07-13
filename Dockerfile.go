FROM golang:1.25-alpine AS build
WORKDIR /src
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN go build -o /api ./cmd/api

FROM alpine:3.21
COPY --from=build /api /api
EXPOSE 8080
ENTRYPOINT ["/api"]
