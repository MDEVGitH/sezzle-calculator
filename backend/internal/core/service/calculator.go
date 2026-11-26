// Package service implements the application's use cases on top of the domain.
package service

import (
	"fmt"
	"math"

	"github.com/calculator/backend/internal/core/domain"
	"github.com/calculator/backend/internal/core/ports"
)

// Calculator is the core implementation of ports.Calculator.
type Calculator struct{}

// Compile-time check that Calculator satisfies the port.
var _ ports.Calculator = (*Calculator)(nil)

// NewCalculator returns a ready-to-use Calculator.
func NewCalculator() *Calculator { return &Calculator{} }

// Operations lists supported operations.
func (c *Calculator) Operations() []domain.OperationInfo { return domain.Operations() }

// Calculate validates input and computes the result of op.
func (c *Calculator) Calculate(op domain.Operation, operands []float64) (domain.Calculation, error) {
	arity := op.Arity()
	if arity == 0 {
		return domain.Calculation{}, domain.ErrUnsupportedOperation
	}
	if len(operands) != arity {
		return domain.Calculation{}, fmt.Errorf("%w: %s expects %d, got %d",
			domain.ErrInvalidOperandCount, op, arity, len(operands))
	}
	for _, v := range operands {
		if math.IsNaN(v) || math.IsInf(v, 0) {
			return domain.Calculation{}, domain.ErrInvalidOperand
		}
	}

	result, err := compute(op, operands)
	if err != nil {
		return domain.Calculation{}, err
	}
	if math.IsNaN(result) || math.IsInf(result, 0) {
		return domain.Calculation{}, domain.ErrUndefinedResult
	}
	// Normalise negative zero so clients never see "-0".
	if result == 0 {
		result = 0
	}

	return domain.Calculation{
		Operation: op,
		Operands:  append([]float64(nil), operands...),
		Result:    result,
	}, nil
}

func compute(op domain.Operation, x []float64) (float64, error) {
	switch op {
	case domain.Add:
		return x[0] + x[1], nil
	case domain.Subtract:
		return x[0] - x[1], nil
	case domain.Multiply:
		return x[0] * x[1], nil
	case domain.Divide:
		if x[1] == 0 {
			return 0, domain.ErrDivisionByZero
		}
		return x[0] / x[1], nil
	case domain.Power:
		return math.Pow(x[0], x[1]), nil
	case domain.Sqrt:
		if x[0] < 0 {
			return 0, domain.ErrNegativeSquareRoot
		}
		return math.Sqrt(x[0]), nil
	case domain.Percentage:
		return x[0] * x[1] / 100, nil
	default:
		return 0, domain.ErrUnsupportedOperation
	}
}
