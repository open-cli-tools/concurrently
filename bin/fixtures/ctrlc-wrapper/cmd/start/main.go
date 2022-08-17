package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"
)

func fatal(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(-1)
}

func main() {
	// Parse arguments
	if len(os.Args) < 2 {
		fatal(fmt.Errorf("Missing arguments"))
	}

	// Capture SIGINT
	sig := make(chan os.Signal)
	signal.Notify(sig, syscall.SIGINT)

	// Start child
	child, err := NewChild()
	if err != nil {
		fatal(fmt.Errorf("Failed to start child: %w", err))
	}

	select {
	case <-sig: // Terminate child when SIGINT has been received
		code, err := child.Terminate()
		if err != nil {
			fatal(fmt.Errorf("Failed to terminate child: %w", err))
		}
		os.Exit(code)
	case <-child.ctrlc: // Terminate child when "^C" has been received on stdin
		code, err := child.Terminate()
		if err != nil {
			fatal(fmt.Errorf("Failed to terminate child: %w", err))
		}
		os.Exit(code)

	case code := <-child.exit: // Exit when child has exited itself
		os.Exit(code)
	}
}
