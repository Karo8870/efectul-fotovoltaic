import { CONFIG, Metal, wavelengthToRGBA } from './photoelectric';

export interface ElectronParticle {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  energy: number;
  alpha: number;
  returning: boolean;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  wavelength: number,
  intensity: number,
  voltage: number,
  metal: Metal,
  electrons: ElectronParticle[],
  keMax: number,
  tick: number,
) {
  const { w: W, h: H } = CONFIG.canvas;
  const { x: TX, y: TY, w: TW, h: TH, r: TR } = CONFIG.tube;
  const { x: CX, w: CW, plateY: PY, plateH: PH } = CONFIG.cathode;
  const { x: AX, w: AW } = CONFIG.anode;

  ctx.fillStyle = '#080c18';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  for (let gx = 20; gx < W; gx += 32) {
    for (let gy = 20; gy < H; gy += 32) {
      ctx.beginPath();
      ctx.arc(gx, gy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (intensity > 0) {
    const flicker = 0.85 + 0.15 * Math.sin(tick * 0.18);
    const beamAlpha = (intensity / 100) * 0.65 * flicker;
    const cathodeMidY = PY + PH / 2;

    const gradient = ctx.createLinearGradient(0, 0, CX, cathodeMidY);
    gradient.addColorStop(0, wavelengthToRGBA(wavelength, 0));
    gradient.addColorStop(1, wavelengthToRGBA(wavelength, beamAlpha));

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(CX, PY - 4);
    ctx.lineTo(CX, PY + PH + 4);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    if (keMax > 0) {
      const glowR = ctx.createRadialGradient(CX, cathodeMidY, 0, CX, cathodeMidY, 55);
      glowR.addColorStop(0, wavelengthToRGBA(wavelength, 0.35 * flicker));
      glowR.addColorStop(1, wavelengthToRGBA(wavelength, 0));
      ctx.fillStyle = glowR;
      ctx.fillRect(CX - 15, PY - 10, 70, PH + 20);
    }
  }

  ctx.save();
  ctx.shadowColor = 'rgba(80,160,255,0.18)';
  ctx.shadowBlur = 18;
  roundRect(ctx, TX, TY, TW, TH, TR);
  ctx.strokeStyle = 'rgba(100,170,255,0.28)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  roundRect(ctx, TX, TY, TW, TH, TR);
  const glassFill = ctx.createLinearGradient(TX, TY, TX, TY + TH);
  glassFill.addColorStop(0, 'rgba(80,130,210,0.10)');
  glassFill.addColorStop(0.5, 'rgba(40,80,160,0.05)');
  glassFill.addColorStop(1, 'rgba(60,110,190,0.10)');
  ctx.fillStyle = glassFill;
  ctx.fill();

  roundRect(ctx, TX, TY, TW, TH, TR);
  ctx.strokeStyle = 'rgba(120,180,255,0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(TX + TR + 2, TY + 5);
  ctx.lineTo(TX + TW - TR - 2, TY + 5);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const cathodeMidX = CX + CW / 2;
  const anodeMidX = AX + AW / 2;

  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = 'rgba(150,150,150,0.25)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cathodeMidX, PY);
  ctx.lineTo(cathodeMidX, TY + 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(anodeMidX, PY + PH);
  ctx.lineTo(anodeMidX, TY + TH - 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.save();
  ctx.shadowColor = metal.color;
  ctx.shadowBlur = keMax > 0 && intensity > 0 ? 12 : 4;
  const cathGrad = ctx.createLinearGradient(CX, 0, CX + CW, 0);
  cathGrad.addColorStop(0, metal.color + 'AA');
  cathGrad.addColorStop(0.5, metal.color);
  cathGrad.addColorStop(1, metal.color + 'CC');
  ctx.fillStyle = cathGrad;
  ctx.fillRect(CX, PY, CW, PH);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(10,14,26,0.9)';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(metal.symbol, CX + CW / 2, PY + PH / 2 + 4);
  ctx.restore();

  if (intensity > 0) {
    ctx.fillStyle = wavelengthToRGBA(wavelength, 0.5);
    for (let d = 0; d < 5; d++) {
      const dy = PY + 20 + d * 28;
      ctx.beginPath();
      ctx.arc(CX + CW + 3, dy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.save();
  ctx.shadowColor = '#8B7355';
  ctx.shadowBlur = 4;
  const anodeGrad = ctx.createLinearGradient(AX, 0, AX + AW, 0);
  anodeGrad.addColorStop(0, '#5A4025');
  anodeGrad.addColorStop(0.5, '#9B7555');
  anodeGrad.addColorStop(1, '#6B5035');
  ctx.fillStyle = anodeGrad;
  ctx.fillRect(AX, PY, AW, PH);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'rgba(130,200,255,0.65)';
  ctx.fillText('cathode (−)', cathodeMidX, TY - 8);
  ctx.fillStyle = 'rgba(200,160,100,0.65)';
  ctx.fillText('anode (+)', anodeMidX, TY - 8);

  const wireY = TY + TH;
  ctx.strokeStyle = 'rgba(180,180,200,0.35)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(cathodeMidX, wireY);
  ctx.lineTo(cathodeMidX, wireY + 28);
  ctx.lineTo(TX + 30, wireY + 28);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(anodeMidX, wireY);
  ctx.lineTo(anodeMidX, wireY + 28);
  ctx.lineTo(TX + TW - 30, wireY + 28);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(180,200,240,0.5)';
  [[TX + 30, wireY + 28], [TX + TW - 30, wireY + 28]].forEach(([ex, ey]) => {
    ctx.beginPath();
    ctx.arc(ex, ey, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  for (const e of electrons) {
    ctx.save();
    if (e.returning) {
      ctx.shadowColor = '#FF9900';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,160,50,${e.alpha})`;
      ctx.fill();
    } else {
      ctx.shadowColor = '#60A5FA';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100,180,255,${e.alpha})`;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,240,255,${e.alpha * 0.9})`;
      ctx.fill();
    }
    ctx.restore();
  }

  if (voltage !== 0) {
    const posX = voltage > 0 ? AX + AW + 6 : CX - 10;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = voltage > 0 ? 'rgba(74,222,128,0.7)' : 'rgba(248,113,113,0.7)';
    ctx.fillText(voltage > 0 ? '+' : '−', posX, PY + PH / 2 + 5);
  }
}
