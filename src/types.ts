export interface Point {
  x: number;
  y: number;
  z?: number;
}

export type InterpolationMethod = 
  | 'linear' 
  | 'lagrange' 
  | 'newton' 
  | 'spline' 
  | 'nearest' 
  | 'catmullRom' 
  | 'akima' 
  | 'trigonometric';

export interface InterpolationColors {
  linear: string;
  lagrange: string;
  newton: string;
  spline: string;
  nearest: string;
  catmullRom: string;
  akima: string;
  trigonometric: string;
}