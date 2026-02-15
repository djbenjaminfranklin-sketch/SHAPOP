// SVG viewport positions for Israeli cities on a 300x500 viewport
// Positions are approximate and spaced for readability (especially Gush Dan)

export const ISRAEL_CITIES = [
  'Tel Aviv', 'Jerusalem', 'Haifa', 'Netanya', 'Eilat',
  'Beer Sheva', 'Ashdod', 'Rishon LeZion', 'Petah Tikva', 'Herzliya'
] as const

export type CityName = typeof ISRAEL_CITIES[number]

export interface CityCoord {
  name: CityName
  x: number
  y: number
}

// Positions tuned to avoid overlap in Gush Dan cluster
export const CITY_COORDS: CityCoord[] = [
  { name: 'Tel Aviv',       x: 108, y: 248 },
  { name: 'Jerusalem',      x: 168, y: 270 },
  { name: 'Haifa',          x: 128, y: 140 },
  { name: 'Netanya',        x: 112, y: 190 },
  { name: 'Eilat',          x: 138, y: 468 },
  { name: 'Beer Sheva',     x: 142, y: 360 },
  { name: 'Ashdod',         x: 102, y: 296 },
  { name: 'Rishon LeZion',  x: 118, y: 268 },
  { name: 'Petah Tikva',    x: 140, y: 236 },
  { name: 'Herzliya',       x: 100, y: 225 },
]
