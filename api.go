package main

import (
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"log"
	"math"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

type App struct {
	store *Store
	ui    fs.FS
}
type apiError struct {
	status  int
	message string
}

func (e apiError) Error() string { return e.message }
func bad(msg string) error       { return apiError{400, msg} }
func missing() error             { return apiError{404, "记录不存在"} }
func respond(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func failure(w http.ResponseWriter, err error) {
	var ae apiError
	if errors.As(err, &ae) {
		respond(w, ae.status, map[string]string{"error": ae.message})
		return
	}
	log.Printf("request failed: %v", err)
	respond(w, 500, map[string]string{"error": "保存失败，请重试；原数据仍保留"})
}
func decode(w http.ResponseWriter, r *http.Request, v any) error {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if err := d.Decode(v); err != nil {
		return bad("请求内容无效")
	}
	if d.Decode(&struct{}{}) != io.EOF {
		return bad("请求只能包含一个 JSON 对象")
	}
	return nil
}
func (a *App) handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/state", func(w http.ResponseWriter, r *http.Request) { respond(w, 200, a.store.snapshot()) })
	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		b, err := fs.ReadFile(a.ui, "index.html")
		if err != nil {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache")
		_, _ = w.Write(b)
	})
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		respond(w, 200, map[string]string{"status": "ok", "mode": "local-single-user"})
	})
	mux.HandleFunc("GET /api/backup", a.backup)
	mux.HandleFunc("GET /api/export", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Disposition", "attachment; filename=shengke-memories.json")
		respond(w, 200, a.store.snapshot())
	})
	mux.HandleFunc("POST /api/songs", a.uploadSong)
	mux.HandleFunc("DELETE /api/songs/{id}", a.deleteSong)
	mux.HandleFunc("PUT /api/songs/{id}/lyrics", a.setLyrics)
	mux.HandleFunc("POST /api/photos", a.uploadPhoto)
	mux.HandleFunc("POST /api/memories", a.createMemory)
	mux.HandleFunc("PUT /api/memories/{id}", a.updateMemory)
	mux.HandleFunc("DELETE /api/memories/{id}", a.deleteMemory)
	mux.HandleFunc("POST /api/memories/{id}/replies", a.reply)
	mux.HandleFunc("POST /api/chapters", a.chapter)
	mux.HandleFunc("PUT /api/chapters/{id}", a.chapter)
	mux.HandleFunc("DELETE /api/chapters/{id}", a.deleteChapter)
	mux.HandleFunc("PUT /api/settings", a.settings)
	mux.HandleFunc("POST /api/events", a.event)
	mux.HandleFunc("GET /media/{file}", a.media)
	mux.Handle("GET /", http.FileServer(http.FS(a.ui)))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "same-origin")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'")
		// Local single-user app: reject cross-site writes, including multipart form submissions.
		if r.Method != "GET" && r.Method != "HEAD" {
			origin := r.Header.Get("Origin")
			if origin != "" {
				u, err := url.Parse(origin)
				if err != nil || u.Host != r.Host {
					respond(w, 403, map[string]string{"error": "不允许跨站修改"})
					return
				}
			}
			if r.Header.Get("Sec-Fetch-Site") == "cross-site" {
				respond(w, 403, map[string]string{"error": "不允许跨站修改"})
				return
			}
		}
		mux.ServeHTTP(w, r)
	})
}
func songByID(st *State, id string) *Song {
	for i := range st.Songs {
		if st.Songs[i].ID == id {
			return &st.Songs[i]
		}
	}
	return nil
}
func memByID(st *State, id string) *Memory {
	for i := range st.Memories {
		if st.Memories[i].ID == id {
			return &st.Memories[i]
		}
	}
	return nil
}
func chapterExists(st *State, id string) bool {
	if id == "" {
		return true
	}
	for _, c := range st.Chapters {
		if c.ID == id {
			return true
		}
	}
	return false
}
func validDate(s string) bool {
	t, e := time.Parse("2006-01-02", s)
	return e == nil && t.Year() >= 1900 && t.Year() <= time.Now().Year()+1
}
func textOK(s string, n int) bool { return utf8.ValidString(s) && utf8.RuneCountInString(s) <= n }

