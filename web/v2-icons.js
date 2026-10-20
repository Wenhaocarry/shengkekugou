// A small, code-native colour icon family inspired by the supplied style board.
let iconSequence = 0;
const shapes = {
  moon: '<path d="M30 5a18 18 0 1 0 13 25A17 17 0 0 1 30 5Z"/>',
  sun: '<circle cx="24" cy="24" r="11"/><path d="M24 3v4m0 34v4M3 24h4m34 0h4M9 9l3 3m24 24 3 3M9 39l3-3m24-24 3-3" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  heart: '<path d="M24 42 7 25C-6 10 14-2 24 13 34-2 54 10 41 25Z"/>',
  leaf: '<path d="M22 40C1 38 1 14 3 7c19 0 25 12 19 33ZM28 39C21 20 34 9 46 10c3 15-3 29-18 29Z"/>',
  cloud: '<path d="M12 38a11 11 0 0 1-1-22 14 14 0 0 1 27 1 10 10 0 1 1 0 21Z"/>',
  wave: '<path d="M2 29c7 5 12 0 17-13 6-17 26-9 25 5-7-8-12-2-10 4 2 7 9 8 13 4-5 17-36 22-45 0Z"/>',
  star: '<path d="m24 3 6 13 15 2-11 10 3 15-13-7-13 7 3-15L3 18l15-2Z"/>',
  spark: '<path d="m26 2-17 26h13l-2 18 19-28H26Z"/>',
  headphones: '<path d="M6 27v-6a18 18 0 0 1 36 0v6h-5v-6a13 13 0 0 0-26 0v6Z"/><rect x="3" y="23" width="12" height="20" rx="6"/><rect x="33" y="23" width="12" height="20" rx="6"/>',
  pin: '<path d="M24 3a16 16 0 0 0-16 16c0 12 16 26 16 26s16-14 16-26A16 16 0 0 0 24 3Zm0 10a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z" fill-rule="evenodd"/>',
  book: '<path d="M4 8c8-4 14-3 20 1 6-4 12-5 20-1v32c-7-4-13-4-20 0-7-4-13-4-20 0Z"/><path d="M24 12v23" stroke="#909aa4" fill="none" stroke-width="2"/>',
  cup: '<path d="M6 10h29v22c0 9-29 9-29 0Zm29 3h5c11 0 9 17-5 17v-5c8 0 8-7 0-7Z"/><path d="M7 42h30" stroke="currentColor" fill="none" stroke-width="3" stroke-linecap="round"/>',
  road: '<path d="M15 4h18l12 40H3Zm8 1v9h3V5Zm0 17v9h3v-9Zm0 16v6h3v-6Z" fill-rule="evenodd"/>',
  home: '<path d="m24 3 23 20h-7v22H9V23H2Zm-5 27v15h10V30Z" fill-rule="evenodd"/>',
  flower: '<path d="M24 4c9 0 9 8 7 12 9-4 15 2 12 9-2 7-9 6-12 5 5 8 1 15-7 15s-12-7-7-15c-9 4-15-2-12-9 2-7 9-7 13-4-5-8-2-13 6-13Z"/><circle cx="24" cy="24" r="5" fill="#b1a893"/>',
  planet: '<circle cx="24" cy="24" r="15"/><ellipse cx="24" cy="24" rx="25" ry="8" transform="rotate(-35 24 24)" stroke="#aab2bc" stroke-width="3" fill="none"/>',
  music: '<path d="M20 8 43 3v29c0 9-17 13-17 3 0-6 6-8 12-7V13l-13 3v23c0 9-18 11-18 2 0-6 7-9 13-7Z"/>',
};
function shapeFor(label) {
  const rules = [[/emo|深夜|睡|困|孤独/,'moon'],[/开心|激动|清晨|满血|生日/,'sun'],[/TA|心动|恋|想念|重逢|朋友/,'heart'],[/治愈|温柔|希望|花/,'flower'],[/放空|情绪|海|洗澡|破防/,'wave'],[/循环|耳机|K歌|跟唱/,'headphones'],[/雨|委屈|遗憾|生病/,'cloud'],[/击中|鸡血|上头|加班|健身|跑步/,'spark'],[/学习|图书|考试|怀念/,'book'],[/咖啡|午后|微醺|做饭/,'cup'],[/通勤|路上|地铁|公交|兜风|自驾/,'road'],[/宅|想家|打扫/,'home'],[/旅行|飞机|自由|游戏/,'planet'],[/平静|放松|山野|露营/,'leaf'],[/日落|节日/,'star']];
  return rules.find(([pattern]) => pattern.test(label))?.[1] || 'music';
}
export function toneIcon(label) {
  const shape = shapeFor(label);
  const colours = {
    moon:['#afc9ff','#7e8fe8','#6570bd'], sun:['#ffe98b','#ffc34f','#e99536'],
    heart:['#ffccd8','#f3869e','#d86986'], leaf:['#c9e8b8','#79bc82','#5c9b6c'],
    cloud:['#d8eaff','#8dbfe9','#7299c9'], wave:['#c2edf0','#61bfca','#419aa9'],
    star:['#ffe9aa','#e8bd5d','#c7953d'], spark:['#ffd0a4','#f3924f','#d96838'],
    headphones:['#ddd1ff','#a58ae0','#8068bd'], pin:['#ffc7c4','#ef7c76','#ca5d62'],
    book:['#c0e3dc','#73b5aa','#578f8c'], cup:['#ead1b8','#bb8a64','#8f654d'],
    road:['#c4dbf5','#78a7d4','#577ca8'], home:['#ffd4c2','#e99572','#bd6f5f'],
    flower:['#ffd1df','#ed8fb0','#cc688d'], planet:['#d9d3fa','#988bd7','#7267ae'],
    music:['#c4e4f3','#74b6d5','#518dad']
  }[shape];
  const gradient = `colour-${++iconSequence}`;
  return `<svg class="tone-icon tone-${shape}" viewBox="-3 -3 54 54" aria-hidden="true"><defs><linearGradient id="${gradient}" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="${colours[0]}"/><stop offset=".52" stop-color="${colours[1]}"/><stop offset="1" stop-color="${colours[2]}"/></linearGradient></defs><g fill="url(#${gradient})" color="${colours[2]}">${shapes[shape]}</g></svg>`;
}
export const flowerDoodle = '<svg class="flower-doodle" viewBox="0 0 60 60" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.3"><path d="M30 22C10-6 6 21 22 28-7 26 9 52 26 35c-10 28 19 27 8 0 19 17 33-8 6-7C56 7 31-5 30 22Z"/><circle cx="30" cy="29" r="7"/></g></svg>';
