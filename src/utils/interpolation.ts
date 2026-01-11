export interface Point {
    x: number;
    y: number;
}

interface SplineCoefficients {
    a: number;
    b: number;
    c: number;
    d: number;
}

/**
 * 線形補間
 * @param points データ点
 * @param x 補間したいx値
 * @returns 補間されたy値またはnull
 */
export const linear = (points: Point[], x: number): number | null => {
    if (points.length < 2)
        return null;
    
    const sorted = [...points].sort((a, b) => a.x - b.x);
    if (x < sorted[0].x || x > sorted[sorted.length - 1].x) 
        return null;
    
    for (let i = 0 ; i < sorted.length - 1 ; i++) {
        if (x >= sorted[i].x && x <= sorted[i + 1].x) {
            const t = (x - sorted[i].x) / (sorted[i + 1].x - sorted[i].x);
            return sorted[i].y + t * (sorted[i + 1].y - sorted[i].y);
        }
    }
    
    return null;
};

/**
 * 最近傍法
 * @param points データ点
 * @param x 補間したいx値
 * @returns 補間されたy値またはnull
 */
export const nearest = (points: Point[], x: number): number | null => {
    if (points.length < 1) 
        return null;
    
    let minDist = Infinity;
    let nearestY = null;
    for (const p of points) {
        const dist = Math.abs(x - p.x);
        if (dist < minDist) {
            minDist = dist;
            nearestY = p.y;
        }
    }
    
    return nearestY;
};

/**
 * ラグランジュ補間
 * @param points データ点
 * @param x 補間したいx値
 * @returns 補間されたy値またはnull
 */
export const lagrange = (points: Point[], x: number): number | null => {
    if (points.length < 2) 
        return null;
    
    let result = 0;
    const n = points.length;
    for (let i = 0 ; i < n ; i++) {
        let term = points[i].y;
        for (let j = 0 ; j < n ; j++) {
            if (i !== j) {
                const denominator = points[i].x - points[j].x;
                if (Math.abs(denominator) < 1e-10) 
                    continue;
                
                term *= (x - points[j].x) / denominator;
            } 
        }
        
        result += term;
    }
    
    return result;
};

/**
 * ニュートン補間
 * @param points データ点
 * @param x 補間したいx値
 * @returns 補間されたy値またはnull
 */
export const newton = (points: Point[], x: number): number | null => {
    if (points.length < 2) 
        return null;
    
    const n = points.length;
    const sorted = [...points].sort((a, b) => a.x - b.x);
    const divided: number[][] = [];
    
    for (let i = 0 ; i < n ; i++) 
        divided[i] = [sorted[i].y];
    
    for (let j = 1 ; j < n ; j++) {
        for (let i = 0 ; i < n - j ; i++) {
            const denominator = sorted[i + j].x - sorted[i].x;
            if (Math.abs(denominator) < 1e-10) {
                 divided[i].push(0);
                 continue;
            }
            
            divided[i].push((divided[i + 1][j - 1] - divided[i][j - 1]) / denominator);
        }
    }
    
    let result = divided[0][0];
    let product = 1;
    for (let i = 1 ; i < n ; i++) {
        product *= (x - sorted[i - 1].x);
        result += divided[0][i] * product;
    }
    
    return result;
};

/**
 * Catmull-Rom補間
 * @param points データ点
 * @param x 補間したいx値
 * @returns 補間されたy値またはnull
 */
export const catmullRom = (points: Point[], x: number): number | null => {
    if (points.length < 2) 
        return null;
    
    const sorted = [...points].sort((a, b) => a.x - b.x);
    if (x < sorted[0].x || x > sorted[sorted.length - 1].x) 
        return null;

    // 区間検索
    let i = 0;
    for (i = 0; i < sorted.length - 1; i++) {
        if (x <= sorted[i+1].x) 
            break;
    }
    
    if (i >= sorted.length - 1)
        i = sorted.length - 2;

    const p0 = i > 0 ? sorted[i-1] : { x: sorted[i].x - (sorted[i+1].x - sorted[i].x), y: sorted[i].y - (sorted[i+1].y - sorted[i].y) };
    const p1 = sorted[i];
    const p2 = sorted[i+1];
    const p3 = i < sorted.length - 2 ? sorted[i+2] : { x: sorted[i+1].x + (sorted[i+1].x - sorted[i].x), y: sorted[i+1].y + (sorted[i+1].y - sorted[i].y) };

    const t = (x - p1.x) / (p2.x - p1.x);
    const t2 = t * t;
    const t3 = t2 * t;

    // Catmull-Rom basis functions
    const b0 = -0.5 * t3 + t2 - 0.5 * t;
    const b1 =  1.5 * t3 - 2.5 * t2 + 1.0;
    const b2 = -1.5 * t3 + 2.0 * t2 + 0.5 * t;
    const b3 =  0.5 * t3 - 0.5 * t2;

    return p0.y * b0 + p1.y * b1 + p2.y * b2 + p3.y * b3;
};