var hexColor = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)
var mediaName = regexp.MustCompile(`^(?:(?:[a-f0-9]{24}|sample-[abc])\.(?:mp3|wav|flac|ogg|m4a|webm|jpg|png|webp)|pdf-demo-(?:quiet|heal|rain|heart|repeat|night|first|alone|summer)\.wav)$`)

func (a *App) validPhoto(p string) bool {
	if p == "" {
		return true
	}
	name := strings.TrimPrefix(p, "/media/")
	if p == name || !mediaName.MatchString(name) {
		return false
	}
	ext := filepath.Ext(name)
	if ext != ".jpg" && ext != ".png" && ext != ".webp" {
		return false
	}
	_, err := os.Stat(filepath.Join(a.store.dir, "media", name))
	return err == nil
}

type memoryInput struct {
	SongID     string   `json:"song_id"`
	Position   float64  `json:"position"`
	Note       string   `json:"note"`
	Mood       string   `json:"mood"`
	Scenes     []string `json:"scenes"`
	Location   string   `json:"location"`
	Visibility string   `json:"visibility"`
	Date       string   `json:"date"`
	PhotoURL   string   `json:"photo_url"`
	PhotoURLs  []string `json:"photo_urls"`
	RecordTime string   `json:"record_time"`
	ChapterID  string   `json:"chapter_id"`
}

