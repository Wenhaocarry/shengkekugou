package main

import (
	"archive/zip"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// Build a consistent, portable snapshot without loading audio into RAM. Only
// media referenced by the current snapshot are included, not orphaned files.
func (a *App) backup(w http.ResponseWriter, r *http.Request) {
	st := a.store.snapshot()
	paths := map[string]bool{}
	for _, s := range st.Songs {
		if s.AudioURL != "" {
			paths[s.AudioURL] = true
		}
		if s.CoverURL != "" {
			paths[s.CoverURL] = true
		}
	}
	for _, m := range st.Memories {
		for _, p := range m.PhotoURLs {
			paths[p] = true
		}
		if m.PhotoURL != "" {
			paths[m.PhotoURL] = true
		}
	}
	names := make([]string, 0, len(paths))
	for p := range paths {
		name := strings.TrimPrefix(p, "/media/")
		if p == name || !mediaName.MatchString(name) {
			failure(w, bad("档案中的媒体路径无效"))
			return
		}
		names = append(names, name)
	}
	sort.Strings(names)
	tmp, err := os.CreateTemp(a.store.dir, ".backup-*.zip")
	if err != nil {
		failure(w, err)
		return
	}
	defer os.Remove(tmp.Name())
	defer tmp.Close()
	zw := zip.NewWriter(tmp)
	makeArchive := func() error {
		entry, err := zw.Create("state.json")
		if err != nil {
			return err
		}
		if err = json.NewEncoder(entry).Encode(st); err != nil {
			return err
		}
		for _, name := range names {
			source, err := os.Open(filepath.Join(a.store.dir, "media", name))
			if err != nil {
				return err
			}
			target, err := zw.CreateHeader(&zip.FileHeader{Name: "media/" + name, Method: zip.Store})
			if err != nil {
				source.Close()
				return err
			}
			_, err = io.Copy(target, source)
			source.Close()
			if err != nil {
				return err
			}
		}
		return nil
	}
	if err = makeArchive(); err != nil {
		zw.Close()
		failure(w, err)
		return
	}
	if err = zw.Close(); err != nil {
		failure(w, err)
		return
	}
	if _, err = tmp.Seek(0, io.SeekStart); err != nil {
		failure(w, err)
		return
	}
	info, err := tmp.Stat()
	if err != nil {
		failure(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", "attachment; filename=shengke-backup.zip")
	w.Header().Set("Cache-Control", "no-store")
	http.ServeContent(w, r, "shengke-backup.zip", info.ModTime(), tmp)
}
