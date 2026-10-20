package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type Lyric struct {
	Time float64 `json:"time"`
	Text string  `json:"text"`
}
type Song struct {
	ID        string  `json:"id"`
	Title     string  `json:"title"`
	Artist    string  `json:"artist"`
	Duration  float64 `json:"duration"`
	AudioURL  string  `json:"audio_url"`
	CoverURL  string  `json:"cover_url"`
	Color     string  `json:"color"`
	Lyrics    []Lyric `json:"lyrics"`
	Sample    bool    `json:"sample"`
	CreatedAt string  `json:"created_at"`
}
type Reply struct {
	ID        string `json:"id"`
	Note      string `json:"note"`
	Date      string `json:"date"`
	CreatedAt string `json:"created_at"`
}
type Memory struct {
	ID         string   `json:"id"`
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
	Replies    []Reply  `json:"replies"`
	Sample     bool     `json:"sample"`
	CreatedAt  string   `json:"created_at"`
}
type Chapter struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Color       string `json:"color"`
	CreatedAt   string `json:"created_at"`
}
type Event struct {
	Name string `json:"name"`
	At   string `json:"at"`
}
type Settings struct {
	MemoryHints bool `json:"memory_hints"`
	DemoMember  bool `json:"demo_member"`
}
type State struct {
	Version  int       `json:"version"`
	Songs    []Song    `json:"songs"`
	Memories []Memory  `json:"memories"`
	Chapters []Chapter `json:"chapters"`
	Settings Settings  `json:"settings"`
	Events   []Event   `json:"events"`
}
type Store struct {
	mu    sync.RWMutex
	dir   string
	state State
}

func id() string {
	var b [12]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b[:])
}
func now() string { return time.Now().UTC().Format(time.RFC3339) }
func openStore(dir string, seed bool) (*Store, error) {
	if err := os.MkdirAll(filepath.Join(dir, "media"), 0700); err != nil {
		return nil, err
	}
	s := &Store{dir: dir, state: State{Version: 1, Songs: []Song{}, Memories: []Memory{}, Chapters: []Chapter{}, Events: []Event{}, Settings: Settings{MemoryHints: true}}}
	b, err := os.ReadFile(filepath.Join(dir, "state.json"))
	if err == nil {
		if err = json.Unmarshal(b, &s.state); err != nil {
			return nil, fmt.Errorf("数据文件无法读取，已保留原文件：%w", err)
		}
		if s.state.Version != 1 {
			return nil, errors.New("不支持的数据版本")
		}
		return s, nil
	}
	if !os.IsNotExist(err) {
		return nil, err
	}
	if seed {
		if err = s.seed(); err != nil {
			return nil, err
		}
	}
	if err = s.persist(s.state); err != nil {
		return nil, err
	}
	return s, nil
}
func (s *Store) snapshot() State {
	s.mu.RLock()
	defer s.mu.RUnlock()
	b, _ := json.Marshal(s.state)
	var copy State
	_ = json.Unmarshal(b, &copy)
	return copy
}

// A mutation only becomes visible after the complete snapshot has been flushed and renamed.
func (s *Store) mutate(fn func(*State) error) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	b, err := json.Marshal(s.state)
	if err != nil {
		return err
	}
	var next State
	if err = json.Unmarshal(b, &next); err != nil {
		return err
	}
	if err = fn(&next); err != nil {
		return err
	}
	if err = s.persist(next); err != nil {
		return err
	}
	s.state = next
	return nil
}
func (s *Store) persist(next State) error {
	b, err := json.MarshalIndent(next, "", "  ")
	if err != nil {
		return err
	}
	f, err := os.CreateTemp(s.dir, ".state-*")
	if err != nil {
		return err
	}
	defer os.Remove(f.Name())
	if _, err = f.Write(b); err != nil {
		f.Close()
		return err
	}
	if err = f.Sync(); err != nil {
		f.Close()
		return err
	}
	if err = f.Close(); err != nil {
		return err
	}
	return os.Rename(f.Name(), filepath.Join(s.dir, "state.json"))
}
func record(st *State, name string) {
	st.Events = append(st.Events, Event{Name: name, At: now()})
	if len(st.Events) > 2000 {
		st.Events = st.Events[len(st.Events)-2000:]
	}
}
