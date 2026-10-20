package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

func testApp(t *testing.T) (*App, http.Handler) {
	t.Helper()
	st, err := openStore(t.TempDir(), false)
	if err != nil {
		t.Fatal(err)
	}
	if err := st.mutate(func(s *State) error {
		s.Songs = append(s.Songs, Song{ID: "test-song", Title: "测试歌曲", Duration: 40, Color: "#a6c8b8", Lyrics: []Lyric{}, CreatedAt: now()})
		return nil
	}); err != nil {
		t.Fatal(err)
	}
	ui, _ := fs.Sub(webFiles, "web")
	a := &App{store: st, ui: ui}
	return a, a.handler()
}
func request(t *testing.T, h http.Handler, method, path string, body any, want int) *httptest.ResponseRecorder {
	t.Helper()
	var reader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			t.Fatal(err)
		}
		reader = bytes.NewReader(b)
	}
	r := httptest.NewRequest(method, path, reader)
	if body != nil {
		r.Header.Set("Content-Type", "application/json")
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != want {
		t.Fatalf("%s %s: got %d want %d: %s", method, path, w.Code, want, w.Body.String())
	}
	return w
}
func decodeResponse[T any](t *testing.T, w *httptest.ResponseRecorder) T {
	t.Helper()
	var v T
	if err := json.Unmarshal(w.Body.Bytes(), &v); err != nil {
		t.Fatal(err)
	}
	return v
}
func input() memoryInput {
	return memoryInput{SongID: "test-song", Position: 8, Note: "今天终于准点下班", Mood: "松口气", Scenes: []string{"通勤路上", "日落时分"}, Location: "深圳", Visibility: "private", Date: "2026-09-08"}
}

func TestMemoryLifecycleAndRestart(t *testing.T) {
	a, h := testApp(t)
	c := decodeResponse[Chapter](t, request(t, h, "POST", "/api/chapters", map[string]string{"title": "平凡的一周", "description": "小小的进步", "color": "#abcdef"}, 200))
	in := input()
	in.ChapterID = c.ID
	m := decodeResponse[Memory](t, request(t, h, "POST", "/api/memories", in, 201))
	if m.Sample || m.ID == "" || m.Replies == nil || len(m.Scenes) != 2 || m.Location != "深圳" || m.Visibility != "private" {
		t.Fatalf("invalid new memory: %+v", m)
	}
	request(t, h, "POST", "/api/memories/"+m.ID+"/replies", map[string]string{"note": "后来工作真的轻松了", "date": "2026-09-09"}, 201)
	in.Note = "今天终于准点下班，还看到了晚霞"
	in.Position = 9.5
	updated := decodeResponse[Memory](t, request(t, h, "PUT", "/api/memories/"+m.ID, in, 200))
	if len(updated.Replies) != 1 || updated.Note != in.Note || updated.CreatedAt != m.CreatedAt {
		t.Fatal("editing overwrote history")
	}
	restarted, err := openStore(a.store.dir, true)
	if err != nil {
		t.Fatal(err)
	}
	saved := restarted.snapshot()
	if len(saved.Memories) != 1 || len(saved.Memories[0].Replies) != 1 || len(saved.Songs) != 1 {
		t.Fatal("restart lost data or reseeded")
	}
	request(t, h, "DELETE", "/api/songs/test-song", nil, 409)
	request(t, h, "DELETE", "/api/chapters/"+c.ID, nil, 200)
	if a.store.snapshot().Memories[0].ChapterID != "" {
		t.Fatal("deleted chapter reference remained")
	}
	request(t, h, "DELETE", "/api/memories/"+m.ID, nil, 200)
	request(t, h, "DELETE", "/api/songs/test-song", nil, 200)
	request(t, h, "DELETE", "/api/memories/"+m.ID, nil, 404)
	if len(a.store.snapshot().Songs) != 0 || len(a.store.snapshot().Memories) != 0 {
		t.Fatal("delete failed")
	}
}