/**
 * 秋間スプライン補間
 * @param points データ点
 * @param x 補間したいx値
 * @returns 補間されたy値またはnull
 */
export const akima = (points: Point[], x: number): number | null => {
    if (points.length < 5) 
        return spline(points, x); // 点が少ない場合は通常のスプライン
    
    const sorted = [...points].sort((a, b) => a.x - b.x);
    if (x < sorted[0].x || x > sorted[sorted.length - 1].x) 
        return null;

    const n = sorted.length;
    const m: number[] = []; // 傾き

    for (let i = 0; i < n - 1; i++) {
        m[i] = (sorted[i+1].y - sorted[i].y) / (sorted[i+1].x - sorted[i].x);
    }

    // 外挿してm[-2], m[-1], m[n-1], m[n] を推定
    const m_pre2 = 2 * m[0] - m[1];
    const m_pre1 = 2 * m_pre2 - m[0];
    const m_post1 = 2 * m[n-2] - m[n-3];
    const m_post2 = 2 * m_post1 - m[n-2];

    const mm = [m_pre1, m_pre2, ...m, m_post1, m_post2]; // 拡張された傾き配列

    // 点iでの微分係数 s[i]
    const s: number[] = [];
    for (let i = 0; i < n; i++) {
        const a = Math.abs(mm[i+3] - mm[i+2]);
        const b = Math.abs(mm[i+1] - mm[i]);
        if (a + b < 1e-10) {
            s[i] = (mm[i+2] + mm[i+1]) / 2;
        } else {
            s[i] = (a * mm[i+1] + b * mm[i+2]) / (a + b);
        }
    }

    // 区間検索
    let i = 0;
    for (i = 0; i < n - 1; i++) {
        if (x <= sorted[i+1].x) 
            break;
    }

    const dx = x - sorted[i].x;
    const h = sorted[i+1].x - sorted[i].x;
    
    const c0 = sorted[i].y;
    const c1 = s[i];
    const c2 = (3 * (sorted[i+1].y - sorted[i].y) / h - 2 * s[i] - s[i+1]) / h;
    const c3 = (s[i] + s[i+1] - 2 * (sorted[i+1].y - sorted[i].y) / h) / (h * h);

    return c0 + c1 * dx + c2 * dx * dx + c3 * dx * dx * dx;
};

/**
 * 三角関数補間
 * @param points データ点
 * @param x 補間したいx値
 * @returns 補間されたy値またはnull
 */
export const trigonometric = (points: Point[], x: number): number | null => {
    if (points.length < 2) 
        return null;
    
    const n = points.length;
    let numer = 0;
    // let denom = 0;
    for (let i = 0; i < n; i++) {
        let t_i = 1.0;
        for (let j = 0; j < n; j++) {
            if (i !== j) {
                 // sin((x - xj)/2)
                 t_i *= Math.sin((x - points[j].x) / 2);
                 t_i /= Math.sin((points[i].x - points[j].x) / 2);
            }
        }
        // ラグランジュの三角関数版を使用
        
        // 通常のラグランジュ基底の変形
        // L_i(x) = product( sin((x-xj)/2) / sin((xi-xj)/2) )
        if (Math.abs(x - points[i].x) < 1e-9) 
            return points[i].y; // 特異点回避

        numer += points[i].y * t_i;
    }
    
    return numer;
};


/**
 * スプライン補間の係数計算
 * @param points データ点
 * @returns スプライン係数の配列
 */
