const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'dist');
const state = JSON.parse(fs.readFileSync(path.join(root, 'samples/browser-demo-state.json'), 'utf8'));
if (state.songs.length !== 12 || state.memories.length !== 17 || state.songs.some(song => !song.sample) || state.memories.some(memory => !memory.sample || memory.photo_url || memory.photo_urls?.length) || state.events.length) throw Error('Only clean synthetic demo data may be published');
fs.rmSync(output, { recursive: true, force: true });
fs.cpSync(path.join(root, 'web'), output, { recursive: true });
const index = path.join(output, 'index.html');
fs.writeFileSync(index, fs.readFileSync(index, 'utf8').replace('src="/kugou.js"', 'src="/demo-entry.js"'));
fs.writeFileSync(path.join(output, 'demo-state.json'), JSON.stringify(state));
fs.mkdirSync(path.join(output, 'media'));

// Same original synthetic instrumental as seed.go; no commercial recordings.
function audio(transpose) {
  const rate = 22050, seconds = 40, count = rate * seconds, buffer = Buffer.alloc(44 + count * 2);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(count * 2, 40);
  const notes = [261.63,329.63,392,493.88,440,392,329.63,293.66];
  for (let i = 0; i < count; i++) {
    const t = i / rate, beat = t % .625, frequency = notes[Math.floor(t / .625) % notes.length] * transpose;
    let v = .18 * Math.sin(2 * Math.PI * frequency * t) * Math.exp(-beat * 5) * (1 - Math.exp(-beat * 75)) + .035 * Math.sin(2 * Math.PI * 130.815 * transpose * t);
    v *= Math.min(t, 1) * Math.min(seconds - t, 1);
    buffer.writeInt16LE(Math.trunc(v * 32767), 44 + i * 2);
  }
  return buffer;
}
state.songs.forEach((song, index) => {
  if (!/^\/media\/(sample-[abc]|pdf-demo-(quiet|heal|rain|heart|repeat|night|first|alone|summer))\.wav$/.test(song.audio_url)) throw Error('Unexpected demo audio path');
  fs.writeFileSync(path.join(output, song.audio_url.slice(1)), audio(index < 3 ? 1 + index * .12 : .8 + (index - 3) * .06));
});
console.log('Browser demo built in dist/: 12 synthetic songs, 17 sample memories, no local user data.');