func TestMemoryValidation(t *testing.T) {
	a, h := testApp(t)
	cases := []struct {
		name  string
		alter func(*memoryInput)
	}{
		{"negative position", func(i *memoryInput) { i.Position = -1 }},
		{"past duration", func(i *memoryInput) { i.Position = 41 }},
		{"unknown song", func(i *memoryInput) { i.SongID = "missing" }},
		{"unknown chapter", func(i *memoryInput) { i.ChapterID = "missing" }},
		{"empty memory", func(i *memoryInput) { i.Note = "  "; i.Mood = "" }},
		{"long note", func(i *memoryInput) { i.Note = strings.Repeat("刻", 1001) }},
		{"too many scenes", func(i *memoryInput) { i.Scenes = []string{"一", "二", "三", "四"} }},
		{"long scene", func(i *memoryInput) { i.Scenes = []string{strings.Repeat("刻", 21)} }},
		{"long location", func(i *memoryInput) { i.Location = strings.Repeat("刻", 81) }},
		{"invalid visibility", func(i *memoryInput) { i.Visibility = "everyone" }},
		{"invalid date", func(i *memoryInput) { i.Date = "2026-02-30" }},
		{"external photo", func(i *memoryInput) { i.PhotoURL = "https://example.com/a.jpg" }},
		{"missing local photo", func(i *memoryInput) { i.PhotoURL = "/media/0123456789abcdef01234567.jpg" }},
		{"traversal photo", func(i *memoryInput) { i.PhotoURL = "/media/../../state.json" }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) { i := input(); tc.alter(&i); request(t, h, "POST", "/api/memories", i, 400) })
	}
	request(t, h, "POST", "/api/memories", map[string]any{"song_id": "test-song", "sample": true}, 400)
	for _, raw := range []string{`{"position":NaN}`, `{} {}`, `{"position":1e999}`} {
		r := httptest.NewRequest("POST", "/api/memories", strings.NewReader(raw))
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Code != 400 {
			t.Fatalf("invalid JSON accepted: %s", raw)
		}
	}
	if len(a.store.snapshot().Memories) != 0 {
		t.Fatal("invalid writes changed state")
	}
	request(t, h, "POST", "/api/memories/unknown/replies", map[string]string{"note": "hi", "date": "2026-09-08"}, 404)
	request(t, h, "POST", "/api/memories/unknown/replies", map[string]string{"note": "   ", "date": "2026-09-08"}, 400)
}

func TestConcurrentReplies(t *testing.T) {
	a, h := testApp(t)
	m := decodeResponse[Memory](t, request(t, h, "POST", "/api/memories", input(), 201))
	var wg sync.WaitGroup
	for n := 0; n < 24; n++ {
		wg.Add(1)
		go func(n int) {
			defer wg.Done()
			body := fmt.Sprintf(`{"note":"answer %d","date":"2026-09-08"}`, n)
			r := httptest.NewRequest("POST", "/api/memories/"+m.ID+"/replies", strings.NewReader(body))
			w := httptest.NewRecorder()
			h.ServeHTTP(w, r)
			if w.Code != 201 {
				t.Errorf("reply failed: %d", w.Code)
			}
		}(n)
	}
	wg.Wait()
	reloaded, err := openStore(a.store.dir, false)
	if err != nil {
		t.Fatal(err)
	}
	if got := len(reloaded.snapshot().Memories[0].Replies); got != 24 {
		t.Fatalf("lost concurrent update: %d", got)
	}
}

func multipartRequest(t *testing.T, h http.Handler, path, name string, b []byte, fields map[string]string, want int) *httptest.ResponseRecorder {
	t.Helper()
	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	part, err := mw.CreateFormFile("file", name)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = part.Write(b); err != nil {
		t.Fatal(err)
	}
	for k, v := range fields {
		if err = mw.WriteField(k, v); err != nil {
			t.Fatal(err)
		}
	}
	if err = mw.Close(); err != nil {
		t.Fatal(err)
	}
	r := httptest.NewRequest("POST", path, &body)
	r.Header.Set("Content-Type", mw.FormDataContentType())
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != want {
		t.Fatalf("upload %s got %d want %d: %s", name, w.Code, want, w.Body.String())
	}
	return w
}

