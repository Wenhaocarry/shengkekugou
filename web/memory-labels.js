// Deterministic summaries of saved records; no generated personal history or AI service.
export function memoryLabel(records) {
  if (!records.length) return '';
  const scenes = new Set(records.flatMap(m => m.scenes || []));
  const moods = new Set(records.map(m => m.mood));
  if (scenes.has('第一次见面')) return '第一次见你的那天';
  if (moods.has('心动时刻')) return '那阵子总是很心动';
  if (scenes.has('下雨天')) return '下雨天总会听';
  if (moods.has('今晚有点emo')) return '深夜 emo 专属';
  if (scenes.has('通勤路上')) return '通勤路上的歌';
  if (moods.has('被治愈了')) return '每次听都很治愈';
  if (scenes.has('日落时分')) return '日落时分的回忆';
  if (scenes.has('一个人') || scenes.has('一个人宅着')) return '又一个人';
  if (moods.has('小确幸')) return '生活里的小确幸';
  if (records.length > 1) return `你为它记录过 ${records.length} 次`;
  const date = records[0].date || '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const seasons = ['冬天', '春天', '夏天', '秋天'];
    return `${date.slice(0, 4)}年的${seasons[Math.floor((Number(date.slice(5, 7)) % 12) / 3)]}`;
  }
  return '留在歌里的那一刻';
}
