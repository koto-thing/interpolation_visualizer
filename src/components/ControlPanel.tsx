import React, { useState } from 'react';
import type { Point, InterpolationMethod } from "../types";

interface ControlPanelProps {
    points: Point[];
    activeMethods: Set<InterpolationMethod>;
    is3DMode: boolean;
    onToggleMethod: (method: InterpolationMethod) => void;
    onAddSample: () => void;
    onPointAdd: (point: Point) => void;
    onClear: () => void;
    onRemovePoint: (index: number) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
    points,
    activeMethods,
    is3DMode,
    onToggleMethod,
    onAddSample,
    onPointAdd,
    onClear,
    onRemovePoint,
}) => {
    // 入力フォーム用のステート
    const [inputX, setInputX] = useState('0');
    const [inputY, setInputY] = useState('0');
    const [inputZ, setInputZ] = useState('0');

    const sortedPoints = [...points]
        .map((p, originalIndex) => ({ ...p, originalIndex }))
        .sort((a, b) => a.x - b.x);

    const handleManualAdd = (e: React.FormEvent) => {
        e.preventDefault();
        const x = parseFloat(inputX);
        const y = parseFloat(inputY);
        const z = parseFloat(inputZ);
        
        if (!isNaN(x) && !isNaN(y)) {
            onPointAdd({ x, y, z: is3DMode ? z : 0 });
        }
    };
    
    return (
        <aside className='control-panel'>
            {/* 補間方法選択 */}
            <div className='panel-section'>
                <h2 className='section-title'>補間法を選択</h2>
                <div className='interpolation-options'>
                    {(['linear', 'lagrange', 'newton', 'spline', 'nearest', 'catmullRom', 'akima', 'trigonometric'] as InterpolationMethod[]).map(method => (
                        <label key={method} className='checkbox-item' data-color={method}>
                            <input
                                type='checkbox'
                                checked={activeMethods.has(method)}
                                onChange={() => onToggleMethod(method)}
                            />
                            <span className='checkmark'></span>
                            <span className='label-text'>
                                {method === 'linear' && '線形補間'}
                                {method === 'lagrange' && 'ラグランジュ補間'}
                                {method === 'newton' && 'ニュートン補間'}
                                {method === 'spline' && 'スプライン補間'}
                                {method === 'nearest' && '最近傍補間'}
                                {method === 'catmullRom' && 'Catmull-Rom'}
                                {method === 'akima' && '秋間スプライン'}
                                {method === 'trigonometric' && '三角関数補間'}
                            </span>
                            <span className='badge'>{method.charAt(0).toUpperCase() + method.slice(1, 4)}</span>
                        </label>
                    ))}
                </div>
            </div>
            
            {/* データ点入力フォームとリスト */}
            <div className='panel-section'>
                <h2 className='section-title'>データ点</h2>
                
                {/* 座標入力フォーム */}
                <form className="point-input-form" onSubmit={handleManualAdd}>
                    <div className="input-group">
                        <div className="input-field">
                            <label>X</label>
                            <input type="number" step="0.1" value={inputX} onChange={e => setInputX(e.target.value)} />
                        </div>
                        <div className="input-field">
                            <label>Y</label>
                            <input type="number" step="0.1" value={inputY} onChange={e => setInputY(e.target.value)} />
                        </div>
                        {is3DMode && (
                            <div className="input-field">
                                <label>Z</label>
                                <input type="number" step="0.1" value={inputZ} onChange={e => setInputZ(e.target.value)} />
                            </div>
                        )}
                    </div>
                    <button type="submit" className="add-point-btn">点を追加</button>
                </form>

                <div className='points-list'>
                    {points.length === 0 ? (
                        <p className='empty-message'>グラフをクリックまたは上で入力して追加</p>
                    ) : (
                        sortedPoints.map((p) => (
                            <div key={`${p.x}-${p.y}-${p.z}-${p.originalIndex}`} className='point-item'>
                                <span className='coords'>
                                    ({p.x.toFixed(1)}, {p.y.toFixed(1)}{is3DMode ? `, ${p.z?.toFixed(1)}` : ''})
                                </span>
                                <button
                                    className='delete-btn'
                                    onClick={() => onRemovePoint(p.originalIndex)}
                                >
                                    ✕
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
            
            {/* アクションボタン */}
            <div className='panel-section'>
                <h2 className='section-title'>アクション</h2>
                <div className='action-buttons'>
                    <button className='btn btn-secondary' onClick={onAddSample}>
                        <span className='btn-icon'>✨</span>
                        サンプル点を追加
                    </button>
                    <button className='btn btn-danger' onClick={onClear}>
                        <span className='btn-icon'>🗑️</span>
                        すべてクリア
                    </button>
                </div>
            </div>
        </aside>
    );
};