func (a *App) validateMemory(st *State, in *memoryInput) error {
	in.Note = strings.TrimSpace(in.Note)
	if len(in.PhotoURLs) > 3 {
		return bad("图片最多选择 3 张")
	}
	for _, p := range in.PhotoURLs {
		if p == "" || !a.validPhoto(p) {
			return bad("照片不存在")
		}
	}
	if len(in.PhotoURLs) > 0 {
		in.PhotoURL = in.PhotoURLs[0]
	}
	if in.RecordTime != "" {
		if _, err := time.Parse("15:04", in.RecordTime); err != nil {
			return bad("记录时间无效")
		}
	}
	in.Mood = strings.TrimSpace(in.Mood)
	in.Location = strings.TrimSpace(in.Location)
	in.Visibility = strings.TrimSpace(in.Visibility)
	if in.Visibility == "" {
		in.Visibility = "private"
	}
	cleanScenes := make([]string, 0, len(in.Scenes))
	seenScenes := map[string]bool{}
	for _, scene := range in.Scenes {
		scene = strings.TrimSpace(scene)
		if scene != "" && !seenScenes[scene] {
			seenScenes[scene] = true
			cleanScenes = append(cleanScenes, scene)
		}
	}
	in.Scenes = cleanScenes
	s := songByID(st, in.SongID)
	if s == nil {
		return bad("请选择有效歌曲")
	}
	if math.IsNaN(in.Position) || math.IsInf(in.Position, 0) || in.Position < 0 || in.Position > s.Duration {
		return bad("刻点超出歌曲时长")
	}
	if !textOK(in.Note, 1000) || !textOK(in.Mood, 20) || !textOK(in.Location, 80) {
		return bad("文字过长")
	}
	if len(in.Scenes) > 3 {
		return bad("场景最多选择 3 个")
	}
	for _, scene := range in.Scenes {
		if !textOK(scene, 20) {
			return bad("场景文字过长")
		}
	}
	if in.Visibility != "private" && in.Visibility != "friends" && in.Visibility != "public" {
		return bad("可见范围无效")
	}
	if in.Note == "" && in.Mood == "" && in.PhotoURL == "" {
		return bad("请留下一句话、心情或照片")
	}
	if !validDate(in.Date) {
		return bad("日期无效")
	}
	if !chapterExists(st, in.ChapterID) {
		return bad("章节不存在")
	}
	if !a.validPhoto(in.PhotoURL) {
		return bad("照片不存在")
	}
	return nil
}
func (a *App) createMemory(w http.ResponseWriter, r *http.Request) {
	var in memoryInput
	if err := decode(w, r, &in); err != nil {
		failure(w, err)
		return
	}
	var result Memory
	err := a.store.mutate(func(st *State) error {
		if err := a.validateMemory(st, &in); err != nil {
			return err
		}
		result = Memory{ID: id(), SongID: in.SongID, Position: in.Position, Note: in.Note, Mood: in.Mood, Scenes: in.Scenes, Location: in.Location, Visibility: in.Visibility, Date: in.Date, PhotoURL: in.PhotoURL, ChapterID: in.ChapterID, Replies: []Reply{}, CreatedAt: now()}
		st.Memories = append(st.Memories, result)
		st.Memories[len(st.Memories)-1].PhotoURLs = in.PhotoURLs
		st.Memories[len(st.Memories)-1].RecordTime = in.RecordTime
		result = st.Memories[len(st.Memories)-1]
		record(st, "memory_created")
		return nil
	})
	if err != nil {
		failure(w, err)
		return
	}
	respond(w, 201, result)
}
func (a *App) updateMemory(w http.ResponseWriter, r *http.Request) {
	var in memoryInput
	if err := decode(w, r, &in); err != nil {
		failure(w, err)
		return
	}
	var result Memory
	err := a.store.mutate(func(st *State) error {
		m := memByID(st, r.PathValue("id"))
		if m == nil {
			return missing()
		}
		if err := a.validateMemory(st, &in); err != nil {
			return err
		}
		m.SongID = in.SongID
		m.Position = in.Position
		m.Note = in.Note
		m.Mood = in.Mood
		m.Scenes = in.Scenes
		m.Location = in.Location
		m.Visibility = in.Visibility
		m.Date = in.Date
		m.PhotoURL = in.PhotoURL
		m.PhotoURLs = in.PhotoURLs
		m.RecordTime = in.RecordTime
		m.ChapterID = in.ChapterID
		result = *m
		return nil
	})
	if err != nil {
		failure(w, err)
		return
	}
	respond(w, 200, result)
}
func (a *App) deleteMemory(w http.ResponseWriter, r *http.Request) {
	err := a.store.mutate(func(st *State) error {
		for i, m := range st.Memories {
			if m.ID == r.PathValue("id") {
				st.Memories = append(st.Memories[:i], st.Memories[i+1:]...)
				return nil
			}
		}
		return missing()
	})
	if err != nil {
		failure(w, err)
		return
	}
	respond(w, 200, map[string]bool{"ok": true})
}
func (a *App) reply(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Note string `json:"note"`
		Date string `json:"date"`
	}
	if err := decode(w, r, &in); err != nil {
		failure(w, err)
		return
	}
	in.Note = strings.TrimSpace(in.Note)
	if in.Note == "" || !textOK(in.Note, 1000) || !validDate(in.Date) {
		failure(w, bad("请填写有效日期和 1–1000 字的回答"))
		return
	}
	result := Reply{ID: id(), Note: in.Note, Date: in.Date, CreatedAt: now()}
	err := a.store.mutate(func(st *State) error {
		m := memByID(st, r.PathValue("id"))
		if m == nil {
			return missing()
		}
		m.Replies = append(m.Replies, result)
		record(st, "memory_replied")
		return nil
	})
	if err != nil {
		failure(w, err)
		return
	}
	respond(w, 201, result)
}
func (a *App) chapter(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		Color       string `json:"color"`
	}
	if err := decode(w, r, &in); err != nil {
		failure(w, err)
		return
	}
	in.Title = strings.TrimSpace(in.Title)
	if in.Title == "" || !textOK(in.Title, 40) || !textOK(in.Description, 300) || !hexColor.MatchString(in.Color) {
		failure(w, bad("章节标题、描述或颜色无效"))
		return
	}
	var result Chapter
	err := a.store.mutate(func(st *State) error {
		if r.Method == "POST" {
			result = Chapter{ID: id(), Title: in.Title, Description: in.Description, Color: in.Color, CreatedAt: now()}
			st.Chapters = append(st.Chapters, result)
			return nil
		}
		for i := range st.Chapters {
			c := &st.Chapters[i]
			if c.ID == r.PathValue("id") {
				c.Title = in.Title
				c.Description = in.Description
				c.Color = in.Color
				result = *c
				return nil
			}
		}
		return missing()
	})
	if err != nil {
		failure(w, err)
		return
	}
	respond(w, 200, result)
}
func (a *App) deleteChapter(w http.ResponseWriter, r *http.Request) {
	err := a.store.mutate(func(st *State) error {
		for i, c := range st.Chapters {
			if c.ID == r.PathValue("id") {
				st.Chapters = append(st.Chapters[:i], st.Chapters[i+1:]...)
				for j := range st.Memories {
					if st.Memories[j].ChapterID == c.ID {
						st.Memories[j].ChapterID = ""
					}
				}
				return nil
			}
		}
		return missing()
	})
	if err != nil {
		failure(w, err)
		return
	}
	respond(w, 200, map[string]bool{"ok": true})
}
func (a *App) deleteSong(w http.ResponseWriter, r *http.Request) {
	err := a.store.mutate(func(st *State) error {
		sid := r.PathValue("id")
		for _, m := range st.Memories {
			if m.SongID == sid {
				return apiError{409, "这首歌仍有关联记忆，请先处理记忆再删除"}
			}
		}
		for i, s := range st.Songs {
			if s.ID == sid {
				st.Songs = append(st.Songs[:i], st.Songs[i+1:]...)
				return nil
			}
		}
		return missing()
	})
	if err != nil {
		failure(w, err)
		return
	}
	respond(w, 200, map[string]bool{"ok": true})
}
func (a *App) settings(w http.ResponseWriter, r *http.Request) {
	var in Settings
	if err := decode(w, r, &in); err != nil {
		failure(w, err)
		return
	}
	err := a.store.mutate(func(st *State) error { st.Settings = in; return nil })
	if err != nil {
		failure(w, err)
		return
	}
	respond(w, 200, in)
}
func (a *App) event(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name string `json:"name"`
	}
	if err := decode(w, r, &in); err != nil {
		failure(w, err)
		return
	}
	switch in.Name {
	case "song_played", "memory_opened", "memory_hint_opened", "card_exported":
	default:
		failure(w, bad("事件类型无效"))
		return
	}
	if err := a.store.mutate(func(st *State) error { record(st, in.Name); return nil }); err != nil {
		failure(w, err)
		return
	}
	respond(w, 200, map[string]bool{"ok": true})
}

