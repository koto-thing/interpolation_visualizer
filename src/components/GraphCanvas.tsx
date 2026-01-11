import React, { useRef, useEffect, useState } from "react";
import type { Point, InterpolationMethod } from '../types';
import { getCurve } from "../utils/interpolation";

interface GraphCanvasProps {
    points: Point[];
    activeMethods: Set<InterpolationMethod>;
    onPointAdd: (point: Point) => void;
    onPointUpdate: (index: number, point: Point) => void;
    onPointRemove: (index: number) => void;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
    points,
    activeMethods,
    onPointAdd,
    onPointUpdate,
    onPointRemove,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
    const [draggingPoint, setDraggingPoint] = useState<number | null>(null);
    
    // Zoom & Pan State
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

    // 定数を設定
    const padding = { top: 40, right: 40, bottom: 50, left: 60 };
    const initialXRange = { min: 0, max: 10 };
    const initialYRange = { min: 0, max: 10 };
    const colors: Record<InterpolationMethod, string> = {
        linear: '#00f2fe',
        lagrange: '#4facfe',
        newton: '#fa709a',
        spline: '#a855f7',
        nearest: '#fccb90',
        catmullRom: '#ff9a9e',
        akima: '#84fab0',
        trigonometric: '#a18cd1',
    };
    
    // 座標変換のヘルパー関数
    // Canvas座標への変換: (Data - Offset) * Scale -> Canvas
    const toCanvasX = (x: number, width: number) => {
        const w = width - padding.left - padding.right;
        // データ座標を0-1に正規化してからスケールとオフセットを適用
        const normalized = (x - initialXRange.min) / (initialXRange.max - initialXRange.min);
        const scaled = normalized * scale + offset.x;
        return padding.left + scaled * w;
    };
    
    const toCanvasY = (y: number, height: number) => {
        const h = height - padding.top - padding.bottom;
        const normalized = (y - initialYRange.min) / (initialYRange.max - initialYRange.min);
        const scaled = normalized * scale + offset.y;
        return height - padding.bottom - scaled * h;
    };
    
    // データ座標への変換
    const toDataX = (canvasX: number, width: number) => {
        const w = width - padding.left - padding.right;
        const normalizedCanvas = (canvasX - padding.left) / w;
        const normalizedData = (normalizedCanvas - offset.x) / scale;
        return initialXRange.min + normalizedData * (initialXRange.max - initialXRange.min);
    };
    
    const toDataY = (canvasY: number, height: number) => {
        const h = height - padding.top - padding.bottom;
        const normalizedCanvas = (height - padding.bottom - canvasY) / h;
        const normalizedData = (normalizedCanvas - offset.y) / scale;
        return initialYRange.min + normalizedData * (initialYRange.max - initialYRange.min);
    };
    
    // リサイズを監視
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                setDimensions({ width, height });
                
