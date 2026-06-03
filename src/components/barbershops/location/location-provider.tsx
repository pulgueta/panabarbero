import { useNavigate, useSearch } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { colombia } from "@/config/colombia";
import type { GeoCoords, GeoStatus } from "@/hooks/use-geolocation";
import { useGeolocation } from "@/hooks/use-geolocation";
import { type ReverseGeocodeResult, reverseGeocode } from "@/lib/geocode";
import { useLocationStore } from "@/store/barbershop-filters";

interface LocationContextValue {
  state: {
    departamento: string | undefined;
    ciudad: string | undefined;
    coords: GeoCoords | null;
    status: GeoStatus;
    /** Reverse-geocoded match awaiting confirmation, or `null`. */
    pendingMatch: ReverseGeocodeResult | null;
  };
  actions: {
    requestGeolocation: () => void;
    setDepartamento: (departamento: string) => void;
    setCiudad: (ciudad: string) => void;
    /** Moves the pin (map drag / locate) and re-resolves the match. */
    setPin: (coords: GeoCoords) => void;
    confirmPin: () => void;
    reset: () => void;
  };
  meta: {
    hasLocation: boolean;
    departamentos: string[];
    citiesForSelected: string[];
  };
}

const LocationContext = createContext<LocationContextValue | null>(null);

const DEPARTAMENTOS = colombia.map((d) => d.departamento);
const CITIES_BY_DEPARTAMENTO = new Map(
  colombia.map((d) => [d.departamento, d.ciudades]),
);

export function useLocation(): LocationContextValue {
  const context = use(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const search = useSearch({ from: "/barbershops/" });
  const navigate = useNavigate({ from: "/barbershops/" });

  const departamento = useLocationStore((s) => s.state);
  const ciudad = useLocationStore((s) => s.city);
  const setStoreState = useLocationStore((s) => s.setState);
  const setStoreCity = useLocationStore((s) => s.setCity);
  const resetStore = useLocationStore((s) => s.reset);

  const geo = useGeolocation();
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [pendingMatch, setPendingMatch] = useState<ReverseGeocodeResult | null>(
    null,
  );

  // URL → store: keep the store in sync with direct links / back-forward.
  const prevSearch = useRef({ state: search.state, city: search.city });
  useEffect(() => {
    const prev = prevSearch.current;
    if (prev.state !== search.state || prev.city !== search.city) {
      if (search.state && search.state !== departamento) {
        setStoreState(search.state);
      }
      if (search.city && search.city !== ciudad) {
        setStoreCity(search.city);
      }
      prevSearch.current = { state: search.state, city: search.city };
    }
  }, [
    search.state,
    search.city,
    departamento,
    ciudad,
    setStoreState,
    setStoreCity,
  ]);

  // store → URL: backfill the URL when persistence already knows the location.
  useEffect(() => {
    if ((!search.state || !search.city) && departamento && ciudad) {
      navigate({
        to: ".",
        search: (prev) => ({ ...prev, state: departamento, city: ciudad }),
        replace: true,
      });
    }
  }, [search.state, search.city, departamento, ciudad, navigate]);

  const resolvePin = useCallback(async (next: GeoCoords) => {
    setCoords(next);
    const match = await reverseGeocode(next);
    if (match) setPendingMatch(match);
  }, []);

  // Reverse-geocode whenever the browser grants a fresh position.
  useEffect(() => {
    if (geo.status === "granted" && geo.coords) {
      void resolvePin(geo.coords);
    }
  }, [geo.status, geo.coords, resolvePin]);

  const setDepartamento = useCallback(
    (next: string) => {
      setPendingMatch(null);
      setStoreState(next);
      navigate({
        to: ".",
        search: () => ({ state: next, city: undefined }),
        replace: false,
      });
    },
    [navigate, setStoreState],
  );

  const setCiudad = useCallback(
    (next: string) => {
      setPendingMatch(null);
      setStoreCity(next);
      navigate({
        to: ".",
        search: () => ({ state: departamento, city: next }),
        replace: false,
      });
    },
    [navigate, setStoreCity, departamento],
  );

  const confirmPin = useCallback(() => {
    if (!pendingMatch?.ciudad) return;
    setStoreState(pendingMatch.departamento);
    setStoreCity(pendingMatch.ciudad);
    navigate({
      to: ".",
      search: () => ({
        state: pendingMatch.departamento,
        city: pendingMatch.ciudad,
      }),
      replace: false,
    });
    setPendingMatch(null);
  }, [pendingMatch, navigate, setStoreState, setStoreCity]);

  const reset = useCallback(() => {
    resetStore();
    setCoords(null);
    setPendingMatch(null);
    navigate({
      to: ".",
      search: () => ({ state: undefined, city: undefined }),
      replace: false,
    });
  }, [navigate, resetStore]);

  const value = useMemo<LocationContextValue>(
    () => ({
      state: {
        departamento,
        ciudad,
        coords,
        status: geo.status,
        pendingMatch,
      },
      actions: {
        requestGeolocation: geo.request,
        setDepartamento,
        setCiudad,
        setPin: (next) => void resolvePin(next),
        confirmPin,
        reset,
      },
      meta: {
        hasLocation: Boolean(departamento && ciudad),
        departamentos: DEPARTAMENTOS,
        citiesForSelected: departamento
          ? (CITIES_BY_DEPARTAMENTO.get(departamento) ?? [])
          : [],
      },
    }),
    [
      departamento,
      ciudad,
      coords,
      geo.status,
      geo.request,
      pendingMatch,
      setDepartamento,
      setCiudad,
      confirmPin,
      reset,
      resolvePin,
    ],
  );

  return <LocationContext value={value}>{children}</LocationContext>;
}