func (a *App) media(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("file")
	if !mediaName.MatchString(name) {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, filepath.Join(a.store.dir, "media", name))
}

// Sniff actual signatures; never serve user-supplied HTML/SVG as media.
func mediaExtension(b []byte, photo bool) string {
	if photo {
		switch http.DetectContentType(b) {
		case "image/jpeg":
			return ".jpg"
		case "image/png":
			return ".png"
		case "image/webp":
			return ".webp"
		}
		return ""
	}
	if len(b) >= 12 && string(b[:4]) == "RIFF" && string(b[8:12]) == "WAVE" {
		return ".wav"
	}
	if len(b) >= 3 && string(b[:3]) == "ID3" {
		return ".mp3"
	}
	if len(b) > 1 && b[0] == 255 && b[1]&224 == 224 {
		return ".mp3"
	}
	if len(b) >= 4 {
		switch string(b[:4]) {
		case "fLaC":
			return ".flac"
		case "OggS":
			return ".ogg"
		case "\x1a\x45\xdf\xa3":
			return ".webm"
		}
	}
	if len(b) >= 12 && string(b[4:8]) == "ftyp" {
		return ".m4a"
	}
	return ""
}
func (a *App) receiveFile(w http.ResponseWriter, r *http.Request, photo bool) (string, error) {
	limit := int64(52 << 20)
	if photo {
		limit = 8 << 20
	}
	r.Body = http.MaxBytesReader(w, r.Body, limit+(2<<20))
	if err := r.ParseMultipartForm(2 << 20); err != nil {
		return "", apiError{413, "文件过大或上传格式无效"}
	}
	defer r.MultipartForm.RemoveAll()
	f, h, err := r.FormFile("file")
	if err != nil {
		return "", bad("请选择文件")
	}
	defer f.Close()
	if h.Size > limit {
		return "", apiError{413, "文件超出大小限制"}
	}
	head := make([]byte, 512)
	n, err := io.ReadFull(f, head)
	if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
		return "", err
	}
	ext := mediaExtension(head[:n], photo)
	if ext == "" {
		return "", bad("不支持的文件内容，请使用音频文件或 JPG / PNG / WebP 图片")
	}
	name := id() + ext
	path := filepath.Join(a.store.dir, "media", name)
	out, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if err != nil {
		return "", err
	}
	_, err = io.Copy(out, io.MultiReader(strings.NewReader(string(head[:n])), f))
	if err == nil {
		err = out.Sync()
	}
	closeErr := out.Close()
	if err == nil {
		err = closeErr
	}
	if err != nil {
		_ = os.Remove(path)
		return "", err
	}
	return "/media/" + name, nil
}
func (a *App) uploadPhoto(w http.ResponseWriter, r *http.Request) {
	p, err := a.receiveFile(w, r, true)
	if err != nil {
		failure(w, err)
		return
	}
	respond(w, 201, map[string]string{"url": p})
}
func (a *App) uploadSong(w http.ResponseWriter, r *http.Request) {
	p, err := a.receiveFile(w, r, false)
	if err != nil {
		failure(w, err)
		return
	}
	cleanup := func() { _ = os.Remove(filepath.Join(a.store.dir, "media", filepath.Base(p))) }
	title := strings.TrimSpace(r.FormValue("title"))
	artist := strings.TrimSpace(r.FormValue("artist"))
	duration, err := strconv.ParseFloat(r.FormValue("duration"), 64)
	if title == "" || !textOK(title, 120) || !textOK(artist, 120) || err != nil || math.IsNaN(duration) || math.IsInf(duration, 0) || duration <= 0 || duration > 86400 {
		cleanup()
		failure(w, bad("请填写标题，并选择浏览器能读取时长的音频（不超过 24 小时）"))
		return
	}
	cover := r.FormValue("cover_url")
	if !a.validPhoto(cover) {
		cleanup()
		failure(w, bad("封面无效"))
		return
	}
	color := r.FormValue("color")
	if !hexColor.MatchString(color) {
		color = "#a6c8b8"
	}
	song := Song{ID: id(), Title: title, Artist: artist, Duration: duration, AudioURL: p, CoverURL: cover, Color: color, Lyrics: []Lyric{}, CreatedAt: now()}
	err = a.store.mutate(func(st *State) error { st.Songs = append(st.Songs, song); return nil })
	if err != nil {
		cleanup()
		failure(w, err)
		return
	}
	respond(w, 201, song)
}

