package service_test

import (
	"errors"
	"math"
	"testing"

	"github.com/calculator/backend/internal/core/domain"
	"github.com/calculator/backend/internal/core/service"
)

func TestCalculate(t *testing.T) {
	tests := []struct {
		name     string
		op       domain.Operation
		operands []float64
		want     float64
		wantErr  error
	}{
		{"add", domain.Add, []float64{2, 3}, 5, nil},
		{"add negatives", domain.Add, []float64{-2.5, -0.5}, -3, nil},
		{"subtract", domain.Subtract, []float64{10, 4}, 6, nil},
		{"multiply", domain.Multiply, []float64{6, 7}, 42, nil},
		{"multiply by zero normalises -0", domain.Multiply, []float64{-5, 0}, 0, nil},
		{"divide", domain.Divide, []float64{9, 3}, 3, nil},
		{"divide fractional", domain.Divide, []float64{1, 4}, 0.25, nil},
		{"divide by zero", domain.Divide, []float64{1, 0}, 0, domain.ErrDivisionByZero},
		{"zero divided by zero", domain.Divide, []float64{0, 0}, 0, domain.ErrDivisionByZero},
		{"power", domain.Power, []float64{2, 10}, 1024, nil},
		{"power negative exponent", domain.Power, []float64{2, -1}, 0.5, nil},
		{"power fractional of negative is undefined", domain.Power, []float64{-8, 0.5}, 0, domain.ErrUndefinedResult},
		{"power overflow", domain.Power, []float64{10, 400}, 0, domain.ErrUndefinedResult},
		{"multiply overflow", domain.Multiply, []float64{math.MaxFloat64, 2}, 0, domain.ErrUndefinedResult},
		{"sqrt", domain.Sqrt, []float64{16}, 4, nil},
		{"sqrt zero", domain.Sqrt, []float64{0}, 0, nil},
		{"sqrt negative", domain.Sqrt, []float64{-1}, 0, domain.ErrNegativeSquareRoot},
		{"percentage", domain.Percentage, []float64{15, 200}, 30, nil},
		{"too few operands", domain.Add, []float64{1}, 0, domain.ErrInvalidOperandCount},
		{"too many operands", domain.Sqrt, []float64{1, 2}, 0, domain.ErrInvalidOperandCount},
		{"nil operands", domain.Add, nil, 0, domain.ErrInvalidOperandCount},
		{"NaN operand", domain.Add, []float64{math.NaN(), 1}, 0, domain.ErrInvalidOperand},
		{"Inf operand", domain.Add, []float64{math.Inf(1), 1}, 0, domain.ErrInvalidOperand},
		{"unknown operation", domain.Operation("modulo"), []float64{1, 2}, 0, domain.ErrUnsupportedOperation},
	}

	calc := service.NewCalculator()
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := calc.Calculate(tc.op, tc.operands)
			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Fatalf("error = %v, want %v", err, tc.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got.Result != tc.want || math.Signbit(got.Result) != math.Signbit(tc.want) {
				t.Errorf("result = %v, want %v", got.Result, tc.want)
			}
			if got.Operation != tc.op {
				t.Errorf("operation = %v, want %v", got.Operation, tc.op)
			}
		})
	}
}

func TestCalculateDoesNotAliasOperands(t *testing.T) {
	in := []float64{1, 2}
	got, err := service.NewCalculator().Calculate(domain.Add, in)
	if err != nil {
		t.Fatal(err)
	}
	in[0] = 100
	if got.Operands[0] != 1 {
		t.Errorf("calculation operands mutated through caller slice")
	}
}

func TestOperations(t *testing.T) {
	ops := service.NewCalculator().Operations()
	if len(ops) != 7 {
		t.Fatalf("got %d operations, want 7", len(ops))
	}
	for i := 1; i < len(ops); i++ {
		if ops[i-1].Name >= ops[i].Name {
			t.Errorf("operations not sorted: %q before %q", ops[i-1].Name, ops[i].Name)
		}
	}
}
