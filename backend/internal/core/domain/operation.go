// Package domain holds the calculator's core business types. It has no
// dependencies on transport, frameworks or infrastructure.
package domain

import "sort"

// Operation identifies an arithmetic operation supported by the calculator.
type Operation string

const (
	Add        Operation = "add"
	Subtract   Operation = "subtract"
	Multiply   Operation = "multiply"
	Divide     Operation = "divide"
	Power      Operation = "power"
	Sqrt       Operation = "sqrt"
	Percentage Operation = "percentage"
)

// OperationInfo describes an operation for API consumers.
type OperationInfo struct {
	Name        Operation `json:"name"`
	Arity       int       `json:"arity"`
	Description string    `json:"description"`
}

var catalog = map[Operation]OperationInfo{
	Add:        {Add, 2, "a + b"},
	Subtract:   {Subtract, 2, "a - b"},
	Multiply:   {Multiply, 2, "a × b"},
	Divide:     {Divide, 2, "a ÷ b"},
	Power:      {Power, 2, "a raised to the power b"},
	Sqrt:       {Sqrt, 1, "square root of a"},
	Percentage: {Percentage, 2, "a percent of b (a × b / 100)"},
}

// ParseOperation converts a raw string into a supported Operation.
func ParseOperation(raw string) (Operation, error) {
	op := Operation(raw)
	if _, ok := catalog[op]; !ok {
		return "", ErrUnsupportedOperation
	}
	return op, nil
}

// Arity returns the number of operands the operation expects (0 if unknown).
func (o Operation) Arity() int {
	return catalog[o].Arity
}

// Operations returns all supported operations sorted by name.
func Operations() []OperationInfo {
	out := make([]OperationInfo, 0, len(catalog))
	for _, info := range catalog {
		out = append(out, info)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out
}

// Calculation is the outcome of applying an Operation to its operands.
type Calculation struct {
	Operation Operation `json:"operation"`
	Operands  []float64 `json:"operands"`
	Result    float64   `json:"result"`
}
