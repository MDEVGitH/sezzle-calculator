// Package httpapi is the driving HTTP/JSON adapter. It translates HTTP
// requests into calls on the ports.Calculator port and maps domain errors
// to HTTP status codes.
package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"

	"github.com/calculator/backend/internal/core/domain"
	"github.com/calculator/backend/internal/core/ports"
)

const maxBodyBytes = 1 << 10 // 1 KiB is plenty for a list of operands.

// CalculateRequest is the JSON body accepted by the calculate endpoint.
// Operands are pointers so that JSON null is detected instead of silently
// decoding to 0.
type CalculateRequest struct {
	Operands []*float64 `json:"operands"`
}

func (r CalculateRequest) values() ([]float64, error) {
	out := make([]float64, len(r.Operands))
	for i, v := range r.Operands {
		if v == nil {
			return nil, errors.New("operands must be numbers, got null")
		}
		out[i] = *v
	}
	return out, nil
}

// ErrorBody is the JSON envelope for all error responses.
type ErrorBody struct {
	Error APIError `json:"error"`
}

// APIError carries a stable machine-readable code and a human message.
type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Handler exposes the calculator over HTTP.
type Handler struct {
	calc   ports.Calculator
	logger *slog.Logger
}

// NewHandler builds a Handler for the given calculator port.
func NewHandler(calc ports.Calculator, logger *slog.Logger) *Handler {
	if logger == nil {
		logger = slog.New(slog.NewTextHandler(io.Discard, nil))
	}
	return &Handler{calc: calc, logger: logger}
}

// Routes returns the router with all endpoints and middleware attached.
func (h *Handler) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", h.health)
	mux.HandleFunc("GET /api/v1/operations", h.listOperations)
	mux.HandleFunc("POST /api/v1/operations/{operation}", h.calculate)
	return recoverer(h.logger, requestLogger(h.logger, mux))
}

func (h *Handler) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) listOperations(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"operations": h.calc.Operations()})
}

func (h *Handler) calculate(w http.ResponseWriter, r *http.Request) {
	op, err := domain.ParseOperation(r.PathValue("operation"))
	if err != nil {
		writeError(w, http.StatusNotFound, "UNSUPPORTED_OPERATION",
			"operation '"+r.PathValue("operation")+"' is not supported")
		return
	}

	var req CalculateRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	operands, err := req.values()
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	calc, err := h.calc.Calculate(op, operands)
	if err != nil {
		status, code := mapDomainError(err)
		writeError(w, status, code, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, calc)
}

func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		var maxErr *http.MaxBytesError
		switch {
		case errors.Is(err, io.EOF):
			return errors.New("request body must not be empty")
		case errors.As(err, &maxErr):
			return errors.New("request body is too large")
		default:
			return errors.New("request body must be JSON like {\"operands\": [number, ...]}")
		}
	}
	if dec.More() {
		return errors.New("request body must contain a single JSON object")
	}
	return nil
}

func mapDomainError(err error) (int, string) {
	switch {
	case errors.Is(err, domain.ErrUnsupportedOperation):
		return http.StatusNotFound, "UNSUPPORTED_OPERATION"
	case errors.Is(err, domain.ErrInvalidOperandCount):
		return http.StatusBadRequest, "INVALID_OPERAND_COUNT"
	case errors.Is(err, domain.ErrInvalidOperand):
		return http.StatusBadRequest, "INVALID_OPERAND"
	case errors.Is(err, domain.ErrDivisionByZero):
		return http.StatusUnprocessableEntity, "DIVISION_BY_ZERO"
	case errors.Is(err, domain.ErrNegativeSquareRoot):
		return http.StatusUnprocessableEntity, "NEGATIVE_SQUARE_ROOT"
	case errors.Is(err, domain.ErrUndefinedResult):
		return http.StatusUnprocessableEntity, "UNDEFINED_RESULT"
	default:
		return http.StatusInternalServerError, "INTERNAL_ERROR"
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, code, msg string) {
	writeJSON(w, status, ErrorBody{Error: APIError{Code: code, Message: msg}})
}
