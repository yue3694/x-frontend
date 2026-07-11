FROM golang:1.24-alpine AS build
WORKDIR /src
COPY backend/go.mod ./
COPY backend/cmd ./cmd
RUN go build -o /api ./cmd/api

FROM alpine:3.21
COPY --from=build /api /api
EXPOSE 8080
ENTRYPOINT ["/api"]