                if (canvasRef.current) {
                    const dpr = window.devicePixelRatio || 1;
                    canvasRef.current.width = width * dpr;
                    canvasRef.current.height = height * dpr;
                    const ctx = canvasRef.current.getContext('2d');
                    if (ctx)
                        ctx.scale(dpr, dpr);
                } 
            }
        };
        
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    // 描画処理
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || dimensions.width === 0) 
            return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) 
            return;
        
        const { width, height } = dimensions;
        
        // キャンバスをクリア
        ctx.clearRect(0, 0, width, height);
        
        // クリップ領域を設定 (軸の外には描画しない)
        ctx.save();
        ctx.beginPath();
        ctx.rect(padding.left, padding.top, width - padding.left - padding.right, height - padding.top - padding.bottom);
        ctx.clip();

        // グリッド描画 (表示範囲に基づいて動的に描画)
        const visibleXMin = Math.floor(toDataX(padding.left, width) - 1);
        const visibleXMax = Math.ceil(toDataX(width - padding.right, width) + 1);
        const visibleYMin = Math.floor(toDataY(height - padding.bottom, height) - 1);
        const visibleYMax = Math.ceil(toDataY(padding.top, height) + 1);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        
        for (let x = visibleXMin; x <= visibleXMax; x++) {
            const cx = toCanvasX(x, width);
            ctx.beginPath(); ctx.moveTo(cx, padding.top); ctx.lineTo(cx, height - padding.bottom); ctx.stroke();
        }
        
        for (let y = visibleYMin; y <= visibleYMax; y++) {
            const cy = toCanvasY(y, height);
            ctx.beginPath(); ctx.moveTo(padding.left, cy); ctx.lineTo(width - padding.right, cy); ctx.stroke();
        }

        // 補間曲線を描画する
        if (points.length >= 2) {
            const sorted = [...points].sort((a, b) => a.x - b.x);
            // 描画範囲より少し広く計算する
            // const xStart = Math.max(sorted[0].x, visibleXMin);
            // const xEnd = Math.min(sorted[sorted.length - 1].x, visibleXMax);

            (['linear', 'lagrange', 'newton', 'spline', 'nearest', 'catmullRom', 'akima', 'trigonometric'] as InterpolationMethod[]).forEach(method => {
                if (!activeMethods.has(method)) 
                    return;
                
                const curve = getCurve(method, points, sorted[0].x, sorted[sorted.length - 1].x, 300);
                if (!curve.length) 
                    return;
                
                ctx.strokeStyle = colors[method];
                ctx.lineWidth = 2.5;
                ctx.shadowColor = colors[method];
                ctx.shadowBlur = 8;
                ctx.beginPath();
                
                let started = false;
                for (const pt of curve) {
                    const cx = toCanvasX(pt.x, width);
                    const cy = toCanvasY(pt.y, height);
                    
                    // 簡易クリッピング
                    if (cx < padding.left - 50 || cx > width - padding.right + 50 || 
                        cy < padding.top - 50 || cy > height - padding.bottom + 50) {
                    }
                    
                    if (started) 
                        ctx.lineTo(cx, cy);
                    
                    else ctx.moveTo(cx, cy);
                    started = true;
                }
                ctx.stroke();
                ctx.shadowBlur = 0;
            });
        }

        // 点の描画
        points.forEach((p, i) => {
            const cx = toCanvasX(p.x, width);
            const cy = toCanvasY(p.y, height);
            
            // 範囲外の点は描画しない
            if (cx < padding.left || cx > width - padding.right || cy < padding.top || cy > height - padding.bottom) 
                return;

            const isHovered = i === hoveredPoint;
            const r = isHovered ? 10 : 8;
            
            ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; ctx.fill();
            
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = '#fff'; ctx.fill();
            
            ctx.strokeStyle = isHovered ? '#4facfe' : 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2; ctx.stroke();
        });

        ctx.restore(); // クリップ解除

        // 軸を描画する (常に表示)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        
        // 目盛り数値の描画
        for (let x = visibleXMin; x <= visibleXMax; x += 1) {
            if (x % 2 !== 0 && scale < 1.5) 
                continue; // 縮小時は奇数を間引く
            
            const cx = toCanvasX(x, width);
            if (cx >= padding.left && cx <= width - padding.right)
                ctx.fillText(x.toString(), cx, height - padding.bottom + 18);
        }
        
        ctx.textAlign = 'right';
        for (let y = visibleYMin; y <= visibleYMax; y += 1) {
            if (y % 2 !== 0 && scale < 1.5) 
                continue;
            
            const cy = toCanvasY(y, height);
            if (cy >= padding.top && cy <= height - padding.bottom)
                ctx.fillText(y.toString(), padding.left - 10, cy + 4);
        }
        
    }, [dimensions, points, activeMethods, hoveredPoint, scale, offset]);
    
    // マウスイベント処理
    const getMousePos = (e: React.MouseEvent) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    
    const hitTest = (mx: number, my: number) => {
        const { width, height } = dimensions;
        // マウス位置がプロットエリア外ならヒットテストしない
        if (mx < padding.left || mx > width - padding.right || my < padding.top || my > height - padding.bottom) 
            return -1;

        for (let i = 0 ; i < points.length ; i++) {
            const px = toCanvasX(points[i].x, width);
            const py = toCanvasY(points[i].y, height);
            if (Math.hypot(mx - px,  my - py) <= 15) 
                return i;
        }
        
        return -1;
    };
    
    const handleMouseDown = (e: React.MouseEvent) => {
        const { x, y } = getMousePos(e);

        // 右クリック or 中クリック: パンニング開始
        if (e.button === 2 || e.button === 1) {
            e.preventDefault();
            setIsPanning(true);
            setLastMousePos({ x, y });
            return;
        }

        // 左クリック
        if (e.button === 0) {
            const index = hitTest(x, y);
            if (index >= 0) {
                setDraggingPoint(index);
            } else {
                // プロットエリア内クリックのみ追加
                const { width, height } = dimensions;
                if (x >= padding.left && x <= width - padding.right && y >= padding.top && y <= height - padding.bottom) {
                    const dataX = toDataX(x, width);
                    const dataY = toDataY(y, height);
                    onPointAdd({ x: dataX, y: dataY });
                }
            }
        }
    };
    
    const handleMouseMove = (e: React.MouseEvent) => {
        const { x, y } = getMousePos(e);
        
        if (isPanning) {
            const dx = x - lastMousePos.x;
            const dy = y - lastMousePos.y;
            
            // ピクセル移動量を正規化座標系に変換してオフセットに加算
            const w = dimensions.width - padding.left - padding.right;
            const h = dimensions.height - padding.top - padding.bottom;
            
            setOffset(prev => ({
                x: prev.x + dx / w,
                y: prev.y - dy / h
            }));
            setLastMousePos({ x, y });
            return;
        }

        if (draggingPoint !== null) {
            let dataX = toDataX(x, dimensions.width);
            let dataY = toDataY(y, dimensions.height);
            // ドラッグ中は制限なし
            // dataX = Math.max(xRange.min, Math.min(10, dataX)); 
            // dataY = Math.max(yRange.min, Math.min(10, dataY));
            onPointUpdate(draggingPoint, { x: dataX, y: dataY });
        } else {
            const index = hitTest(x, y);
            if (index !== hoveredPoint) {
                setHoveredPoint(index >= 0 ? index : null);
            }
        }
    };
    
    const handleMouseUp = () => {
        setDraggingPoint(null);
        setIsPanning(false);
    }

    const handleWheel = (e: React.WheelEvent) => {
        const zoomIntensity = 0.1;
        const direction = e.deltaY > 0 ? -1 : 1;
        const factor = 1 + direction * zoomIntensity;
        
        const newScale = Math.max(0.1, Math.min(10, scale * factor)); // 0.1倍〜10倍
        
        // マウス位置を中心にズームするためのオフセット補正
        const { x, y } = getMousePos(e);
        
        // マウス位置の相対座標
        const w = dimensions.width - padding.left - padding.right;
        const h = dimensions.height - padding.top - padding.bottom;
        
        setScale(newScale);
        
        const normMouseX = (x - padding.left) / w;
        const normMouseY = (dimensions.height - padding.bottom - y) / h;
        
        const mouseDataX = (normMouseX - offset.x) / scale;
        const mouseDataY = (normMouseY - offset.y) / scale;
        
        const newOffsetX = normMouseX - mouseDataX * newScale;
        const newOffsetY = normMouseY - mouseDataY * newScale;
        
        setOffset({ x: newOffsetX, y: newOffsetY });
    };
    
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!isPanning) { // パンニング操作としての右クリックでない場合のみ削除
             const { x, y } = getMousePos(e);
             const index = hitTest(x,  y);
             if (index >= 0) {
                 onPointRemove(index);
             }
        }
    };
    
    return (
        <div className='graph-container' ref={containerRef} style={{ width: '100%', height: '100%'}}>
            <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%', display: 'block' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={handleContextMenu}
                onWheel={handleWheel}
            />
            {points.length === 0 && (
                <div className='graph-overlay'>
                    <p>グラフエリアをクリックして最初の点を追加<br/>右ドラッグで移動 / ホイールで拡大縮小</p>
                </div>
            )}
        </div>
    );
};
