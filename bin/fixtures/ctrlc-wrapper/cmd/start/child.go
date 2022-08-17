package main

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"golang.org/x/sys/windows"
)

type Child struct {
	cmd     *exec.Cmd
	running bool
	ctrlc   chan bool
	exit    chan int
}

func NewChild() (*Child, error) {
	child := new(Child)
	child.running = false

	// Set-up command
	child.cmd = exec.Command(os.Args[1], os.Args[2:]...)
	child.cmd.SysProcAttr = &windows.SysProcAttr{
		HideWindow:    true,
		CreationFlags: windows.CREATE_NEW_CONSOLE,
	}

	// Set-up pipes
	cmdStdout, err := child.cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("Failed to create pipe for stdout: %w\n", err)
	}
	cmdStderr, err := child.cmd.StderrPipe()
	if err != nil {
		return nil, fmt.Errorf("Failed to create pipe for stderr: %w\n", err)
	}
	cmdStdin, err := child.cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("Failed to create pipe for stdin: %w\n", err)
	}

	// Forward stdout & stderr from command
	go io.Copy(os.Stdout, cmdStdout)
	go io.Copy(os.Stderr, cmdStderr)

	// Forward stdin to command until "^C" is received
	stdinScanner := bufio.NewScanner(os.Stdin)
	child.ctrlc = make(chan bool)
	go func() {
		for stdinScanner.Scan() {
			text := stdinScanner.Text()
			if text == "^C" {
				child.ctrlc <- true
				break
			}
			if child.running {
				cmdStdin.Write(stdinScanner.Bytes())
			}
		}
	}()

	// Start command
	err = child.cmd.Start()
	if err != nil {
		return nil, fmt.Errorf("Failed to start child: %w", err)
	}
	child.running = true

	// Channel for exit
	child.exit = make(chan int)
	go func() {
		child.cmd.Wait()
		child.running = false
		child.exit <- child.cmd.ProcessState.ExitCode()
	}()

	return child, nil
}

func (child Child) Terminate() (int, error) {
	if !child.running {
		return child.cmd.ProcessState.ExitCode(), nil
	}

	path, err := os.Executable()
	if err != nil {
		return -1, fmt.Errorf("Failed to get executable path: %w", err)
	}
	dir := filepath.Dir(path)
	var args []string
	if strings.Contains(dir, "go-build") {
		path, err := os.Getwd()
		if err != nil {
			return -1, fmt.Errorf("Failed to get working directory: %w", err)
		}
		args = []string{"go", "run", filepath.Join(path, "cmd", "ctrlc")}
	} else {
		args = []string{filepath.Join(dir, "ctrlc.exe")}
	}
	args = append(args, strconv.Itoa(child.cmd.Process.Pid))

	cmd := exec.Command(args[0], args[1:]...)
	err = cmd.Start()
	if err != nil {
		return -1, fmt.Errorf("Failed to start ctrlc.exe: %w", err)
	}

	select {
	case code := <-child.exit:
		return code, nil
	case <-time.After(10 * time.Second):
		child.cmd.Process.Kill()
		select {
		case code := <-child.exit:
			return code, nil
		case <-time.After(5 * time.Second):
			return -1, fmt.Errorf("Timeout reached")
		}
	}
}
