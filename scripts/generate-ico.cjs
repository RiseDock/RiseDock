// 生成 ICO 文件
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'src-tauri', 'icons');

async function createIco() {
  const icoPath = path.join(iconsDir, 'icon.ico');

  // ICO 文件格式：头部 + 目录 + PNG 数据
  const sizes = [16, 32, 48, 256];
  const pngBuffers = [];

  for (const size of sizes) {
    const pngBuffer = await sharp(path.join(iconsDir, 'icon.png'))
      .resize(size, size)
      .png()
      .toBuffer();
    pngBuffers.push({ size, buffer: pngBuffer });
  }

  // 构建 ICO 文件
  // ICO Header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);      // Reserved
  header.writeUInt16LE(1, 2);      // Type: 1 = ICO
  header.writeUInt16LE(pngBuffers.length, 4);  // Number of images

  // Directory entries: 16 bytes each
  const dirEntries = [];
  let dataOffset = 6 + (16 * pngBuffers.length);

  for (const { size, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);  // Width (0 = 256)
    entry.writeUInt8(size === 256 ? 0 : size, 1);  // Height (0 = 256)
    entry.writeUInt8(0, 2);         // Color palette
    entry.writeUInt8(0, 3);         // Reserved
    entry.writeUInt16LE(1, 4);      // Color planes
    entry.writeUInt16LE(32, 6);     // Bits per pixel
    entry.writeUInt32LE(buffer.length, 8);  // Size of image data
    entry.writeUInt32LE(dataOffset, 12);    // Offset to image data
    dirEntries.push(entry);
    dataOffset += buffer.length;
  }

  // 合并所有部分
  const ico = Buffer.concat([
    header,
    ...dirEntries,
    ...pngBuffers.map(p => p.buffer)
  ]);

  fs.writeFileSync(icoPath, ico);
  console.log('ICO 生成完成:', icoPath);
  console.log('文件大小:', ico.length, 'bytes');
}

createIco().catch(console.error);