var lrcStamp = regexp.MustCompile(`\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]`)
var lrcOffset = regexp.MustCompile(`\[offset:([+-]?\d+)\]`)

func parseLRC(raw string, duration float64) []Lyric {
	result := []Lyric{}
	offset := 0.0
	if m := lrcOffset.FindStringSubmatch(raw); m != nil {
		v, _ := strconv.ParseFloat(m[1], 64)
		offset = v / 1000
	}
	for _, line := range strings.Split(raw, "\n") {
		matches := lrcStamp.FindAllStringSubmatch(line, -1)
		text := strings.TrimSpace(lrcStamp.ReplaceAllString(line, ""))
		if text == "" {
			continue
		}
		for _, m := range matches {
			min, _ := strconv.Atoi(m[1])
			sec, _ := strconv.Atoi(m[2])
			if sec >= 60 {
				continue
			}
			fraction := 0.0
			if m[3] != "" {
				fraction, _ = strconv.ParseFloat("0."+m[3], 64)
			}
			at := float64(min*60+sec) + fraction + offset
			if at < 0 {
				at = 0
			}
			if at <= duration {
				result = append(result, Lyric{Time: at, Text: text})
			}
		}
	}
	sort.SliceStable(result, func(i, j int) bool { return result[i].Time < result[j].Time })
	return result
}
func (a *App) setLyrics(w http.ResponseWriter, r *http.Request) {
	var in struct {
		LRC string `json:"lrc"`
	}
	if err := decode(w, r, &in); err != nil {
		failure(w, err)
		return
	}
	if !textOK(in.LRC, 100000) {
		failure(w, bad("歌词文件过大"))
		return
	}
	var result []Lyric
	err := a.store.mutate(func(st *State) error {
		s := songByID(st, r.PathValue("id"))
		if s == nil {
			return missing()
		}
		result = parseLRC(in.LRC, s.Duration)
		if len(result) == 0 {
			return bad("未找到歌曲时长范围内的 LRC 时间标签，例如 [00:08.00]歌词")
		}
		s.Lyrics = result
		return nil
	})
	if err != nil {
		failure(w, err)
		return
	}
	respond(w, 200, result)
}
