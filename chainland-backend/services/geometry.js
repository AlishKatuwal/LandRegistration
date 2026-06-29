/**
 * GIS Geometry Service — Pure JavaScript implementation
 * Implements: Polygon overlap detection, RDP simplification, proximity queries
 * No PostGIS dependency required.
 */

// ═══════════════════════════════════════════════
// Ramer-Douglas-Peucker (RDP) Polygon Simplification
// ═══════════════════════════════════════════════
function perpendicularDistance(point, lineStart, lineEnd) {
  const [px, py] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }

  const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  const nearX = x1 + t * dx;
  const nearY = y1 + t * dy;

  return Math.sqrt((px - nearX) ** 2 + (py - nearY) ** 2);
}

export function rdpSimplify(points, epsilon = 0.0001) {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = rdpSimplify(points.slice(0, maxIdx + 1), epsilon);
    const right = rdpSimplify(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0], points[points.length - 1]];
}

// ═══════════════════════════════════════════════
// Polygon Overlap Detection (Separating Axis Theorem)
// ═══════════════════════════════════════════════

// Check if a point is inside a polygon (ray casting)
function pointInPolygon(point, polygon) {
  const [px, py] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

// Check if two line segments intersect
function segmentsIntersect(a1, a2, b1, b2) {
  const [x1, y1] = a1; const [x2, y2] = a2;
  const [x3, y3] = b1; const [x4, y4] = b2;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return false;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

// Main: Check if two polygons overlap
export function polygonsOverlap(polyA, polyB) {
  if (!polyA || !polyB || polyA.length < 3 || polyB.length < 3) return false;

  // Normalize: ensure coordinates are [lat, lng] arrays
  const a = polyA.map(p => (Array.isArray(p) ? p : [p.lat, p.lng]));
  const b = polyB.map(p => (Array.isArray(p) ? p : [p.lat, p.lng]));

  // Check 1: Any vertex of A inside B or vice versa
  for (const pt of a) {
    if (pointInPolygon(pt, b)) return true;
  }
  for (const pt of b) {
    if (pointInPolygon(pt, a)) return true;
  }

  // Check 2: Any edge of A crosses any edge of B
  for (let i = 0; i < a.length; i++) {
    const a1 = a[i];
    const a2 = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j++) {
      const b1 = b[j];
      const b2 = b[(j + 1) % b.length];
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }

  return false;
}

// ═══════════════════════════════════════════════
// Polygon Area Calculation (Shoelace formula)
// ═══════════════════════════════════════════════
export function polygonArea(coords) {
  if (!coords || coords.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    area += coords[i][0] * coords[j][1];
    area -= coords[j][0] * coords[i][1];
  }
  return Math.abs(area / 2);
}

// ═══════════════════════════════════════════════
// Centroid Calculation
// ═══════════════════════════════════════════════
export function polygonCentroid(coords) {
  if (!coords || coords.length === 0) return [0, 0];
  let latSum = 0, lngSum = 0;
  for (const [lat, lng] of coords) {
    latSum += lat;
    lngSum += lng;
  }
  return [latSum / coords.length, lngSum / coords.length];
}

// ═══════════════════════════════════════════════
// Distance between two points (Haversine in km)
// ═══════════════════════════════════════════════
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ═══════════════════════════════════════════════
// Nearby Parcels (brute-force centroid distance)
// ═══════════════════════════════════════════════
export function findNearbyParcels(targetCoords, allParcels, radiusKm = 5) {
  const [tLat, tLng] = polygonCentroid(targetCoords);
  
  return allParcels
    .filter(p => {
      const coords = typeof p.coordinates === 'string' ? JSON.parse(p.coordinates) : p.coordinates;
      if (!coords || coords.length === 0) return false;
      const [pLat, pLng] = polygonCentroid(coords);
      return haversineDistance(tLat, tLng, pLat, pLng) <= radiusKm;
    })
    .map(p => {
      const coords = typeof p.coordinates === 'string' ? JSON.parse(p.coordinates) : p.coordinates;
      const [pLat, pLng] = polygonCentroid(coords);
      return {
        ...p,
        distance: haversineDistance(tLat, tLng, pLat, pLng)
      };
    })
    .sort((a, b) => a.distance - b.distance);
}
