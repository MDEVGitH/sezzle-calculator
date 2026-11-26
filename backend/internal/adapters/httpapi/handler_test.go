package httpapi_test

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/calculator/backend/internal/adapters/httpapi"
	"github.com/calculator/backend/internal/core/domain"
	"github.com/calculator/backend/internal/core/service"
)

func newServer() http.Handler {
	return httpapi.NewHandler(service.NewCalculator(), nil).Routes()
}

func do(t *testing.T, h http.Handler, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestCalculateSuccess(t *testing.T) {
	tests := []struct {
		path, body string
		want       float64
	}{
		{"/api/v1/operations/add", `{"operands":[2,3]}`, 5},
		{"/api/v1/operations/subtract", `{"operands":[2,3]}`, -1},
		{"/api/v1/operations/multiply", `{"operands":[2.5,4]}`, 10},
		{"/api/v1/operations/divide", `{"operands":[7,2]}`, 3.5},
		{"/api/v1/operations/power", `{"operands":[3,3]}`, 27},
		{"/api/v1/operations/sqrt", `{"operands":[81]}`, 9},
		{"/api/v1/operations/percentage", `{"operands":[10,50]}`, 5},
	}
	h := newServer()
	for _, tc := range tests {
		t.Run(tc.path, func(t *testing.T) {
			rec := do(t, h, http.MethodPost, tc.path, tc.body)
			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, body = %s", rec.Code, rec.Body)
			}
			if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
				t.Errorf("Content-Type = %q", ct)
			}
			var got domain.Calculation
			if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
				t.Fatal(err)
			}
			if got.Result != tc.want {
				t.Errorf("result = %v, want %v", got.Result, tc.want)
			}
		})
	}
}

func TestCalculateErrors(t *testing.T) {
	tooLarge := `{"operands":[` + strings.Repeat("1,", 2000) + `1]}`
	tests := []struct {
		name, path, body string
		status           int
		code             string
	}{
		{"division by zero", "/api/v1/operations/divide", `{"operands":[1,0]}`, 422, "DIVISION_BY_ZERO"},
		{"negative sqrt", "/api/v1/operations/sqrt", `{"operands":[-4]}`, 422, "NEGATIVE_SQUARE_ROOT"},
		{"overflow", "/api/v1/operations/power", `{"operands":[10,400]}`, 422, "UNDEFINED_RESULT"},
		{"unknown op", "/api/v1/operations/modulo", `{"operands":[1,2]}`, 404, "UNSUPPORTED_OPERATION"},
		{"wrong arity", "/api/v1/operations/add", `{"operands":[1]}`, 400, "INVALID_OPERAND_COUNT"},
		{"missing operands", "/api/v1/operations/add", `{}`, 400, "INVALID_OPERAND_COUNT"},
		{"string operand", "/api/v1/operations/add", `{"operands":["1",2]}`, 400, "INVALID_REQUEST"},
		{"null operand", "/api/v1/operations/add", `{"operands":[1,null]}`, 400, "INVALID_REQUEST"},
		{"malformed json", "/api/v1/operations/add", `{"operands":[1,2]`, 400, "INVALID_REQUEST"},
		{"empty body", "/api/v1/operations/add", ``, 400, "INVALID_REQUEST"},
		{"unknown field", "/api/v1/operations/add", `{"operands":[1,2],"x":1}`, 400, "INVALID_REQUEST"},
		{"trailing data", "/api/v1/operations/add", `{"operands":[1,2]}{}`, 400, "INVALID_REQUEST"},
		{"body too large", "/api/v1/operations/add", tooLarge, 400, "INVALID_REQUEST"},
	}
	h := newServer()
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rec := do(t, h, http.MethodPost, tc.path, tc.body)
			if rec.Code != tc.status {
				t.Fatalf("status = %d, want %d, body = %s", rec.Code, tc.status, rec.Body)
			}
			var got httpapi.ErrorBody
			if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
				t.Fatal(err)
			}
			if got.Error.Code != tc.code {
				t.Errorf("code = %q, want %q", got.Error.Code, tc.code)
			}
			if got.Error.Message == "" {
				t.Error("expected non-empty error message")
			}
		})
	}
}

func TestMethodNotAllowed(t *testing.T) {
	rec := do(t, newServer(), http.MethodGet, "/api/v1/operations/add", "")
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d, want 405", rec.Code)
	}
}

func TestListOperations(t *testing.T) {
	rec := do(t, newServer(), http.MethodGet, "/api/v1/operations", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	var got struct {
		Operations []domain.OperationInfo `json:"operations"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if len(got.Operations) != 7 {
		t.Errorf("got %d operations, want 7", len(got.Operations))
	}
}

func TestHealth(t *testing.T) {
	rec := do(t, newServer(), http.MethodGet, "/healthz", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "ok") {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body)
	}
}

// stubCalculator is a test double for the ports.Calculator port, showing the
// adapter can be tested in isolation from the real core.
type stubCalculator struct{ err error }

func (s stubCalculator) Calculate(domain.Operation, []float64) (domain.Calculation, error) {
	return domain.Calculation{}, s.err
}
func (stubCalculator) Operations() []domain.OperationInfo { return nil }

func TestDomainErrorMapping(t *testing.T) {
	tests := []struct {
		err    error
		status int
		code   string
	}{
		{domain.ErrUnsupportedOperation, 404, "UNSUPPORTED_OPERATION"},
		{domain.ErrInvalidOperandCount, 400, "INVALID_OPERAND_COUNT"},
		{domain.ErrInvalidOperand, 400, "INVALID_OPERAND"},
		{domain.ErrDivisionByZero, 422, "DIVISION_BY_ZERO"},
		{domain.ErrNegativeSquareRoot, 422, "NEGATIVE_SQUARE_ROOT"},
		{domain.ErrUndefinedResult, 422, "UNDEFINED_RESULT"},
		{errors.New("unexpected"), 500, "INTERNAL_ERROR"},
	}
	for _, tc := range tests {
		t.Run(tc.code, func(t *testing.T) {
			h := httpapi.NewHandler(stubCalculator{err: tc.err}, nil).Routes()
			rec := do(t, h, http.MethodPost, "/api/v1/operations/add", `{"operands":[1,2]}`)
			if rec.Code != tc.status {
				t.Fatalf("status = %d, want %d", rec.Code, tc.status)
			}
			if !strings.Contains(rec.Body.String(), tc.code) {
				t.Errorf("body %s missing code %s", rec.Body, tc.code)
			}
		})
	}
}

// panicCalculator verifies the recover middleware turns panics into 500s.
type panicCalculator struct{}

func (panicCalculator) Calculate(domain.Operation, []float64) (domain.Calculation, error) {
	panic("boom")
}
func (panicCalculator) Operations() []domain.OperationInfo { return nil }

func TestRecoverMiddleware(t *testing.T) {
	h := httpapi.NewHandler(panicCalculator{}, nil).Routes()
	rec := do(t, h, http.MethodPost, "/api/v1/operations/add", `{"operands":[1,2]}`)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rec.Code)
	}
}