func TestUploadAndMediaRange(t *testing.T) {
	a, h := testApp(t)
	// Small valid PCM WAV with a deterministic, silent payload.
	wav := append([]byte{'R', 'I', 'F', 'F', 68, 0, 0, 0, 'W', 'A', 'V', 'E', 'f', 'm', 't', ' ', 16, 0, 0, 0, 1, 0, 1, 0, 0x44, 0xac, 0, 0, 0x88, 0x58, 1, 0, 2, 0, 16, 0, 'd', 'a', 't', 'a', 32, 0, 0, 0}, make([]byte, 32)...)
	fields := map[string]string{"title": "我的歌", "artist": "自己", "duration": "0.1", "color": "#badbad"}
	s := decodeResponse[Song](t, multipartRequest(t, h, "/api/songs", "../../evil.wav", wav, fields, 201))
	if s.Sample || !strings.HasPrefix(s.AudioURL, "/media/") || strings.Contains(s.AudioURL, "evil") {
		t.Fatal("unsafe media filename")
	}
	r := httptest.NewRequest("GET", s.AudioURL, nil)
	r.Header.Set("Range", "bytes=0-11")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 206 || w.Header().Get("Content-Range") != "bytes 0-11/76" || !bytes.Equal(w.Body.Bytes(), wav[:12]) {
		t.Fatalf("range failed: %d %s", w.Code, w.Header())
	}
	multipartRequest(t, h, "/api/songs", "fake.mp3", []byte("<html><script>alert(1)</script></html>"), fields, 400)
	before, _ := os.ReadDir(filepath.Join(a.store.dir, "media"))
	fields["duration"] = "NaN"
	multipartRequest(t, h, "/api/songs", "bad.wav", wav, fields, 400)
	after, _ := os.ReadDir(filepath.Join(a.store.dir, "media"))
	if len(before) != len(after) {
		t.Fatal("invalid upload orphaned audio")
	}
	multipartRequest(t, h, "/api/photos", "x.svg", []byte(`<svg xmlns="http://www.w3.org/2000/svg"/>`), nil, 400)
	// The image signature and payload below represent a 1x1 PNG.
	png := []byte{137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137}
	photo := decodeResponse[map[string]string](t, multipartRequest(t, h, "/api/photos", "cover.png", png, nil, 201))
	i := input()
	i.PhotoURL = photo["url"]
	request(t, h, "POST", "/api/memories", i, 201)
	if !a.validPhoto(photo["url"]) {
		t.Fatal("uploaded image not accepted")
	}
}

func TestSettingsExportAndOriginProtection(t *testing.T) {
	_, h := testApp(t)
	request(t, h, "PUT", "/api/settings", Settings{MemoryHints: false, DemoMember: true}, 200)
	st := decodeResponse[State](t, request(t, h, "GET", "/api/state", nil, 200))
	if st.Settings.MemoryHints || !st.Settings.DemoMember {
		t.Fatal("settings not updated")
	}
	w := request(t, h, "GET", "/api/export", nil, 200)
	if !strings.Contains(w.Header().Get("Content-Disposition"), "attachment") {
		t.Fatal("export not downloadable")
	}
	request(t, h, "POST", "/api/events", map[string]string{"name": "memory_created"}, 400)
	request(t, h, "POST", "/api/events", map[string]string{"name": "memory_opened"}, 200)
	for _, headers := range []map[string]string{{"Origin": "https://evil.invalid"}, {"Sec-Fetch-Site": "cross-site"}} {
		r := httptest.NewRequest("PUT", "/api/settings", strings.NewReader(`{}`))
		for k, v := range headers {
			r.Header.Set(k, v)
		}
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Code != 403 {
			t.Fatal("cross-site write was accepted")
		}
	}
	r := httptest.NewRequest("PUT", "/api/settings", strings.NewReader(`{"memory_hints":true,"demo_member":false}`))
	r.Header.Set("Origin", "http://example.com")
	w = httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 200 {
		t.Fatal("same-origin rejected")
	}
	for _, path := range []string{"/", "/app.js", "/kugou.js", "/bridge.js", "/kugou.css", "/prd-player.jpg", "/favicon.svg"} {
		w := request(t, h, "GET", path, nil, 200)
		if w.Header().Get("X-Content-Type-Options") != "nosniff" || w.Header().Get("Content-Security-Policy") == "" {
			t.Fatal("security headers missing")
		}
	}
}

