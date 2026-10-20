package main

import (
	"bytes"
	"io/fs"
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func TestPlaylistExpansionPreservesDataAndIsIdempotent(t *testing.T) {
	s, err := openStore(t.TempDir(), true)
	if err != nil {
		t.Fatal(err)
	}
	before := s.snapshot()
	if err := s.expandPlaylistDemo(); err != nil {
		t.Fatal(err)
	}
	after := s.snapshot()
	if len(after.Songs) != 12 || len(after.Memories) != 17 {
		t.Fatalf("songs=%d memories=%d", len(after.Songs), len(after.Memories))
	}
	if !reflect.DeepEqual(before.Songs, after.Songs[:3]) || !reflect.DeepEqual(before.Memories, after.Memories[:3]) {
		t.Fatal("existing data changed")
	}
	ui, _ := fs.Sub(webFiles, "web")
	h := (&App{store: s, ui: ui}).handler()
	for _, song := range after.Songs[3:] {
		if _, err := os.Stat(filepath.Join(s.dir, song.AudioURL)); err != nil {
			t.Fatal(err)
		}
		if _, err := webFiles.ReadFile("web" + song.CoverURL); err != nil {
			t.Fatal(err)
		}
		if !song.Sample {
			t.Fatal("demo song not marked")
		}
		response := request(t, h, "GET", song.AudioURL, nil, 200)
		if !bytes.HasPrefix(response.Body.Bytes(), []byte("RIFF")) {
			t.Fatalf("demo audio did not return WAV: %s", song.AudioURL)
		}
	}
	for _, name := range []string{"pdf-demo-secret.wav", "pdf-demo-quiet.png", "pdf-demo-quiet.svg"} {
		if err := os.WriteFile(filepath.Join(s.dir, "media", name), []byte("blocked fixture"), 0600); err != nil {
			t.Fatal(err)
		}
		request(t, h, "GET", "/media/"+name, nil, 404)
	}
	if err := s.expandPlaylistDemo(); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(after, s.snapshot()) {
		t.Fatal("repeat expansion added or changed data")
	}
	reopened, err := openStore(s.dir, false)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(after, reopened.snapshot()) {
		t.Fatal("expansion not persisted")
	}
}
