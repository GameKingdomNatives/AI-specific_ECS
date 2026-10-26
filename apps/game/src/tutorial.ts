/**
 * 首进教学：三张卡 + 常驻提示。不依赖框架、不碰世界状态；
 * 只做「把机制说清楚」，跳过或按 ? 重开都允许。
 */
const SEEN_KEY = 'itb.tutorial.v1';

interface Card {
  readonly title: string;
  readonly lines: readonly string[];
}

const CARDS: readonly Card[] = [
  { title: '01 · 移动与瞄准', lines: ['WASD 移动，鼠标指向即朝向。', '左键主炮：持续输出，慢慢积累软辐能。'] },
  { title: '02 · 辐能是唯一的血条', lines: ['开火与开盾共用辐能；100 是容量，120 就过载停机。', '空格开盾（伤害转硬辐能），V 排散（快速降压）。', '容量线右侧的红区，就是「再烧就停机」的余量。'] },
  { title: '03 · 三把武器各有一个动词', lines: ['主炮：持续输出。', '终结 E：破甲重击，但打盾会被转成硬辐能。', '支援 Q：压盾 1.5 秒，穿盾只加压辐能 —— 先 Q 再 E。'] },
];

const OVERLAY_ID = 'itb-tutorial';

function buildOverlay(doc: Document, close: () => void): HTMLElement {
  const overlay = doc.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', '基础教学');
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:50', 'display:none',
    'align-items:center', 'justify-content:center',
    'background:rgba(20,16,12,.72)', 'font-family:system-ui,sans-serif',
    'padding:24px', 'box-sizing:border-box',
  ].join(';');
  const panel = doc.createElement('div');
  panel.style.cssText = 'max-width:720px;width:100%;background:#faf7f2;color:#241f1a;border-radius:16px;padding:28px 30px;line-height:1.7';
  const title = doc.createElement('h2');
  title.textContent = '三次按键，先活下来';
  title.style.cssText = 'margin:0 0 4px;font-size:22px;font-weight:500';
  const hint = doc.createElement('p');
  hint.textContent = '这是一局 3 分钟的机甲对射。先记住三件事，其他边打边学。';
  hint.style.cssText = 'margin:0 0 18px;font-size:14px;color:#6f6459';
  panel.append(title, hint);
  for (const card of CARDS) {
    const box = doc.createElement('section');
    box.style.cssText = 'border-top:1px solid #e6ded2;padding:12px 0 4px';
    const heading = doc.createElement('h3');
    heading.textContent = card.title;
    heading.style.cssText = 'margin:0 0 4px;font-size:15px;font-weight:600;color:#8a5a2b';
    box.append(heading);
    for (const line of card.lines) {
      const p = doc.createElement('p');
      p.textContent = line;
      p.style.cssText = 'margin:2px 0;font-size:14px';
      box.append(p);
    }
    panel.append(box);
  }
  const start = doc.createElement('button');
  start.textContent = '开始';
  start.style.cssText = 'margin-top:18px;border:0;border-radius:999px;background:#241f1a;color:#faf7f2;padding:9px 22px;font-size:14px;cursor:pointer';
  start.addEventListener('click', close);
  panel.append(start);
  overlay.append(panel);
  return overlay;
}

/** 挂载教学层：首次自动弹出，? / F1 重开，Esc 关闭。 */
export function mountTutorial(doc: Document): { open: () => void; close: () => void; dispose: () => void } {
  const overlay = buildOverlay(doc, () => close());
  doc.body.append(overlay);
  let seen = false;
  try {
    seen = doc.defaultView?.localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    seen = false;
  }
  function open(): void {
    overlay.style.display = 'flex';
  }
  function close(): void {
    overlay.style.display = 'none';
    try {
      doc.defaultView?.localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* 隐私模式写入失败不影响游戏 */
    }
  }
  function onKey(event: KeyboardEvent): void {
    if (event.key === '?' || event.key === 'F1') open();
    if (event.key === 'Escape') close();
  }
  doc.addEventListener('keydown', onKey);
  if (!seen) open();
  return {
    open,
    close,
    dispose(): void {
      doc.removeEventListener('keydown', onKey);
      overlay.remove();
    },
  };
}