const computeSplineCoefficients = (points: Point[]): SplineCoefficients[] => {
    const n = points.length;
    const h: number[] = [];
    const alpha: number[] = [];
    const l: number[] = [1];
    const mu: number[] = [0];
    const z: number[] = [0];
    const c: number[] = new Array(n).fill(0);
    const b: number[] = [];
    const d: number[] = [];
    const a: number[] = points.map(p => p.y);
    
    for (let i = 0 ; i < n - 1 ; i++) {
        h[i] = points[i + 1].x - points[i].x;
        if (h[i] === 0) 
            h[i] = 1e-10;
    }
    
    for (let i = 1 ; i < n - 1 ; i++) {
        alpha[i] = (3 / h[i]) * (a[i + 1] - a[i]) - (3 / h[i - 1]) * (a[i] - a[i - 1]);
    }
    
    for (let i = 1 ; i < n - 1 ; i++) {
        l[i] = 2 * (points[i + 1].x - points[i - 1].x) - h[i - 1] * mu[i - 1];
        if (l[i] === 0) 
            l[i] = 1e-10;
        
        mu[i] = h[i] / l[i];
        z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
    }
    
    l[n - 1] = 1;
    z[n - 1] = 0;
    
    for (let j = n - 2 ; j >= 0 ; j--) {
        c[j] = z[j] - mu[j] * c[j + 1];
        b[j] = (a[j + 1] - a[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3;
        d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
    }
    
    const coefficients: SplineCoefficients[] = [];
    for (let i = 0 ; i < n - 1 ; i++) {
        coefficients.push({ a: a[i], b: b[i] || 0, c: c[i] || 0, d: d[i] || 0 });
    }
    
    return coefficients;
};

/**
 * スプライン補間
 * @param points データ点
 * @param x 補間したいx値
 * @returns 補間されたy値またはnull
 */
export const spline = (points: Point[], x: number): number | null => {
    if (points.length < 2) 
        return null;
    
    const sorted = [...points].sort((a, b) => a.x - b.x);
    if (sorted.length === 2) 
        return linear(points, x);
    
    if (x < sorted[0].x || x > sorted[sorted.length - 1].x) 
        return null;
    
    const coefficients = computeSplineCoefficients(sorted);
    let i = 0;
    for (i = 0 ; i < sorted.length - 1 ; i++) {
        if (x <= sorted[i + 1].x) 
            break;
    }
    
    if (i >= coefficients.length) 
        i = coefficients.length - 1;
    
    const dx = x - sorted[i].x;
    const { a, b, c, d } = coefficients[i];
    return a + b * dx + c * dx * dx + d * dx * dx * dx;
};

/**
 * 補間曲線を取得する
 * @param method 補間方法
 * @param points データ点
 * @param xMin xの最小値
 * @param xMax xの最大値
 * @param steps 分割数
 * @returns 補間曲線の点の配列
 */
export const getCurve = (
    method: 'linear' | 'lagrange' | 'newton' | 'spline' | 'nearest' | 'catmullRom' | 'akima' | 'trigonometric',
    points: Point[],
    xMin: number, 
    xMax: number, 
    steps: number = 200
): Point[] => {
    if (points.length < 1) 
        return [];
    
    // 最近傍法以外は2点以上必要
    if (method !== 'nearest' && points.length < 2) 
        return [];

    const curve: Point[] = [];
    if (steps <= 0) 
        steps = 200;
    
    const dx = (xMax - xMin) / steps;
    for (let i = 0 ; i <= steps ; i++) {
        const x = xMin + i * dx;
        let y: number | null = null;
        
        try {
            switch (method) {
                case 'linear': y = linear(points, x); break;
                case 'lagrange': y = lagrange(points, x); break;
                case 'newton': y = newton(points, x); break;
                case 'spline': y = spline(points, x); break;
                case 'nearest': y = nearest(points, x); break;
                case 'catmullRom': y = catmullRom(points, x); break;
                case 'akima': y = akima(points, x); break;
                case 'trigonometric': y = trigonometric(points, x); break;
            }
        } catch (e) {
            y = null;
        }
        
        if (y !== null && isFinite(y)) {
            curve.push({ x, y });
        } 
    }
    
    return curve;
};
