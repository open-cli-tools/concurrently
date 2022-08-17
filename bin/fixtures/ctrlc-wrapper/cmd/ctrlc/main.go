package main

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"syscall"
)

const (
	ATTACH_PARENT_PROCESS = ^uint32(0) // (DWORD)-1
)

func sendCtrlC(dll *syscall.DLL, pid uint64) error {
	// Detach from current console
	// (a process can be attached to at most one console)
	proc, err := dll.FindProc("FreeConsole")
	if err != nil {
		return fmt.Errorf("FindProc: %w", err)
	}
	res, _, err := proc.Call()
	if res == 0 {
		return fmt.Errorf("FreeConsole: %w", err)
	}

	// Attach to the console of the target process
	proc, err = dll.FindProc("AttachConsole")
	if err != nil {
		return fmt.Errorf("FindProc: %w", err)
	}
	res, _, err = proc.Call(uintptr(pid))
	if res == 0 {
		return fmt.Errorf("AttachConsole: %w", err)
	}

	// Ignore CTRL+C signal for this process
	proc, err = dll.FindProc("SetConsoleCtrlHandler")
	if err != nil {
		return fmt.Errorf("FindProc: %w", err)
	}
	res, _, err = proc.Call(0, 1)
	if res == 0 {
		return fmt.Errorf("SetConsoleCtrlHandler: %w", err)
	}

	// Send CTRL+C signal to the current process group
	proc, err = dll.FindProc("GenerateConsoleCtrlEvent")
	if err != nil {
		return fmt.Errorf("FindProc: %w", err)
	}
	res, _, err = proc.Call(syscall.CTRL_C_EVENT, 0)
	if res == 0 {
		return fmt.Errorf("GenerateConsoleCtrlEvent: %w", err)
	}

	return nil
}

// Try to re-attach to parent console
// (to be able to log errors to the original console)
func cleanup(dll *syscall.DLL) {
	proc, err := dll.FindProc("FreeConsole")
	if err != nil {
		return
	}
	res, _, _ := proc.Call()
	if res == 0 {
		return
	}
	proc, err = dll.FindProc("AttachConsole")
	if err != nil {
		return
	}
	proc.Call(uintptr(ATTACH_PARENT_PROCESS))
}

func main() {
	logger := log.New(os.Stderr, "", 0)

	// Parse argument
	if len(os.Args) != 2 {
		logger.Fatalln("Expected one argument")
	}
	pid, err := strconv.ParseUint(os.Args[1], 10, 32)
	if err != nil {
		logger.Fatalln("Expected a PID as argument")
	}

	// Load DLL
	dll, err := syscall.LoadDLL("kernel32.dll")
	if err != nil {
		logger.Fatalf("Failed to load DLL: %v\n", err)
	}

	// Send CTRL+C signal
	err = sendCtrlC(dll, pid)
	if err != nil {
		cleanup(dll)
		logger.Fatalf("Failed to send CTRL+C signal: %v\n", err)
	}
}
