import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { GameStoreData } from '../../store/gameStore';
import { saveGameData } from '../../store/gameStore';
import { fetchSpinWheelPrizes, createVoucherRedemption, updateVoucherRedemptionStatus } from '../../lib/gameService';
import type { SpinWheelPrizeRow } from '../../lib/gameService';
import { playClickSound, playSpinStartSound, playSpinTickSound, playWinSound } from '../../utils/uiAudio';
import arenaBg from '../../assets/arena_background.webp';
import dimsumImg from '../../assets/dimsum.png';
import shoesImg from '../../assets/shoes.png';
import jamImg from '../../assets/jam.png';
import hiluxImg from '../../assets/hilux.png';
import bajuImg from '../../assets/baju.png';

// ── Default wheel configuration (fallback when Supabase prizes aren't loaded) ──
const DEFAULT_SEGMENTS = [
  { id: 'jam',    label: 'Jam',    color: '#f59e0b', darkColor: '#b45309', img: jamImg, prizeType: 'physical' as const, value: 0 },
  { id: 'sepatu', label: 'Sepatu', color: '#10b981', darkColor: '#047857', img: shoesImg, prizeType: 'physical' as const, value: 0 },
  { id: 'hilux',  label: 'Hilux',  color: '#ef4444', darkColor: '#b91c1c', img: hiluxImg, prizeType: 'physical' as const, value: 0 },
  { id: 'baju',   label: 'Baju',   color: '#3b82f6', darkColor: '#1d4ed8', img: bajuImg, prizeType: 'physical' as const, value: 0 },
  { id: 'dimsum', label: 'Dimsum', color: '#fbbf24', darkColor: '#92400e', img: dimsumImg, prizeType: 'dimsum_bonus' as const, value: 2 },
];

// Fallback prize image map
const FALLBACK_IMAGES: Record<string, string> = {
  jam: jamImg, sepatu: shoesImg, hilux: hiluxImg, baju: bajuImg, dimsum: dimsumImg,
};

interface WheelSegment {
  id: string;
  label: string;
  color: string;
  darkColor: string;
  img: string;
  prizeType: string;
  value: number;
  name?: string;
  description?: string;
  icon?: string;
  weight?: number;
}

interface SpinResult {
  segmentIndex: number;
  segment: WheelSegment;
}

interface SpinWheelScreenProps {
  storeData: GameStoreData;
  onDataChange: (data: GameStoreData) => void;
  onBack: () => void;
  userId?: string;
}

const WA_REDEEM_URL = 'https://wa.me/6285777131454';

type Phase = 'loading' | 'card' | 'ready' | 'spinning' | 'result' | 'summary' | 'voucher';

/** Generate rigged spin results: 2 dimsum + 1 random physical prize */
function generateSpinResultsFromSegments(segments: WheelSegment[]): SpinResult[] {
  const dimsumSegments = segments.filter(s => s.prizeType === 'dimsum_bonus');
  const physicalSegments = segments.filter(s => s.prizeType !== 'dimsum_bonus');
  const isHilux = (seg: WheelSegment) => {
    const key = `${seg.id} ${seg.label} ${seg.name ?? ''}`.toLowerCase();
    return key.includes('hilux');
  };
  
  const results: SpinResult[] = [];
  
  // 2 dimsum spins
  for (let i = 0; i < 2; i++) {
    const seg = dimsumSegments.length > 0 ? dimsumSegments[0] : segments[0];
    results.push({ segmentIndex: segments.indexOf(seg), segment: seg });
  }
  
  // 1 random physical prize (weighted)
  if (physicalSegments.length > 0) {
    // IMPORTANT:
    // - Hilux always has 0 probability (hard-locked)
    // - weight = 0 means never selected
    const safeWeight = (seg: WheelSegment) => {
      if (isHilux(seg)) return 0;
      return Math.max(0, seg.weight ?? 1);
    };
    const totalWeight = physicalSegments.reduce((sum, s) => sum + safeWeight(s), 0);
    let pick = physicalSegments[0];

    if (totalWeight > 0) {
      let rand = Math.random() * totalWeight;
      for (const seg of physicalSegments) {
        rand -= safeWeight(seg);
        if (rand <= 0) { pick = seg; break; }
      }
    }

    results.push({ segmentIndex: segments.indexOf(pick), segment: pick });
  } else {
    results.push(results[0]); // fallback
  }
  
  return results;
}