func TestLRCParsingAndReplacement(t *testing.T) {
	raw := "[offset:-100]\n[00:10.50][00:20.125]同一句\n[00:01.5]开始\n[00:00.00]前奏\n[00:99]忽略\n[02:00]忽略"
	ls := parseLRC(raw, 40)
	if len(ls) != 4 || ls[0].Time != 0 || ls[1].Time != 1.4 || ls[2].Time != 10.4 || ls[3].Text != "同一句" {
		t.Fatalf("unexpected lyrics: %+v", ls)
	}
	a, h := testApp(t)
	request(t, h, "PUT", "/api/songs/test-song/lyrics", map[string]string{"lrc": raw}, 200)
	request(t, h, "PUT", "/api/songs/test-song/lyrics", map[string]string{"lrc": "plain text"}, 400)
	if len(a.store.snapshot().Songs[0].Lyrics) != 4 {
		t.Fatal("invalid lyrics overwrote old lyrics")
	}
	request(t, h, "PUT", "/api/songs/missing/lyrics", map[string]string{"lrc": raw}, 404)
}

func TestPersistenceRollbackAndCorruptFile(t *testing.T) {
	a, _ := testApp(t)
	st := a.store
	expected := errors.New("abort")
	if err := st.mutate(func(s *State) error { s.Songs = nil; return expected }); !errors.Is(err, expected) {
		t.Fatal("expected transaction failure")
	}
	if len(st.snapshot().Songs) != 1 {
		t.Fatal("failed mutation changed live state")
	}
	oldDir := st.dir
	st.dir = filepath.Join(oldDir, "missing-parent", "missing")
	if err := st.mutate(func(s *State) error { s.Songs = nil; return nil }); err == nil {
		t.Fatal("expected storage failure")
	}
	if len(st.snapshot().Songs) != 1 {
		t.Fatal("disk failure changed live state")
	}
	st.dir = oldDir
	path := filepath.Join(t.TempDir(), "state.json")
	badData := []byte("{broken")
	if err := os.WriteFile(path, badData, 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := openStore(filepath.Dir(path), true); err == nil {
		t.Fatal("corrupt state silently reset")
	}
	b, _ := os.ReadFile(path)
	if !bytes.Equal(b, badData) {
		t.Fatal("corrupt original overwritten")
	}
}

func TestSeedAndEventCap(t *testing.T) {
	s, err := openStore(t.TempDir(), true)
	if err != nil {
		t.Fatal(err)
	}
	st := s.snapshot()
	if len(st.Songs) != 3 || len(st.Memories) != 3 || len(st.Chapters) != 2 {
		t.Fatal("seed incomplete")
	}
	for _, song := range st.Songs {
		b, err := os.ReadFile(filepath.Join(s.dir, strings.TrimPrefix(song.AudioURL, "/")))
		if err != nil || mediaExtension(b, false) != ".wav" || !song.Sample {
			t.Fatal("seed audio invalid")
		}
	}
	for _, m := range st.Memories {
		if !m.Sample || songByID(&st, m.SongID) == nil {
			t.Fatal("sample memory invalid")
		}
	}
	for n := 0; n < 2010; n++ {
		record(&st, "song_played")
	}
	if len(st.Events) != 2000 {
		t.Fatal("event history unbounded")
	}
}
