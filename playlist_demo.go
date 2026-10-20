package main

import (
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// Explicit, repeatable demo expansion. It never rewrites existing songs or memories.
func (s *Store) expandPlaylistDemo() error {
	type example struct {
		key, title, artist, mood, scene, note string
		count                                 int
	}
	examples := []example{
		{"quiet", "静音恋人", "礼越", "平静下来", "通勤路上", "下班的地铁里听到这首歌，城市的噪声一下安静了。", 1},
		{"heal", "无感", "江辰", "被治愈了", "散步中", "绕着公园走了一圈，今天的疲惫慢慢散掉了。", 1},
		{"rain", "小模样", "张小只ya", "突然想起TA", "下雨天", "窗外又下雨了，想起曾经一起躲雨的那个屋檐。", 1},
		{"heart", "情人", "蔡徐坤", "心动时刻", "咖啡馆", "见面前在咖啡馆等了好久，连耳机里的旋律也像在心跳。", 1},
		{"repeat", "Melody Remix", "锦零", "", "", "又在回家的路上听到这首熟悉的旋律，留下一次记录。", 6},
		{"night", "完美降落", "胡期皓 / 叶琼琳 / 董唧唧", "今晚有点emo", "深夜戴耳机", "凌晨还没有睡，把没说出口的话留在这首歌里。", 1},
		{"first", "trust me", "慕乔", "开心", "第一次见面", "第一次见你的那天，这首歌刚好在店里播放。", 1},
		{"alone", "Letting Go", "蔡健雅", "放空一下", "一个人", "一个人坐过了两站，终于不再急着给过去一个答案。", 1},
		{"summer", "我记得", "赵雷", "", "", "那个夏天坐在回家的车上，一路望着窗外的树影。", 1},
	}
	return s.mutate(func(next *State) error {
		for i, e := range examples {
			songID := "pdf-demo-" + e.key
			exists := false
			for _, song := range next.Songs {
				if song.ID == songID {
					exists = true
					break
				}
			}
			if exists {
				continue
			}
			filename := songID + ".wav"
			if _, err := os.Stat(filepath.Join(s.dir, "media", filename)); os.IsNotExist(err) {
				if err := writeDemoWAV(filepath.Join(s.dir, "media", filename), .8+float64(i)*.06); err != nil {
					return err
				}
			} else if err != nil {
				return err
			}
			next.Songs = append(next.Songs, Song{ID: songID, Title: e.title, Artist: e.artist, Duration: 40, AudioURL: "/media/" + filename, CoverURL: "/cover-" + e.key + ".svg", Sample: true, CreatedAt: now(), Lyrics: []Lyric{}})
			for j := 0; j < e.count; j++ {
				date := time.Now().AddDate(0, 0, -10-i*9-j*5).Format("2006-01-02")
				if e.key == "summer" {
					date = "2024-07-12"
				}
				scenes := []string{}
				if e.scene != "" {
					scenes = append(scenes, e.scene)
				}
				next.Memories = append(next.Memories, Memory{ID: fmt.Sprintf("%s-memory-%d", songID, j+1), SongID: songID, Position: float64(8 + j*3), Note: e.note, Mood: e.mood, Scenes: scenes, Date: date, RecordTime: fmt.Sprintf("%02d:20", 18+j), Visibility: "private", Replies: []Reply{}, Sample: true, CreatedAt: now()})
			}
		}
		return nil
	})
}
