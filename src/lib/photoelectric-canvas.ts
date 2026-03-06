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

function drawLabelChip(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  fill: string,
  stroke: string,
  textColor: string
) {
  ctx.save();
  ctx.font = '600 10px system-ui, sans-serif';
  const textWidth = ctx.measureText(text).width;
  const chipWidth = textWidth + 18;
  const chipHeight = 18;
  const chipX = centerX - chipWidth / 2;
  const chipY = centerY - chipHeight / 2;

  roundRect(ctx, chipX, chipY, chipWidth, chipHeight, 9);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textColor;
  ctx.fillText(text, centerX, centerY + 0.5);
  ctx.restore();
}

function drawTerminalNode(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.shadowColor = 'rgba(147,197,253,0.35)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(23,37,84,0.95)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(148,163,184,0.75)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(x, y, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(191,219,254,0.9)';
  ctx.fill();
  ctx.restore();
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
  const cathodeMidX = CX + CW / 2;
  const anodeMidX = AX + AW / 2;
  const cathodeMidY = PY + PH / 2;
  const wireY = TY + TH;
  const leftTerminal = { x: TX + 46, y: wireY + 36 };
  const rightTerminal = { x: TX + TW - 46, y: wireY + 36 };
  const beamColor = wavelengthToRGBA(wavelength, 1);

  const background = ctx.createLinearGradient(0, 0, 0, H);
  background.addColorStop(0, '#11182d');
  background.addColorStop(0.55, '#0d1528');
  background.addColorStop(1, '#09101d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, W, H);

  const ambientGlow = ctx.createRadialGradient(120, 40, 10, 120, 40, 280);
  ambientGlow.addColorStop(0, wavelengthToRGBA(wavelength, 0.14));
  ambientGlow.addColorStop(0.35, 'rgba(96,165,250,0.08)');
  ambientGlow.addColorStop(1, 'rgba(8,12,24,0)');
  ctx.fillStyle = ambientGlow;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.018)';
  for (let gx = 28; gx < W; gx += 48) {
    for (let gy = 22 + ((gx / 48) % 2) * 9; gy < H; gy += 42) {
      ctx.beginPath();
      ctx.arc(gx, gy, 0.65, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (intensity > 0) {
    const flicker = 0.85 + 0.15 * Math.sin(tick * 0.18);
    const beamAlpha = (intensity / 100) * 0.65 * flicker;

    const beamGradient = ctx.createLinearGradient(0, 0, CX + 25, cathodeMidY);
    beamGradient.addColorStop(0, wavelengthToRGBA(wavelength, 0.02));
    beamGradient.addColorStop(0.35, wavelengthToRGBA(wavelength, beamAlpha * 0.35));
    beamGradient.addColorStop(1, wavelengthToRGBA(wavelength, beamAlpha));

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(CX + 4, PY - 10);
    ctx.lineTo(CX + 4, PY + PH + 10);
    ctx.closePath();
    ctx.fillStyle = beamGradient;
    ctx.fill();

    if (keMax > 0) {
      const glowR = ctx.createRadialGradient(CX + 2, cathodeMidY, 0, CX + 2, cathodeMidY, 72);
      glowR.addColorStop(0, wavelengthToRGBA(wavelength, 0.32 * flicker));
      glowR.addColorStop(0.45, wavelengthToRGBA(wavelength, 0.14 * flicker));
      glowR.addColorStop(1, wavelengthToRGBA(wavelength, 0));
      ctx.fillStyle = glowR;
      ctx.fillRect(CX - 28, PY - 22, 100, PH + 44);
    }
  }

  ctx.save();
  ctx.shadowColor = 'rgba(96,165,250,0.22)';
  ctx.shadowBlur = 22;
  roundRect(ctx, TX, TY, TW, TH, TR);
  ctx.strokeStyle = 'rgba(130,186,255,0.3)';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();

  roundRect(ctx, TX, TY, TW, TH, TR);
  const glassFill = ctx.createLinearGradient(TX, TY, TX, TY + TH);
  glassFill.addColorStop(0, 'rgba(92,130,214,0.18)');
  glassFill.addColorStop(0.45, 'rgba(43,69,132,0.12)');
  glassFill.addColorStop(1, 'rgba(78,119,200,0.16)');
  ctx.fillStyle = glassFill;
  ctx.fill();

  ctx.save();
  roundRect(ctx, TX, TY, TW, TH, TR);
  ctx.clip();
  const tubeMist = ctx.createLinearGradient(TX, TY, TX + TW, TY + TH);
  tubeMist.addColorStop(0, 'rgba(255,255,255,0.08)');
  tubeMist.addColorStop(0.3, 'rgba(255,255,255,0.02)');
  tubeMist.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = tubeMist;
  ctx.fillRect(TX, TY, TW, TH);
  ctx.restore();

  roundRect(ctx, TX, TY, TW, TH, TR);
  ctx.strokeStyle = 'rgba(175,216,255,0.28)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  ctx.strokeStyle = 'rgba(165,180,252,0.26)';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cathodeMidX, PY + PH);
  ctx.lineTo(cathodeMidX, wireY - 12);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(anodeMidX, PY + PH);
  ctx.lineTo(anodeMidX, wireY - 12);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = metal.color;
  ctx.shadowBlur = keMax > 0 && intensity > 0 ? 18 : 6;
  const cathGrad = ctx.createLinearGradient(CX, 0, CX + CW, 0);
  cathGrad.addColorStop(0, metal.color + '95');
  cathGrad.addColorStop(0.5, metal.color);
  cathGrad.addColorStop(1, metal.color + 'D5');
  ctx.fillStyle = cathGrad;
  ctx.fillRect(CX, PY, CW, PH);
  ctx.strokeStyle = 'rgba(255,248,220,0.32)';
  ctx.lineWidth = 0.9;
  ctx.strokeRect(CX + 0.5, PY + 0.5, CW - 1, PH - 1);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(20,24,38,0.92)';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(metal.symbol, CX + CW / 2, PY + PH / 2 + 4);
  ctx.restore();

  if (intensity > 0) {
    ctx.fillStyle = wavelengthToRGBA(wavelength, 0.36);
    for (let d = 0; d < 5; d++) {
      const dy = PY + 20 + d * 28;
      ctx.beginPath();
      ctx.arc(CX + CW + 4, dy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.save();
  ctx.shadowColor = 'rgba(255,205,160,0.26)';
  ctx.shadowBlur = 8;
  const anodeGrad = ctx.createLinearGradient(AX, 0, AX + AW, 0);
  anodeGrad.addColorStop(0, '#6d5136');
  anodeGrad.addColorStop(0.5, '#c5a48d');
  anodeGrad.addColorStop(1, '#8c6848');
  ctx.fillStyle = anodeGrad;
  ctx.fillRect(AX, PY, AW, PH);
  ctx.strokeStyle = 'rgba(255,237,213,0.22)';
  ctx.lineWidth = 0.9;
  ctx.strokeRect(AX + 0.5, PY + 0.5, AW - 1, PH - 1);
  ctx.restore();

  drawLabelChip(
    ctx,
    'catod  −',
    cathodeMidX,
    TY - 14,
    'rgba(15,23,42,0.82)',
    'rgba(96,165,250,0.28)',
    'rgba(191,219,254,0.92)'
  );
  drawLabelChip(
    ctx,
    'anod  +',
    anodeMidX,
    TY - 14,
    'rgba(24,24,27,0.8)',
    'rgba(251,191,36,0.22)',
    'rgba(253,230,138,0.9)'
  );

  ctx.save();
  ctx.strokeStyle = 'rgba(148,163,184,0.52)';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cathodeMidX, wireY);
  ctx.lineTo(cathodeMidX, leftTerminal.y);
  ctx.lineTo(leftTerminal.x, leftTerminal.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(anodeMidX, wireY);
  ctx.lineTo(anodeMidX, rightTerminal.y);
  ctx.lineTo(rightTerminal.x, rightTerminal.y);
  ctx.stroke();
  ctx.restore();
  drawTerminalNode(ctx, leftTerminal.x, leftTerminal.y);
  drawTerminalNode(ctx, rightTerminal.x, rightTerminal.y);

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
    const posX = voltage > 0 ? AX + AW + 22 : CX - 22;
    const badgeY = cathodeMidY;
    ctx.save();
    ctx.shadowColor = voltage > 0 ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.3)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(posX, badgeY, 10, 0, Math.PI * 2);
    ctx.fillStyle = voltage > 0 ? 'rgba(20,83,45,0.75)' : 'rgba(127,29,29,0.7)';
    ctx.fill();
    ctx.strokeStyle = voltage > 0 ? 'rgba(74,222,128,0.45)' : 'rgba(248,113,113,0.42)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = voltage > 0 ? 'rgba(134,239,172,0.92)' : 'rgba(254,202,202,0.92)';
    ctx.fillText(voltage > 0 ? '+' : '−', posX, badgeY + 0.5);
  }

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let y = 18; y < H; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  const vignette = ctx.createLinearGradient(0, 0, W, 0);
  vignette.addColorStop(0, 'rgba(4,8,18,0.24)');
  vignette.addColorStop(0.12, 'rgba(4,8,18,0)');
  vignette.addColorStop(0.88, 'rgba(4,8,18,0)');
  vignette.addColorStop(1, 'rgba(4,8,18,0.3)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
