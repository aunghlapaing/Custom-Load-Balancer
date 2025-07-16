package logger

import (
	"testing"

	"go.uber.org/zap"
	"go.uber.org/zap/zaptest/observer"
)

func TestLoggerInfoAndError(t *testing.T) {
	core, recorded := observer.New(zap.InfoLevel)
	log := zap.New(core)
	zap.ReplaceGlobals(log)

	Info("info message")
	Error("error message", nil)
	Debug("debug message")

	if recorded.Len() == 0 {
		t.Error("expected at least one log entry")
	}
}
