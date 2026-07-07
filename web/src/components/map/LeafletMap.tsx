"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DESTINATIONS, COUNTRY_COLORS } from "@/lib/coordinates";
import {
  type Locale,
  DEFAULT_LOCALE,
  t,
  langHref,
  destName,
  destDates,
} from "@/lib/i18n";

// Fix Leaflet default icon path issue
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function LeafletMap({
  fullHeight = false,
  lang = DEFAULT_LOCALE,
}: {
  fullHeight?: boolean;
  lang?: Locale;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 18,
    }).addTo(map);

    // Add markers
    const points: L.LatLng[] = [];
    DESTINATIONS.forEach((dest, i) => {
      const latlng = L.latLng(dest.lat, dest.lng);
      points.push(latlng);

      const color = COUNTRY_COLORS[dest.country] || "#C2703E";

      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="
          background: ${color};
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">${i + 1}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker(latlng, { icon }).addTo(map);
      marker.bindPopup(`
        <div style="text-align:center; min-width: 140px;">
          <strong style="font-size: 14px;">${destName(lang, dest.id, dest.name)}</strong><br/>
          <span style="color: #6B6560; font-size: 12px;">${destDates(lang, dest.dates, dest.days)} &middot; ${dest.days.length} ${dest.days.length === 1 ? t(lang, "day") : t(lang, "days")}</span><br/>
          <a href="${langHref(lang, `/destinazione/${dest.id}/`)}" style="color: #C2703E; font-size: 13px; font-weight: 600; text-decoration: none;">${t(lang, "openGuide")} &rarr;</a>
        </div>
      `);
    });

    // Route polyline
    L.polyline(points, {
      color: "#C2703E",
      weight: 3,
      opacity: 0.7,
      dashArray: "8, 6",
    }).addTo(map);

    // Fit bounds
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [lang]);

  return (
    <div
      ref={mapRef}
      className={`w-full ${fullHeight ? "h-full" : "h-[50vh] rounded-xl overflow-hidden"}`}
    />
  );
}
