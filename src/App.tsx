import { useState } from 'react';
import './App.css';
import { ControlPanel } from './components/ControlPanel';
import { GraphCanvas } from './components/GraphCanvas';
import { GraphCanvas3D } from './components/GraphCanvas3D'; // 3Dコンポーネント
import type {Point, InterpolationMethod} from './types';

function App() {
  const [points, setPoints] = useState<Point[]>([]);
  const [activeMethods, setActiveMethods] = useState<Set<InterpolationMethod>>(
    new Set(['linear', 'lagrange', 'newton', 'spline'])
  );
  const [is3DMode, setIs3DMode] = useState(false); // 3Dモードステート

  const handleToggleMethod = (method: InterpolationMethod) => {
    const newMethods = new Set(activeMethods);
    if (newMethods.has(method)) {
      newMethods.delete(method);
    } else {
      newMethods.add(method);
    }
    setActiveMethods(newMethods);
  };

  const handleAddSample = () => {
    // 3DモードならZ座標にも変化をつける
    const newPoints = [
      { x: 1, y: 2, z: is3DMode ? 3 : 0 },
      { x: 2, y: 5, z: is3DMode ? 1 : 0 },
      { x: 4, y: 3, z: is3DMode ? 6 : 0 },
      { x: 6, y: 7, z: is3DMode ? 2 : 0 },
      { x: 8, y: 4, z: is3DMode ? 5 : 0 },
    ];
    setPoints(newPoints);
  };

  const handleClear = () => setPoints([]);

  const handleRemovePoint = (index: number) => {
    setPoints(prev => prev.filter((_, i) => i !== index));
  };

  const handlePointAdd = (point: Point) => {
    setPoints(prev => [...prev, point]);
  };

  const handlePointUpdate = (index: number, newPoint: Point) => {
    setPoints(prev => {
        const next = [...prev];
        next[index] = newPoint;
        return next;
    });
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">
            <span className="logo-icon">📈</span>
            補間法ビジュアライザー
          </h1>
        </div>
      </header>

      <main className="main-content">
        <ControlPanel
          points={points}
          activeMethods={activeMethods}
          is3DMode={is3DMode}
          onToggleMethod={handleToggleMethod}
          onAddSample={handleAddSample}
          onPointAdd={handlePointAdd}
          onClear={handleClear}
          onRemovePoint={handleRemovePoint}
        />

        <section className="graph-section" style={{ position: 'relative' }}>
          {/* 3D切り替えスイッチ */}
          <div className="view-toggle">
              <button 
                  className={`toggle-btn ${!is3DMode ? 'active' : ''}`} 
                  onClick={() => setIs3DMode(false)}
              >
                  2D
              </button>
              <button 
                  className={`toggle-btn ${is3DMode ? 'active' : ''}`} 
                  onClick={() => setIs3DMode(true)}
              >
                  3D
              </button>
          </div>

          <div className="graph-container">
            {is3DMode ? (
                <GraphCanvas3D points={points} activeMethods={activeMethods} />
            ) : (
                <GraphCanvas 
                    points={points} 
                    activeMethods={activeMethods}
                    onPointAdd={handlePointAdd}
                    onPointUpdate={handlePointUpdate}
                    onPointRemove={handleRemovePoint}
                />
            )}
          </div>
          
          <div className="legend">
            {(['linear', 'lagrange', 'newton', 'spline', 'nearest', 'catmullRom', 'akima', 'trigonometric'] as const).map(method => (
                <div key={method} className={`legend-item ${activeMethods.has(method) ? 'active' : ''}`} data-type={method}>
                    <span className="legend-color"></span>
                    <span>
                        {method === 'linear' && '線形補間'}
                        {method === 'lagrange' && 'ラグランジュ補間'}
                        {method === 'newton' && 'ニュートン補間'}
                        {method === 'spline' && 'スプライン補間'}
                        {method === 'nearest' && '最近傍補間'}
                        {method === 'catmullRom' && 'Catmull-Rom'}
                        {method === 'akima' && '秋間スプライン'}
                        {method === 'trigonometric' && '三角関数補間'}
                    </span>
                </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>数値解析学習ツール © 2026</p>
      </footer>
    </div>
  );
}

export default App;