export const SpinWheelScreen: React.FC<SpinWheelScreenProps> = ({
  storeData,
  onDataChange,
  onBack,
  userId,
}) => {
  const availableSpins = storeData.mysteryBoxRewards
    .filter((r) => r.type === 'spin_ticket')
    .reduce((sum, r) => sum + Math.max(0, r.spins || 0), 0);
  const totalSpins = Math.min(3, availableSpins);

  const [phase, setPhase] = useState<Phase>('loading');
  const [segments, setSegments] = useState<WheelSegment[]>([]);
  const [spinResults, setSpinResults] = useState<SpinResult[]>([]);
  const [currentSpin, setCurrentSpin] = useState(0);
  const [collectedResults, setCollectedResults] = useState<SpinResult[]>([]);
  const [currentResult, setCurrentResult] = useState<SpinResult | null>(null);
  const [sendingWA, setSendingWA] = useState(false);
  // Canvas-based wheel for precise rendering
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const targetRotationRef = useRef(0);
  const isSpinningRef = useRef(false);
  const animFrameRef = useRef(0);
  const imagesLoadedRef = useRef(false);
  const loadedImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const segmentsRef = useRef<WheelSegment[]>([]);

  // Load prizes from Supabase
  useEffect(() => {
    let cancelled = false;
    
    fetchSpinWheelPrizes().then((prizes) => {
      if (cancelled) return;
      
      let segs: WheelSegment[];
      if (prizes.length >= 3) {
        // Use Supabase prizes
        segs = prizes.map(p => ({
          id: p.id,
          label: p.label,
          color: p.color,
          darkColor: p.dark_color,
          img: p.image_url || FALLBACK_IMAGES[p.label.toLowerCase()] || dimsumImg,
          prizeType: p.prize_type,
          value: p.value,
          name: p.name,
          description: p.description,
          icon: p.icon,
          weight: p.weight,
        }));
      } else {
        // Use defaults
        segs = DEFAULT_SEGMENTS.map(s => ({ ...s }));
      }
      
      setSegments(segs);
      segmentsRef.current = segs;
      
      // Generate spin results based on available ticket count
      const results = generateSpinResultsFromSegments(segs).slice(0, Math.max(0, totalSpins));
      setSpinResults(results);
      
      setPhase('card');
    }).catch(() => {
      // Fallback to defaults on error
      const segs = DEFAULT_SEGMENTS.map(s => ({ ...s }));
      setSegments(segs);
      segmentsRef.current = segs;
      setSpinResults(generateSpinResultsFromSegments(segs).slice(0, Math.max(0, totalSpins)));
      setPhase('card');
    });
    
    return () => { cancelled = true; cancelAnimationFrame(animFrameRef.current); };
  }, [totalSpins]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load images for canvas when segments change
  useEffect(() => {
    if (segments.length === 0) return;
    
    let loaded = 0;
    const total = segments.length;
    loadedImagesRef.current = {};
    imagesLoadedRef.current = false;
    
    segments.forEach((seg) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        loadedImagesRef.current[seg.id] = img;
        loaded++;
        if (loaded === total) {
          imagesLoadedRef.current = true;
          drawWheel(rotationRef.current);
        }
      };
      img.onerror = () => {
        loaded++;
        if (loaded === total) {
          imagesLoadedRef.current = true;
          drawWheel(rotationRef.current);
        }
      };
      img.src = seg.img;
    });
  }, [segments]); // eslint-disable-line react-hooks/exhaustive-deps

  const drawWheel = useCallback((rotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const segs = segmentsRef.current;
    if (segs.length === 0) return;

    const numSegments = segs.length;
    const segAngle = 360 / numSegments;
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 8;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);

    // Draw segments
    for (let i = 0; i < numSegments; i++) {
      const seg = segs[i];
      const startAngle = ((i * segAngle - 90) * Math.PI) / 180;
      const endAngle = (((i + 1) * segAngle - 90) * Math.PI) / 180;

      // Segment fill with gradient effect
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      const grad = ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius);
      grad.addColorStop(0, seg.color);
      grad.addColorStop(0.7, seg.color);
      grad.addColorStop(1, seg.darkColor);
      ctx.fillStyle = grad;
      ctx.fill();

      // Segment border
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner glow line
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius - 4, startAngle, endAngle);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Image and label
      const midAngle = ((i * segAngle + segAngle / 2 - 90) * Math.PI) / 180;
      const imgDist = radius * 0.55;
      const imgX = Math.cos(midAngle) * imgDist;
      const imgY = Math.sin(midAngle) * imgDist;
      const imgSize = radius * 0.28;

      // Draw prize image
      const loadedImg = loadedImagesRef.current[seg.id];
      if (loadedImg) {
        ctx.save();
        ctx.translate(imgX, imgY);
        ctx.rotate(midAngle + Math.PI / 2);

        // Image shadow
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 3;
        ctx.drawImage(loadedImg, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
        ctx.shadowColor = 'transparent';

        // Label below image
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(radius * 0.08)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 2;
        ctx.strokeText(seg.label, 0, imgSize / 2 + radius * 0.1);
        ctx.fillText(seg.label, 0, imgSize / 2 + radius * 0.1);

        ctx.restore();
      } else {
        // Fallback: draw emoji icon
        ctx.save();
        ctx.translate(imgX, imgY);
        ctx.rotate(midAngle + Math.PI / 2);
        ctx.font = `${Math.round(imgSize * 0.7)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(seg.icon || '🎁', 0, 0);
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(radius * 0.08)}px sans-serif`;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 2;
        ctx.strokeText(seg.label, 0, imgSize / 2 + radius * 0.1);
        ctx.fillText(seg.label, 0, imgSize / 2 + radius * 0.1);
        ctx.restore();
      }
    }

    // Center hub — 3D effect
    const hubRadius = radius * 0.15;

    const hubGrad = ctx.createRadialGradient(0, -hubRadius * 0.2, 0, 0, 0, hubRadius * 1.2);
    hubGrad.addColorStop(0, '#ffd700');
    hubGrad.addColorStop(0.3, '#b8860b');
    hubGrad.addColorStop(0.6, '#8b6914');
    hubGrad.addColorStop(1, '#5c4a0e');
    ctx.beginPath();
    ctx.arc(0, 0, hubRadius * 1.15, 0, Math.PI * 2);
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const innerGrad = ctx.createRadialGradient(0, -hubRadius * 0.3, 0, 0, 0, hubRadius);
    innerGrad.addColorStop(0, '#2d1810');
    innerGrad.addColorStop(0.5, '#1a0f08');
    innerGrad.addColorStop(1, '#0d0704');
    ctx.beginPath();
    ctx.arc(0, 0, hubRadius, 0, Math.PI * 2);
    ctx.fillStyle = innerGrad;
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    ctx.font = `bold ${Math.round(hubRadius * 0.7)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPIN', 0, 0);

    // Outer ring — 3D metallic border
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(180,140,60,0.8)';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, radius + 3, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(120,90,30,0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Dot markers on rim
    for (let i = 0; i < numSegments * 2; i++) {
      const angle = ((i * (360 / (numSegments * 2))) * Math.PI) / 180;
      const dx = Math.cos(angle) * (radius + 1);
      const dy = Math.sin(angle) * (radius + 1);
      ctx.beginPath();
      ctx.arc(dx, dy, 3, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? '#ffd700' : '#b8860b';
      ctx.fill();
    }

    ctx.restore();
  }, []);

  // Track tick sound timing
  const lastTickAngleRef = useRef(0);

  // Animation loop for spinning
  const animateSpin = useCallback(() => {
    if (!isSpinningRef.current) return;

    const diff = targetRotationRef.current - rotationRef.current;
    if (Math.abs(diff) < 0.1) {
      rotationRef.current = targetRotationRef.current;
      isSpinningRef.current = false;
      drawWheel(rotationRef.current);
      playWinSound();
      setTimeout(() => setPhase('result'), 400);
      return;
    }

    const segs = segmentsRef.current;
    const segAngle = segs.length > 0 ? 360 / segs.length : 72;

    // Play tick sound when passing segment boundaries
    const currentAngle = rotationRef.current % 360;
    const segsPassed = Math.floor(currentAngle / segAngle);
    const lastSegsPassed = Math.floor(lastTickAngleRef.current / segAngle);
    if (segsPassed !== lastSegsPassed) {
      playSpinTickSound();
    }
    lastTickAngleRef.current = currentAngle;

    // Easing — decelerate smoothly
    rotationRef.current += diff * 0.04;
    drawWheel(rotationRef.current);
    animFrameRef.current = requestAnimationFrame(animateSpin);
  }, [drawWheel]);

  const doSpin = useCallback(() => {
    if (currentSpin >= totalSpins || isSpinningRef.current || spinResults.length === 0) return;

    const result = spinResults[currentSpin];
    setCurrentResult(result);
    setPhase('spinning');
    playSpinStartSound();

    const segs = segmentsRef.current;
    const numSegments = segs.length;
    const segAngle = 360 / numSegments;

    // Calculate precise target
    const segIdx = result.segmentIndex;
    const segCenter = segIdx * segAngle + segAngle / 2;
    const offset = (Math.random() - 0.5) * (segAngle * 0.5);
    const targetAngle = (360 - segCenter + offset + 360) % 360;

    const fullSpins = 8 + Math.floor(Math.random() * 4);
    const currentNormalized = rotationRef.current % 360;
    let totalRotation = fullSpins * 360 + targetAngle - currentNormalized;
    if (totalRotation < fullSpins * 360) totalRotation += 360;

    targetRotationRef.current = rotationRef.current + totalRotation;
    isSpinningRef.current = true;
    lastTickAngleRef.current = rotationRef.current % 360;
    animFrameRef.current = requestAnimationFrame(animateSpin);
  }, [currentSpin, spinResults, animateSpin]);

  const applyResults = useCallback(() => {
    let updated = { ...storeData };
    const items = [...updated.inventory];
    const consumedSpins = spinResults.length;

    let remainingToConsume = consumedSpins;
    const rewardsAfterConsume = updated.mysteryBoxRewards.map((reward) => {
      if (reward.type !== 'spin_ticket' || remainingToConsume <= 0) return reward;

      const currentSpins = Math.max(0, reward.spins || 0);
      const used = Math.min(currentSpins, remainingToConsume);
      remainingToConsume -= used;

      return {
        ...reward,
        spins: currentSpins - used,
      };
    });

    for (const result of spinResults) {
      const seg = result.segment;
      if (seg.prizeType === 'dimsum_bonus') {
        updated.totalDimsum += (seg.value || 2);
      } else {
        const existingItem = items.find(i => i.id === `spin_${seg.id}`);
        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          items.push({
            id: `spin_${seg.id}`,
            name: seg.name || `${seg.icon || '🎁'} ${seg.label}`,
            description: seg.description || `${seg.label} from lucky spin!`,
            icon: seg.icon || '🎁',
            quantity: 1,
            type: 'special',
          });
        }
      }
    }

    updated.inventory = items;
    updated.mysteryBoxRewards = rewardsAfterConsume;
    saveGameData(updated);
    return updated;
  }, [storeData, spinResults]);

  const nextSpin = useCallback(() => {
    playClickSound();
    const nextIdx = currentSpin + 1;
    setCollectedResults(prev => [...prev, spinResults[currentSpin]]);
    if (nextIdx >= totalSpins) {
      const updated = applyResults();
      onDataChange(updated);
      setPhase('summary');
    } else {
      setCurrentSpin(nextIdx);
      setPhase('ready');
    }
  }, [currentSpin, spinResults, applyResults, onDataChange]);

  // Draw wheel when phase changes to ready
  useEffect(() => {
    if (phase === 'ready' || phase === 'card') {
      drawWheel(rotationRef.current);
    }
  }, [phase, drawWheel]);

  // Initial draw
  useEffect(() => {
    const timer = setTimeout(() => drawWheel(0), 100);
    return () => clearTimeout(timer);
  }, [drawWheel]);

  // Get image for result display
  const getResultImage = (seg: WheelSegment) => {
    return seg.img || FALLBACK_IMAGES[seg.label.toLowerCase()] || dimsumImg;
  };

  const generateProfessionalWAMessage = useCallback(async () => {
    const physicalPrizes = spinResults
      .filter((r) => r.segment.prizeType !== 'dimsum_bonus')
      .map((r) => `${r.segment.icon || '🎁'} ${r.segment.name || r.segment.label}`);

    const dimsumTotal = spinResults
      .filter((r) => r.segment.prizeType === 'dimsum_bonus')
      .reduce((sum, r) => sum + (r.segment.value || 2), 0);

    const prizeSummary = physicalPrizes.length > 0
      ? physicalPrizes.join(', ')
      : 'Tidak ada hadiah fisik (hanya bonus dimsum)';

    const prompt = [
      'Buat pesan WhatsApp berbahasa Indonesia yang profesional, panjang, sopan, dan hangat.',
      'Tujuan: konfirmasi penukaran voucher hadiah lucky spin ke admin.',
      'Format: salam pembuka, detail hadiah, kode voucher, penutup.',
      'Wajib ada ucapan ulang tahun yang tulus dan elegan.',
      `Hadiah fisik: ${prizeSummary}`,
      `Bonus dimsum: +${dimsumTotal}`,
      'Kode voucher: BAYUGANTENG',
      'Gaya bahasa formal namun tetap ramah.',
    ].join('\n');

    const atxpConnection = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_ATXP_CONNECTION;
    if (atxpConnection) {
      try {
        const res = await fetch('https://llm.atxp.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${atxpConnection}`,
          },
          body: JSON.stringify({
            model: 'gpt-4.1',
            messages: [
              { role: 'system', content: 'Kamu asisten penulis pesan WhatsApp profesional berbahasa Indonesia.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.7,
          }),
        });
        if (res.ok) {
          const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
          const text = data.choices?.[0]?.message?.content?.trim();
          if (text) return text;
        }
      } catch {
        // fallback below
      }
    }

    return [
      'Halo Admin Tim Hadiah,',
      '',
      'Perkenalkan, saya pemenang program Lucky Spin dan ingin melakukan konfirmasi penukaran voucher hadiah dengan rincian berikut:',
      '',
      `• Hadiah fisik: ${prizeSummary}`,
      `• Bonus dimsum: +${dimsumTotal}`,
      '• Kode voucher: BAYUGANTENG',
      '',
      'Mohon bantuannya untuk proses verifikasi dan informasi mekanisme penukaran hadiah selanjutnya.',
      '',
      'Sekaligus saya ingin menyampaikan ucapan ulang tahun yang tulus: semoga di hari istimewa ini senantiasa diberi kesehatan, kebahagiaan, kelancaran rezeki, serta keberhasilan dalam setiap langkah ke depan.',
      '',
      'Terima kasih atas perhatian dan pelayanannya. Saya menunggu konfirmasi dari tim admin.',
      '',
      'Hormat saya,',
      'Player Lucky Spin',
    ].join('\n');
  }, [spinResults]);

  const handleSendVoucherToWhatsApp = useCallback(async () => {
    if (sendingWA) return;
    setSendingWA(true);
    try {
      const msg = await generateProfessionalWAMessage();

      const physicalPrizes = spinResults
        .filter((r) => r.segment.prizeType !== 'dimsum_bonus')
        .map((r) => `${r.segment.icon || '🎁'} ${r.segment.name || r.segment.label}`);
      const prizesText = physicalPrizes.length > 0
        ? physicalPrizes.join(', ')
        : 'Tidak ada hadiah fisik (hanya bonus dimsum)';

      let redemptionId: string | null = null;
      if (userId) {
        const row = await createVoucherRedemption({
          userId,
          sourceType: 'spin_wheel',
          status: 'pending',
          voucherCode: 'BAYUGANTENG',
          prizesText,
          message: msg,
          metadata: {
            spin_results: spinResults.map((r) => ({
              id: r.segment.id,
              label: r.segment.label,
              name: r.segment.name || r.segment.label,
              prize_type: r.segment.prizeType,
              value: r.segment.value,
            })),
          },
        });
        redemptionId = row?.id || null;
      }

      window.open(`${WA_REDEEM_URL}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');

      if (redemptionId) {
        await updateVoucherRedemptionStatus(redemptionId, 'sent');
      }
    } finally {
      setSendingWA(false);
    }
  }, [generateProfessionalWAMessage, sendingWA, spinResults, userId]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col overflow-hidden"
      style={{
        backgroundImage: `url(${arenaBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/55 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3"
        style={{
          background: 'linear-gradient(180deg, rgba(62,40,20,0.9) 0%, transparent 100%)',
        }}
      >
        <button onClick={onBack} className="text-amber-400 font-bold text-sm active:scale-90 transition">← Back</button>
        <h1 className="text-lg font-black text-amber-100" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.7)' }}>
          {phase === 'card' ? '🎂 Special Gift' : '🎰 Lucky Spin'}
        </h1>
        <div className="text-amber-400 text-sm font-bold">
          {phase !== 'loading' && phase !== 'card' && phase !== 'voucher' && phase !== 'summary' ? `${Math.min(currentSpin + 1, totalSpins)}/${totalSpins}` : ''}
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto gap-3 pb-4">
        {/* ═══ PHASE: Loading ═══ */}
        {phase === 'loading' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            <p className="text-sm text-amber-400/70 font-bold">Loading prizes...</p>
          </div>
        )}

        {phase !== 'loading' && totalSpins <= 0 && (
          <div className="w-full max-w-sm rounded-xl p-5 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(62,40,20,0.95) 0%, rgba(40,26,12,0.98) 100%)',
              border: '2px solid rgba(180,140,60,0.35)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            <div className="text-4xl mb-2">🎟️</div>
            <h2 className="text-lg font-black text-amber-200 mb-2">No Spin Ticket Available</h2>
            <p className="text-xs text-amber-500/70 mb-4">Open mystery box with spin reward first.</p>
            <button onClick={onBack}
              className="w-full py-3 rounded-xl text-sm font-black"
              style={{
                background: 'linear-gradient(180deg, #b45309, #78350f)',
                border: '2px solid rgba(251,191,36,0.4)',
                color: '#fef3c7',
              }}
            >
              Back
            </button>
          </div>
        )}

        {/* ═══ PHASE: Birthday Card ═══ */}
        {phase === 'card' && totalSpins > 0 && (
          <div className="w-full max-w-sm animate-fade-in">
            <div className="rounded-2xl p-5 mb-4 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(62,40,20,0.95) 0%, rgba(40,26,12,0.98) 100%)',
                border: '3px solid rgba(180,140,60,0.5)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,215,0,0.15)',
              }}
            >
              <div className="absolute top-2 right-3 text-2xl opacity-30 animate-pulse">✨</div>
              <div className="absolute bottom-3 left-3 text-xl opacity-20 animate-pulse" style={{ animationDelay: '0.5s' }}>🎉</div>

              <div className="text-center">
                <div className="text-5xl mb-3">🎂</div>
                <h2 className="text-xl font-black text-amber-200 mb-2" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                  Selamat Ulang Tahun!
                </h2>
                <div className="w-12 h-0.5 mx-auto rounded-full mb-3" style={{ background: 'linear-gradient(90deg, transparent, #b8860b, transparent)' }} />
                <p className="text-sm text-amber-400/90 leading-relaxed mb-2">
                  Selamat Ulang Tahun Sayang! 🎉🎂✨
                </p>
                <p className="text-xs text-amber-500/70 leading-relaxed mb-2">
                  Di hari spesialmu ini, semoga semua impian dan harapanmu tercapai.
                  Kamu orang yang luar biasa — selalu jadi inspirasi buat orang-orang di sekitarmu.
                </p>
                <p className="text-xs text-amber-500/70 leading-relaxed mb-2">
                  Semoga tahun ini penuh kebahagiaan, kesuksesan, dan banyak dimsum! 🥟💝
                </p>
                <p className="text-xs text-amber-400/80 leading-relaxed italic">
                  Terus jadi versi terbaik dirimu. Dunia butuh lebih banyak orang sepertimu! 🌟
                </p>
                <div className="mt-3 text-xs text-amber-600/50">With love & warm wishes 💖</div>
              </div>
            </div>

            <button onClick={() => { playClickSound(); setPhase('ready'); }}
              className="w-full py-4 rounded-xl text-base font-black uppercase tracking-widest transition active:scale-[0.97] relative overflow-hidden flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(180deg, #b45309 0%, #92400e 40%, #78350f 100%)',
                border: '2px solid rgba(251,191,36,0.5)',
                boxShadow: '0 4px 20px rgba(180,100,10,0.5), inset 0 2px 0 rgba(255,215,0,0.2), inset 0 -2px 0 rgba(0,0,0,0.3)',
                color: '#fef3c7',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              }}
            >
              🎰 Spin for Prizes! (x{totalSpins})
              <div className="absolute inset-0 opacity-15" style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                animation: 'shimmer 2.5s ease-in-out infinite',
              }} />
            </button>
          </div>
        )}

        {/* ═══ PHASE: Wheel (ready / spinning / result) ═══ */}
        {totalSpins > 0 && (phase === 'ready' || phase === 'spinning' || phase === 'result') && (
          <div className="flex flex-col items-center gap-3 w-full max-w-sm">
            <div className="relative" style={{ perspective: '800px' }}>
              {/* Pointer triangle */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20"
                style={{
                  width: 0, height: 0,
                  borderLeft: '14px solid transparent',
                  borderRight: '14px solid transparent',
                  borderTop: '24px solid #ffd700',
                  filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.6))',
                  marginTop: '-4px',
                }}
              />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20"
                style={{
                  width: 0, height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '16px solid #b8860b',
                  marginTop: '-1px',
                }}
              />

              <div style={{ transform: 'rotateX(8deg)', transformStyle: 'preserve-3d' }}>
                <div className="absolute inset-0 rounded-full"
                  style={{
                    background: 'radial-gradient(ellipse, rgba(0,0,0,0.4) 0%, transparent 70%)',
                    transform: 'translateY(12px) scaleY(0.3)',
                  }}
                />
                <canvas
                  ref={canvasRef}
                  width={280}
                  height={280}
                  className="w-[280px] h-[280px]"
                  style={{ filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.5))' }}
                />
              </div>

              {phase === 'spinning' && (
                <div className="absolute inset-0 rounded-full pointer-events-none animate-pulse"
                  style={{ boxShadow: '0 0 40px rgba(251,191,36,0.3), 0 0 80px rgba(251,191,36,0.1)' }}
                />
              )}
            </div>

            {/* Spin Button */}
            {phase === 'ready' && (
              <button onClick={doSpin}
                className="px-10 py-3.5 rounded-xl text-base font-black uppercase tracking-widest transition active:scale-95 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #b45309 0%, #92400e 40%, #78350f 100%)',
                  border: '2px solid rgba(251,191,36,0.5)',
                  boxShadow: '0 4px 20px rgba(180,100,10,0.5), inset 0 2px 0 rgba(255,215,0,0.2)',
                  color: '#fef3c7',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}
              >
                🎰 SPIN #{currentSpin + 1}
              </button>
            )}

            {phase === 'spinning' && (
              <div className="text-amber-300 font-black text-lg animate-pulse" style={{ textShadow: '0 0 10px rgba(251,191,36,0.5)' }}>
                ✨ Spinning... ✨
              </div>
            )}

            {/* Result Card */}
            {phase === 'result' && currentResult && (
              <div className="w-full rounded-xl p-4 text-center animate-bounce-in"
                style={{
                  background: 'linear-gradient(135deg, rgba(62,40,20,0.95) 0%, rgba(40,26,12,0.98) 100%)',
                  border: '2px solid rgba(180,140,60,0.5)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                }}
              >
                <img src={getResultImage(currentResult.segment)} alt="" className="w-16 h-16 mx-auto mb-2 object-contain"
                  style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }} />
                <div className="text-lg font-black text-amber-200 mb-1">
                  {currentResult.segment.icon || ''} {currentResult.segment.name || currentResult.segment.label}
                </div>
                <div className="text-xs text-amber-500/80 mb-3">
                  {currentResult.segment.description || `${currentResult.segment.label} from lucky spin!`}
                </div>
                <button onClick={nextSpin}
                  className="px-8 py-2.5 rounded-lg text-sm font-bold transition active:scale-95"
                  style={{
                    background: 'linear-gradient(180deg, #b45309, #78350f)',
                    border: '1px solid rgba(251,191,36,0.4)',
                    color: '#fef3c7',
                  }}
                >
                  {currentSpin + 1 < totalSpins ? `Next Spin (${currentSpin + 2}/${totalSpins})` : '🎉 See Results!'}
                </button>
              </div>
            )}

            {/* Collected badges */}
            {collectedResults.length > 0 && phase !== 'result' && (
              <div className="flex items-center gap-2">
                {collectedResults.map((r, i) => (
                  <div key={i} className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden"
                    style={{ background: 'rgba(62,40,20,0.8)', border: '1px solid rgba(180,140,60,0.4)' }}
                  >
                    <img src={getResultImage(r.segment)} alt="" className="w-7 h-7 object-contain" />
                  </div>
                ))}
                {Array.from({ length: totalSpins - collectedResults.length }).map((_, i) => (
                  <div key={`e-${i}`} className="w-10 h-10 rounded-lg flex items-center justify-center text-xl text-amber-700/30"
                    style={{ background: 'rgba(62,40,20,0.5)', border: '1px dashed rgba(180,140,60,0.2)' }}
                  >?</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ PHASE: Summary ═══ */}
        {phase === 'summary' && totalSpins > 0 && (
          <div className="w-full max-w-sm rounded-xl p-5 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(62,40,20,0.95) 0%, rgba(40,26,12,0.98) 100%)',
              border: '2px solid rgba(180,140,60,0.5)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="text-xl font-black text-amber-200 mb-3">All Spins Complete!</h2>

            <div className="space-y-2 mb-4">
              {spinResults.map((r, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg p-2.5"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(180,140,60,0.2)' }}
                >
                  <img src={getResultImage(r.segment)} alt="" className="w-10 h-10 object-contain"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} />
                  <div className="text-left flex-1">
                    <div className="text-sm font-bold text-amber-200">
                      {r.segment.icon || ''} {r.segment.name || r.segment.label}
                    </div>
                    <div className="text-[10px] text-amber-500/70">
                      {r.segment.description || `${r.segment.label} from lucky spin!`}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Dimsum bonus */}
            {spinResults.some(r => r.segment.prizeType === 'dimsum_bonus') && (
              <div className="flex items-center justify-center gap-2 mb-4 p-2.5 rounded-lg"
                style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}
              >
                <img src={dimsumImg} alt="" className="w-7 h-7" />
                <span className="text-sm font-bold text-amber-300">
                  +{spinResults.filter(r => r.segment.prizeType === 'dimsum_bonus').reduce((sum, r) => sum + (r.segment.value || 2), 0)} Dimsum Added!
                </span>
              </div>
            )}

            <button
              onClick={handleSendVoucherToWhatsApp}
              disabled={sendingWA}
              className="w-full py-3 rounded-xl text-sm font-black uppercase tracking-wider transition active:scale-95 flex items-center justify-center disabled:opacity-60"
              style={{
                background: 'linear-gradient(180deg, #059669 0%, #047857 100%)',
                border: '2px solid rgba(52,211,153,0.5)',
                boxShadow: '0 4px 16px rgba(5,150,105,0.4)',
                color: '#ecfdf5',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              }}
            >
              {sendingWA ? '🤖 Menyiapkan pesan AI...' : '🎫 Tukarkan Voucher'}
            </button>

            <button onClick={onBack} className="mt-2 text-xs text-amber-500/60 underline">
              Skip for now
            </button>
          </div>
        )}

        {/* ═══ PHASE: Voucher + Barcode Display ═══ */}
        {phase === 'voucher' && (
          <div className="w-full max-w-sm rounded-xl p-5 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(62,40,20,0.95) 0%, rgba(40,26,12,0.98) 100%)',
              border: '2px solid rgba(180,140,60,0.5)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            <div className="text-4xl mb-2">🎫</div>
            <h2 className="text-xl font-black text-amber-200 mb-1">Voucher Prizes</h2>
            <p className="text-[10px] text-amber-500/70 mb-3">
              Tunjukkan barcode ini ke kasir untuk menukarkan hadiah fisik
            </p>

            <div className="space-y-2 mb-4">
              {spinResults.filter(r => r.segment.prizeType !== 'dimsum_bonus').map((r, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg p-2.5"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(52,211,153,0.3)' }}
                >
                  <img src={getResultImage(r.segment)} alt="" className="w-10 h-10 object-contain" />
                  <div className="text-left flex-1">
                    <div className="text-sm font-bold text-emerald-300">
                      {r.segment.icon || ''} {r.segment.name || r.segment.label}
                    </div>
                    <div className="text-[10px] text-emerald-500/70">
                      {r.segment.description || `${r.segment.label} from lucky spin!`}
                    </div>
                  </div>
                  <div className="text-[8px] font-bold text-amber-400 bg-amber-900/50 rounded px-2 py-0.5">VOUCHER</div>
                </div>
              ))}
            </div>

            {/* Barcode display */}
            <div className="rounded-xl p-4 mb-4" style={{ background: '#fff' }}>
              <BarcodeDisplay code="BAYUGANTENG" />
              <div className="text-xs font-mono font-bold text-gray-600 mt-2">BAYUGANTENG</div>
            </div>

            <p className="text-[10px] text-amber-500/60 mb-3 italic">
              * Barcode ini hanya bisa digunakan satu kali
            </p>

            <button onClick={onBack}
              className="w-full py-3 rounded-xl text-sm font-black uppercase tracking-wider transition active:scale-95"
              style={{
                background: 'linear-gradient(180deg, #b45309, #78350f)',
                border: '2px solid rgba(251,191,36,0.4)',
                color: '#fef3c7',
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        @keyframes bounce-in {
          0% { opacity: 0; transform: scale(0.8); }
          60% { transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-bounce-in { animation: bounce-in 0.4s ease-out; }
      `}</style>
    </div>
  );
};

/* ── CSS-based Barcode Display ─────────────────────────────────────────── */
const BarcodeDisplay: React.FC<{ code: string }> = ({ code }) => {
  const bars: { width: number; dark: boolean }[] = [];
  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    for (let b = 0; b < 4; b++) {
      const bit = (charCode >> b) & 1;
      bars.push({ width: bit ? 3 : 2, dark: b % 2 === 0 });
      bars.push({ width: bit ? 1 : 2, dark: b % 2 !== 0 });
    }
  }

  return (
    <div className="flex items-center justify-center gap-[1px] h-14">
      <div className="w-[2px] h-full bg-black" />
      <div className="w-[1px] h-full bg-white" />
      <div className="w-[2px] h-full bg-black" />
      {bars.map((bar, i) => (
        <div key={i} className="h-full"
          style={{ width: `${bar.width}px`, backgroundColor: bar.dark ? '#000' : '#fff' }}
        />
      ))}
      <div className="w-[2px] h-full bg-black" />
      <div className="w-[1px] h-full bg-white" />
      <div className="w-[2px] h-full bg-black" />
    </div>
  );
};
