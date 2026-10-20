// ZIP uses stored entries so backup works without a download-time dependency.
export async function makeZip(files) {
  const encoder = new TextEncoder(), parts = [], directory = [];
  const table = Uint32Array.from({ length: 256 }, (_, i) => {
    let value = i;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
    return value >>> 0;
  });
  let offset = 0, directorySize = 0;
  for (const [name, blob] of files) {
    const data = new Uint8Array(await blob.arrayBuffer()), filename = encoder.encode(name);
    let crc = 0xffffffff;
    for (const byte of data) crc = (crc >>> 8) ^ table[(crc ^ byte) & 255];
    crc = (crc ^ 0xffffffff) >>> 0;
    // shortcut: ZIP32 is sufficient for this demo's 52 MB upload limit; use a ZIP64 library for backups approaching 4 GB.
    if (offset + data.length + filename.length + 30 >= 0xffffffff || files.length > 65535) throw Error('备份过大，请先导出 JSON 并单独保存媒体');
    const local = new Uint8Array(30), l = new DataView(local.buffer);
    l.setUint32(0, 0x04034b50, true); l.setUint16(4, 20, true); l.setUint16(6, 0x800, true);
    l.setUint16(12, 0x21, true); l.setUint32(14, crc, true);
    l.setUint32(18, data.length, true); l.setUint32(22, data.length, true); l.setUint16(26, filename.length, true);
    const central = new Uint8Array(46), c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x800, true);
    c.setUint16(14, 0x21, true); c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, filename.length, true); c.setUint32(42, offset, true);
    parts.push(local, filename, data); directory.push(central, filename);
    offset += 30 + filename.length + data.length; directorySize += 46 + filename.length;
  }
  const end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, directorySize, true); e.setUint32(16, offset, true);
  return new Blob([...parts, ...directory, end], { type: 'application/zip' });
}
