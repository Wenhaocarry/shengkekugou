package main

import (
	"archive/zip"
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"testing"
)

func TestPRDPhotosClockAndBackup(t *testing.T) {
	a, h := testApp(t)
	in := input()
	for n := 0; n < 3; n++ {
		name := fmt.Sprintf("%024x.png", n+1)
		if err := os.WriteFile(filepath.Join(a.store.dir, "media", name), []byte("fixture"), 0600); err != nil {
			t.Fatal(err)
		}
		in.PhotoURLs = append(in.PhotoURLs, "/media/"+name)
	}
	in.RecordTime = "15:33"
	created := decodeResponse[Memory](t, request(t, h, "POST", "/api/memories", in, 201))
	if len(created.PhotoURLs) != 3 || created.PhotoURL != in.PhotoURLs[0] || created.RecordTime != "15:33" {
		t.Fatalf("lost PRD fields: %+v", created)
	}
	restarted, err := openStore(a.store.dir, false)
	if err != nil {
		t.Fatal(err)
	}
	if len(restarted.snapshot().Memories[0].PhotoURLs) != 3 {
		t.Fatal("photos lost on restart")
	}
	backup := request(t, h, "GET", "/api/backup", nil, 200)
	archive, err := zip.NewReader(bytes.NewReader(backup.Body.Bytes()), int64(backup.Body.Len()))
	if err != nil {
		t.Fatal(err)
	}
	if len(archive.File) != 4 {
		t.Fatalf("expected state + all 3 photos, got %d", len(archive.File))
	}
	in.PhotoURLs = append(in.PhotoURLs, in.PhotoURLs[0])
	request(t, h, "POST", "/api/memories", in, 400)
	in.PhotoURLs = in.PhotoURLs[:3]
	in.RecordTime = "25:61"
	request(t, h, "POST", "/api/memories", in, 400)
	in.RecordTime = "16:32"
	in.PhotoURLs = in.PhotoURLs[1:]
	in.PhotoURL = ""
	updated := decodeResponse[Memory](t, request(t, h, "PUT", "/api/memories/"+created.ID, in, 200))
	if len(updated.PhotoURLs) != 2 || updated.PhotoURL != in.PhotoURLs[0] || updated.RecordTime != "16:32" {
		t.Fatal("photo removal or time edit failed")
	}
}

func TestPDFH5IsDefaultEntry(t *testing.T) {
	_, h := testApp(t)
	body := request(t, h, "GET", "/", nil, 200).Body.String()
	if !bytes.Contains([]byte(body), []byte("/kugou.js")) {
		t.Fatal("old UI still served")
	}
	request(t, h, "GET", "/kugou.css", nil, 200)
	request(t, h, "GET", "/prd-player.jpg", nil, 200)
}
