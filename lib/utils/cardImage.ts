/**
 * 宣言卡片导出为图片
 *
 * 为什么自己用 Canvas 画，而不是引 html-to-image / html2canvas：
 * 1. 零新增依赖，打包体积不涨
 * 2. 那类库对 Tailwind 的 backdrop-blur、CSS 变量支持不稳，容易糊
 * 3. 分享图的尺寸和排版需要独立于网页布局（1080×1350 是小红书竖图比例）
 *
 * 传播闭环的最后一环：用户能把宣言存成图，才谈得上"愿意晒"。
 */

export type CardStyleId =
  | "minimal"
  | "classical"
  | "futuristic"
  | "handwritten";

type Palette = {
  background: string;
  border: string;
  borderWidth: number;
  borderDashed: boolean;
  title: string;
  body: string;
  meta: string;
};

const PALETTES: Record<CardStyleId, Palette> = {
  minimal: {
    background: "#ffffff",
    border: "#1a1a1a",
    borderWidth: 4,
    borderDashed: false,
    title: "#1a1a1a",
    body: "#333333",
    meta: "#8a8a8a",
  },
  classical: {
    background: "#f5f1e8",
    border: "#b8860b",
    borderWidth: 8,
    borderDashed: false,
    title: "#b8860b",
    body: "#1a1a1a",
    meta: "#a98b3d",
  },
  futuristic: {
    background: "#1a1a1a",
    border: "#b8860b",
    borderWidth: 4,
    borderDashed: false,
    title: "#b8860b",
    body: "#e8e4da",
    meta: "#9a9488",
  },
  handwritten: {
    background: "#f2f5ee",
    border: "#9caf88",
    borderWidth: 4,
    borderDashed: true,
    title: "#7d9068",
    body: "#1a1a1a",
    meta: "#8a8a8a",
  },
};

const WIDTH = 1080;
const HEIGHT = 1350;
const PADDING = 96;
const FONT_STACK = '"Songti SC", "STSong", "SimSun", Georgia, serif';

/**
 * 中英混排换行
 * CJK 没有空格，不能按单词切，只能逐字测量
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];

  text.split("\n").forEach((paragraph) => {
    if (!paragraph) {
      lines.push("");
      return;
    }

    let current = "";
    for (const char of paragraph) {
      const next = current + char;
      if (ctx.measureText(next).width > maxWidth && current) {
        lines.push(current);
        current = char;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
  });

  return lines;
}

export type CardImageInput = {
  text: string;
  cardName: string;
  style: CardStyleId;
  createdAt: number;
};

/**
 * 生成分享图并返回 dataURL
 * @throws 浏览器不支持 canvas 时抛错，调用方需 catch
 */
export function renderCardImage(input: CardImageInput): string {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");

  const palette = PALETTES[input.style] || PALETTES.minimal;

  // 底色
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 边框
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = palette.borderWidth;
  if (palette.borderDashed) ctx.setLineDash([18, 14]);
  const inset = 40;
  ctx.strokeRect(
    inset,
    inset,
    WIDTH - inset * 2,
    HEIGHT - inset * 2
  );
  ctx.setLineDash([]);

  // 古典风格的第二道内框（对应 border-double）
  if (input.style === "classical") {
    ctx.lineWidth = 2;
    ctx.strokeRect(inset + 16, inset + 16, WIDTH - (inset + 16) * 2, HEIGHT - (inset + 16) * 2);
  }

  let cursorY = PADDING + 40;
  const contentWidth = WIDTH - PADDING * 2;

  // 顶部：品牌 + 日期
  ctx.textAlign = "left";
  ctx.font = `28px ${FONT_STACK}`;
  ctx.fillStyle = palette.meta;
  ctx.fillText("孩子的游戏", PADDING, cursorY);

  ctx.textAlign = "right";
  ctx.fillText(
    new Date(input.createdAt).toLocaleDateString("zh-CN"),
    WIDTH - PADDING,
    cursorY
  );

  cursorY += 110;

  // 标题
  ctx.textAlign = "center";
  ctx.font = `24px ${FONT_STACK}`;
  ctx.fillStyle = palette.meta;
  ctx.fillText("MY DECLARATION", WIDTH / 2, cursorY);

  cursorY += 76;
  ctx.font = `bold 58px ${FONT_STACK}`;
  ctx.fillStyle = palette.title;
  const titleLines = wrapText(ctx, `《${input.cardName}》`, contentWidth);
  titleLines.forEach((line) => {
    ctx.fillText(line, WIDTH / 2, cursorY);
    cursorY += 74;
  });

  // 分隔线
  cursorY += 40;
  ctx.strokeStyle = palette.meta;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(WIDTH / 2 - 60, cursorY);
  ctx.lineTo(WIDTH / 2 + 60, cursorY);
  ctx.stroke();
  cursorY += 80;

  // 正文（长文本自动缩字号，保证不溢出）
  ctx.textAlign = "left";
  let bodySize = 38;
  let lineHeight = 68;
  let bodyLines: string[] = [];
  const bodyMaxHeight = HEIGHT - cursorY - 200;

  while (bodySize >= 26) {
    ctx.font = `${bodySize}px ${FONT_STACK}`;
    bodyLines = wrapText(ctx, input.text, contentWidth);
    if (bodyLines.length * lineHeight <= bodyMaxHeight) break;
    bodySize -= 2;
    lineHeight -= 3;
  }

  ctx.fillStyle = palette.body;
  bodyLines.forEach((line) => {
    ctx.fillText(line, PADDING, cursorY);
    cursorY += lineHeight;
  });

  // 底部签名
  ctx.textAlign = "center";
  ctx.font = `italic 30px ${FONT_STACK}`;
  ctx.fillStyle = palette.meta;
  ctx.fillText("—— 查拉图斯特拉", WIDTH / 2, HEIGHT - 150);

  ctx.font = `24px ${FONT_STACK}`;
  ctx.fillText("#孩子的游戏", WIDTH / 2, HEIGHT - 100);

  return canvas.toDataURL("image/png");
}

/** 触发浏览器下载 */
export function downloadCardImage(input: CardImageInput) {
  const dataUrl = renderCardImage(input);
  const link = document.createElement("a");
  link.download = `孩子宣言-${input.cardName || "未命名"}.png`;
  link.href = dataUrl;
  link.click();
}
