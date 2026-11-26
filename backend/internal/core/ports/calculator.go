// Package ports defines the interfaces (ports) through which the outside
// world interacts with the core. Driving adapters (e.g. HTTP) depend on
// these interfaces, never on concrete services.
package ports

import "github.com/calculator/backend/internal/core/domain"

// Calculator is the driving (primary) port of the application.
type Calculator interface {
	// Calculate applies op to operands, returning a domain error on invalid input.
	Calculate(op domain.Operation, operands []float64) (domain.Calculation, error)
	// Operations lists the operations the calculator supports.
	Operations() []domain.OperationInfo
}
