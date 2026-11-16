// The backend's own numbers (constants/sar.py): every question is the 10.24 km contract square
// around a centre (the UI says "10 × 10 km"). The vertex limits only read old ?geo= links.
export const AOI_SIDE_KM = 10.24;
// Live InSAR measures only this window at the centre of the square (constants/insar.py).
export const INSAR_WINDOW_KM = 5;
export const MIN_VERTICES = 3;
export const MAX_VERTICES = 100;
