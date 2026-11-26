package domain

import "errors"

// Domain errors. Adapters map these to transport-specific responses.
var (
	ErrUnsupportedOperation = errors.New("unsupported operation")
	ErrInvalidOperandCount  = errors.New("invalid number of operands")
	ErrInvalidOperand       = errors.New("operands must be finite numbers")
	ErrDivisionByZero       = errors.New("division by zero")
	ErrNegativeSquareRoot   = errors.New("square root of a negative number")
	ErrUndefinedResult      = errors.New("result is undefined or out of range")
)
