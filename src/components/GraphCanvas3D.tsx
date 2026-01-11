import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Grid, GizmoHelper, GizmoViewport, Center } from '@react-three/drei';
import * as THREE from 'three';
import type {Point, InterpolationMethod} from '../types';
import { getCurve } from '../utils/interpolation';

interface GraphCanvas3DProps {
    points: Point[];
    activeMethods: Set<InterpolationMethod>;
}

// 補間ごとのカラー定義
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

const InterpolatedLine = ({ method, points, xMin, xMax }: { method: InterpolationMethod, points: Point[], xMin: number, xMax: number }) => {
    const curvePoints = useMemo(() => {
        // Y軸方向の補間
        const curveY = getCurve(method, points, xMin, xMax, 300);
        
        // Z軸方向の補間
        const pointsZ = points.map(p => ({ x: p.x, y: p.z || 0 }));
        const curveZ = getCurve(method, pointsZ, xMin, xMax, 300);

        // XYZを合成
        const points3D: THREE.Vector3[] = [];
        for (let i = 0; i < curveY.length; i++) {
            const zVal = curveZ[i] ? curveZ[i].y : 0;
            
            // Three.jsの座標系に合わせてマッピング
            points3D.push(new THREE.Vector3(curveY[i].x, curveY[i].y, zVal));
        }
        return points3D;
    }, [method, points, xMin, xMax]);

    if (curvePoints.length < 2) 
        return null;

    const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);

    return (
        <primitive object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: colors[method], linewidth: 3 }))} />
    );
};

export const GraphCanvas3D: React.FC<GraphCanvas3DProps> = ({ points, activeMethods }) => {
    // データの範囲を計算して中心を合わせる
    const { xMin, xMax } = useMemo(() => {
        if (points.length === 0) 
            return { xMin: 0, xMax: 10 };
        
        const xs = points.map(p => p.x);
        return { xMin: Math.min(...xs), xMax: Math.max(...xs) };
    }, [points]);

    return (
        <div style={{ width: '100%', height: '100%', background: '#080810', borderRadius: '16px', overflow: 'hidden' }}>
            <Canvas camera={{ position: [5, 5, 15], fov: 50 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                
                <Center>
                    <group>
                        {/* 補間曲線の描画 */}
                        {points.length >= 2 && Array.from(activeMethods).map(method => (
                            <InterpolatedLine 
                                key={method} 
                                method={method} 
                                points={points} 
                                xMin={xMin} 
                                xMax={xMax} 
                            />
                        ))}

                        {/* データ点の描画 */}
                        {points.map((p, i) => (
                            <mesh key={i} position={[p.x, p.y, p.z || 0]}>
                                <sphereGeometry args={[0.15, 16, 16]} />
                                <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
                            </mesh>
                        ))}
                    
                        {/* 補助線 (点から底面へ) */}
                        {points.map((p, i) => (
                            <line key={`stem-${i}`}>
                                <bufferGeometry setFromPoints={[
                                    new THREE.Vector3(p.x, p.y, p.z || 0),
                                    new THREE.Vector3(p.x, 0, p.z || 0)
                                ]} />
                                <lineBasicMaterial color="rgba(255,255,255,0.2)" transparent opacity={0.3} />
                            </line>
                        ))}
                    </group>
                </Center>

                {/* グリッドと軸 */}
                <Grid 
                    position={[0, -0.01, 0]} 
                    args={[20, 20]} 
                    cellSize={1} 
                    cellThickness={0.5} 
                    cellColor="#6f6f6f" 
                    sectionSize={5} 
                    sectionThickness={1} 
                    sectionColor="#9d4b4b" 
                    fadeDistance={30} 
                    infiniteGrid 
                />
                
                {/* 軸ラベル */}
                <group position={[0, 0, 0]}>
                   <axesHelper args={[5]} />
                   <Text position={[5.5, 0, 0]} fontSize={0.5} color="red">X</Text>
                   <Text position={[0, 5.5, 0]} fontSize={0.5} color="green">Y</Text>
                   <Text position={[0, 0, 5.5]} fontSize={0.5} color="blue">Z</Text>
                </group>

                <OrbitControls makeDefault />
                <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
                    <GizmoViewport axisColors={['#9d4b4b', '#2f7f4f', '#3b5b9d']} labelColor="white" />
                </GizmoHelper>
            </Canvas>
            
            <div style={{ position: 'absolute', bottom: 20, left: 20, pointerEvents: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                <p>左ドラッグ: 回転 / 右ドラッグ: 移動 / ホイール: 拡大縮小</p>
            </div>
        </div>
    );
};
