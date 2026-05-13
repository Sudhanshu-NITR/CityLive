# ------ Builder/Build stage ------
FROM golang:1.25 AS builder

WORKDIR /app

COPY go.mod ./

RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/event-service/main.go

# ------ Runtime stage ------
FROM alpine:latest

WORKDIR /root/

COPY --from=builder /app/main .

CMD ["./main"]