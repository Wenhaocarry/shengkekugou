package main

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"io/fs"
	"testing"
)

func TestBackupIsPortable(t *testing.T) {
	s, err := openStore(t.TempDir(), true)
	if err != nil {
		t.Fatal(err)
	}
	ui, _ := fs.Sub(webFiles, "web")
	a := &App{store: s, ui: ui}
	w := request(t, a.handler(), "GET", "/api/backup", nil, 200)
	z, err := zip.NewReader(bytes.NewReader(w.Body.Bytes()), int64(w.Body.Len()))
	if err != nil {
		t.Fatal(err)
	}
	if len(z.File) != 4 {
		t.Fatalf("expected state + 3 audio files, got %d", len(z.File))
	}
	stateFile, err := z.Open("state.json")
	if err != nil {
		t.Fatal(err)
	}
	defer stateFile.Close()
	var state State
	if err = json.NewDecoder(stateFile).Decode(&state); err != nil {
		t.Fatal(err)
	}
	if len(state.Memories) != 3 {
		t.Fatal("memories missing from backup")
	}
}

func TestDirectoryLock(t *testing.T) {
	dir := t.TempDir()
	release, err := lockDataDirectory(dir)
	if err != nil {
		t.Fatal(err)
	}
	if release2, err := lockDataDirectory(dir); err == nil {
		release2()
		release()
		t.Fatal("second writer allowed")
	}
	release()
	release3, err := lockDataDirectory(dir)
	if err != nil {
		t.Fatal("lock not released", err)
	}
	release3()
}
