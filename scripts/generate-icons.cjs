// 生成应用图标
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico');

const iconsDir = path.join(__dirname, 'src-tauri', 'icons');
const publicDir = path.join(__dirname, 'public');

// 确保图标目录存在
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 创建一个简单的图标SVG (512x512)
const iconSvg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#bg)"/>
  <text x="256" y="300" font-family="Arial, sans-serif" font-size="280" font-weight="bold" fill="white" text-anchor="middle">启</text>
</svg>`;

async function generateIcons() {
  console.log('生成图标中...');

  // 生成 PNG 文件
  const sizes = [32, 128, 256, 512];

  for (const size of sizes) {
    const pngPath = path.join(iconsDir, `${size}x${size}.png`);
    await sharp(Buffer.from(iconSvg))
      .resize(size, size)
      .png()
      .toFile(pngPath);
    console.log(`生成: ${pngPath}`);
  }

  // 生成 icon.png (应用主图标)
  const iconPngPath = path.join(iconsDir, 'icon.png');
  await sharp(Buffer.from(iconSvg))
    .resize(512, 512)
    .png()
    .toFile(iconPngPath);
  console.log(`生成: ${iconPngPath}`);

  // 生成 ICNS (macOS) - 使用 512x512 PNG
  const icnsPath = path.join(iconsDir, 'icon.icns');
  // macOS icns 需要特殊处理，这里只生成 PNG，由 Tauri 处理

  // 生成 ICO (Windows)
  const icoPath = path.join(iconsDir, 'icon.ico');
  const pngBuffer = await sharp(Buffer.from(iconSvg))
    .resize(256, 256)
    .png()
    .toBuffer();

  const icoBuffer = await pngToIco([pngBuffer]);
  fs.writeFileSync(icoPath, icoBuffer);
  console.log(`生成: ${icoPath}`);

  // 复制 SVG 到 public
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), iconSvg);
  console.log(`复制: ${path.join(publicDir, 'icon.svg')}`);

  console.log('图标生成完成!');
}

generateIcons().catch(console.error);
