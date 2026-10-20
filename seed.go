package main

import (
	"encoding/binary"
	"math"
	"os"
	"path/filepath"
	"time"
)

// Original synthetic instrumental samples, not copies of commercial recordings.
func writeDemoWAV(path string, transpose float64) error {
	const rate = 22050
	const seconds = 40
	const count = rate * seconds
	buf := make([]byte, 44+count*2)
	copy(buf, "RIFF")
	binary.LittleEndian.PutUint32(buf[4:], uint32(len(buf)-8))
	copy(buf[8:], "WAVEfmt ")
	binary.LittleEndian.PutUint32(buf[16:], 16)
	binary.LittleEndian.PutUint16(buf[20:], 1)
	binary.LittleEndian.PutUint16(buf[22:], 1)
	binary.LittleEndian.PutUint32(buf[24:], rate)
	binary.LittleEndian.PutUint32(buf[28:], rate*2)
	binary.LittleEndian.PutUint16(buf[32:], 2)
	binary.LittleEndian.PutUint16(buf[34:], 16)
	copy(buf[36:], "data")
	binary.LittleEndian.PutUint32(buf[40:], count*2)
	notes := []float64{261.63, 329.63, 392, 493.88, 440, 392, 329.63, 293.66}
	for i := 0; i < count; i++ {
		t := float64(i) / rate
		beat := math.Mod(t, .625)
		freq := notes[int(t/.625)%len(notes)] * transpose
		v := .18*math.Sin(2*math.Pi*freq*t)*math.Exp(-beat*5)*(1-math.Exp(-beat*75)) + .035*math.Sin(2*math.Pi*130.815*transpose*t)
		v *= math.Min(t, 1) * math.Min(float64(seconds)-t, 1)
		binary.LittleEndian.PutUint16(buf[44+i*2:], uint16(int16(v*32767)))
	}
	return os.WriteFile(path, buf, 0600)
}
func (s *Store) seed() error {
	titles := []string{"慢慢抵达", "把今天留住", "日落之前"}
	colors := []string{"#a6c8b8", "#c9b7e2", "#e7ba91"}
	lyrics := [][]Lyric{{{0, "出发之前，把心事收进口袋"}, {8, "城市的风，吹过陌生的站台"}, {16, "慢慢抵达，也慢慢找到自己"}, {24, "总有一盏灯，会为今天亮起"}, {32, "这一路，值得好好记住"}}, {{0, "给平凡的一天，留一束光"}, {8, "那些小事，都有回响"}, {16, "把今天留住，把温柔带走"}, {24, "不必赶路，也可以抬头"}, {32, "你也在好好生活"}}, {{0, "在日落之前，绕一段路"}, {8, "让晚风替我，轻轻停驻"}, {16, "风经过河边，也经过你"}, {24, "一首歌，一段记得的风景"}, {32, "明天见，今天的自己"}}}
	for i, t := range titles {
		filename := "sample-" + string(rune('a'+i)) + ".wav"
		if err := writeDemoWAV(filepath.Join(s.dir, "media", filename), 1+float64(i)*.12); err != nil {
			return err
		}
		s.state.Songs = append(s.state.Songs, Song{ID: "demo-" + string(rune('a'+i)), Title: t, Artist: "声刻 · 原创合成演示音", Duration: 40, AudioURL: "/media/" + filename, Color: colors[i], Lyrics: lyrics[i], Sample: true, CreatedAt: now()})
	}
	s.state.Chapters = []Chapter{{ID: "chapter-arrival", Title: "初到这座城市", Description: "把陌生的日子，慢慢过成熟悉。", Color: colors[0], CreatedAt: now()}, {ID: "chapter-small", Title: "平凡生活的小确幸", Description: "不必特别，也值得记住。", Color: colors[2], CreatedAt: now()}}
	notes := []string{"第一次一个人来到这座城市，希望一切顺利。", "终于准点下班，绕路去买了一束花。", "周末沿着河边散步，刚好看见晚霞。"}
	moods := []string{"出发", "小确幸", "松口气"}
	for i, n := range notes {
		chapter := "chapter-arrival"
		if i > 0 {
			chapter = "chapter-small"
		}
		scenes := [][]string{{"通勤路上", "一个人"}, {"下班后"}, {"日落时分", "散步中"}}
		s.state.Memories = append(s.state.Memories, Memory{ID: "memory-" + string(rune('a'+i)), SongID: s.state.Songs[i].ID, Position: float64(8 + i*8), Note: n, Mood: moods[i], Scenes: scenes[i], Location: []string{"深圳北站", "花店门口", "河边步道"}[i], Visibility: "private", Date: time.Now().AddDate(0, 0, -90+i*25).Format("2006-01-02"), ChapterID: chapter, Replies: []Reply{}, Sample: true, CreatedAt: now()})
	}
	return nil
}
