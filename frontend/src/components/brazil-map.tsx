"use client";
import { MapContainer, GeoJSON, ZoomControl, useMap } from "react-leaflet";
import {
  geoJSON as toLayer,
  type Layer,
  type Path,
  type LeafletMouseEvent,
} from "leaflet";
import type { GeoJsonObject, Feature } from "geojson";
import { useEffect, useState } from "react";
import { ErrorState, Loading } from "./shared";
import "leaflet/dist/leaflet.css";
import type { Results, State, City } from "@/lib/api";
function Fit({ geo }: { geo: GeoJsonObject }) {
  const map = useMap();
  useEffect(() => {
    const bounds=toLayer(geo).getBounds();
    const fit=()=>{map.invalidateSize();map.fitBounds(bounds,{padding:[18,18]});};
    fit();
    const observer=new ResizeObserver(fit);observer.observe(map.getContainer());
    return()=>observer.disconnect();
  }, [map, geo]);
  return null;
}
export default function BrazilMap({
  selected,
  onSelect,
  data,
  states = [],
  compact = false,
  coverage = false,
  municipalState,
  cities = [],
}: {
  selected?: number;
  onSelect?: (id: number) => void;
  data?: Results["geography"];
  states?: State[];
  compact?: boolean;
  coverage?: boolean;
  municipalState?: number;
  cities?: City[];
}) {
  const [geo, setGeo] = useState<GeoJsonObject | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setGeo(null);
    setError("");
    fetch(
      municipalState ? `/api/geography/${municipalState}` : "/brazil.geojson",
    )
      .then(async (r) => {
        if (!r.ok) throw Error((await r.json()).message ?? "Mapa indisponível");
        return r.json();
      })
      .then((d) => {
        if (active) setGeo(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [municipalState, retry]);
  if (error)
    return <ErrorState message={error} retry={() => setRetry((v) => v + 1)} />;
  if (!geo) return <Loading />;
  const max = Math.max(1, ...(data ?? []).map((x) => x.count ?? 0));
  function id(f: Feature) {
    return Number(f.properties?.codarea ?? f.properties?.CD_UF);
  }
  return (
    <div className={compact ? "brazil-map compact" : "brazil-map"}>
      <MapContainer
        center={[-15, -52]}
        zoom={3}
        minZoom={2}
        maxZoom={12}
        zoomControl={false}
        scrollWheelZoom={false}
        attributionControl={true}
      >
        <Fit geo={geo} />
        <ZoomControl position="bottomright" />
        <GeoJSON
          key={JSON.stringify(data) + selected + municipalState + coverage}
          data={geo}
          style={(f) => {
            const n = id(f!);
            const count = data?.find((s) => s.stateId === n)?.count;
            return {
              color: compact ? "#e4f0e7" : "#ffffff",
              weight: selected === n ? 2.5 : 0.8,
              fillColor:
                selected === n ? "#e5b954" : count ? "#168964" : "#b4d7c5",
              fillOpacity: count?.valueOf()
                ? coverage
                  ? 0.9
                  : 0.45 + (0.55 * count) / max
                : 0.8,
            };
          }}
          onEachFeature={(feature, layer: Layer) => {
            const n = id(feature);
            const name = municipalState
              ? cities.find((c) => c.id === n)?.name
              : states.find((s) => s.id === n)?.name;
            const count = data?.find((s) => s.stateId === n)?.count;
            layer.bindTooltip(
              `${name ?? "IBGE " + n} · ${count == null ? "Sem amostra publicável" : count + " respostas"}`,
            );
            layer.on({
              click: () => onSelect?.(n),
              mouseover: (e: LeafletMouseEvent) =>
                (e.target as Path).setStyle({ weight: 2, fillOpacity: 1 }),
              mouseout: (e: LeafletMouseEvent) =>
                (e.target as Path).setStyle({
                  weight: selected === n ? 2.5 : 0.8,
                  fillOpacity: 0.8,
                }),
              add: () => {
                const el = (layer as Path).getElement();
                el?.setAttribute("tabindex", "0");
                el?.setAttribute("role", "button");
                el?.setAttribute(
                  "aria-label",
                  (name ?? String(n)) + " — explorar resultados",
                );
                el?.addEventListener("keydown", (e) => {
                  if (
                    (e as KeyboardEvent).key === "Enter" ||
                    (e as KeyboardEvent).key === " "
                  ) {
                    e.preventDefault();
                    onSelect?.(n);
                  }
                });
              },
            });
          }}
        />
      </MapContainer>
      <span className="map-source">
        Malha territorial: IBGE · Clique para explorar
      </span>
    </div>
  );
}
