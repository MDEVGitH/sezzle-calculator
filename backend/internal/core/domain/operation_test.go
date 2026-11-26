package domain_test

import (
	"errors"
	"testing"

	"github.com/calculator/backend/internal/core/domain"
)

func TestParseOperation(t *testing.T) {
	for _, info := range domain.Operations() {
		op, err := domain.ParseOperation(string(info.Name))
		if err != nil || op != info.Name {
			t.Errorf("ParseOperation(%q) = %q, %v", info.Name, op, err)
		}
	}
	for _, bad := range []string{"", "ADD", "mod", "add "} {
		if _, err := domain.ParseOperation(bad); !errors.Is(err, domain.ErrUnsupportedOperation) {
			t.Errorf("ParseOperation(%q) error = %v, want ErrUnsupportedOperation", bad, err)
		}
	}
}

func TestArity(t *testing.T) {
	cases := map[domain.Operation]int{
		domain.Add: 2, domain.Sqrt: 1, domain.Percentage: 2, domain.Operation("x"): 0,
	}
	for op, want := range cases {
		if got := op.Arity(); got != want {
			t.Errorf("%q.Arity() = %d, want %d", op, got, want)
		}
	}
}
