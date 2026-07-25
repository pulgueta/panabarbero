import { useSyncExternalStore } from "react";

import type { DemoAppointmentStatus } from "@/components/landing/demo-data";

/**
 * Live-activity engine for the landing demos. A single module-level store
 * drives the dashboard replica AND the module cards through a deterministic,
 * scripted loop: the cursor moves to a `[data-tour]` target, "clicks" it, and
 * the corresponding state change is applied. The last step resets the state to
 * its initial snapshot, so the loop runs forever with constant memory — every
 * list is capped and every counter returns to its starting value each cycle.
 *
 * The driver starts when the first component subscribes and stops (clearing
 * every timer) when the last one unmounts. Ticks are skipped while the tab is
 * hidden, and the cursor stays still under `prefers-reduced-motion`.
 */

export type DashSection =
  | "citas"
  | "servicios"
  | "inventario"
  | "equipo"
  | "pana";

export interface SimAppointment {
  id: string;
  time: string;
  name: string;
  service: string;
  barber: string;
  price: number;
  status: DemoAppointmentStatus;
  /** Newly booked this cycle — rendered with an enter animation. */
  entered?: boolean;
}

export type SimToastKind =
  | "created"
  | "confirmed"
  | "cash"
  | "stock"
  | "service"
  | "invite";

export interface SimToast {
  id: string;
  kind: SimToastKind;
  title: string;
  detail: string;
}

export interface SimBarber {
  /** Stable identity — never derive a barber from array position or initials. */
  id: string;
  initials: string;
  name: string;
  role: string;
  citas: number;
  occupancy: number;
}

export interface LandingSimState {
  step: number;
  cycle: number;
  section: DashSection;
  agenda: SimAppointment[];
  toasts: SimToast[];
  citasHoy: number;
  caja: number;
  ocupacion: number;
  ceraUnits: number;
  tinteActive: boolean;
  team: SimBarber[];
  panaTopic: number;
  panaTyping: boolean;
  reminder: { text: string; seq: number };
  cursor: { x: number; y: number; moved: boolean; clickSeq: number };
}

export const CERA_MAX_UNITS = 30;
export const CERA_LOW_THRESHOLD = 6;

const INITIAL_AGENDA: SimAppointment[] = [
  {
    id: "david",
    time: "12:00",
    name: "David Quintero",
    service: "Corte fade",
    barber: "Sebastián",
    price: 28000,
    status: "nueva",
  },
  {
    id: "sara",
    time: "11:15",
    name: "Sara Vélez",
    service: "Cejas + perfilado",
    barber: "Camilo",
    price: 15000,
    status: "pendiente",
  },
  {
    id: "julian",
    time: "10:30",
    name: "Julián Mora",
    service: "Corte clásico",
    barber: "Valentina",
    price: 25000,
    status: "confirmada",
  },
  {
    id: "andres",
    time: "9:00",
    name: "Andrés Ríos",
    service: "Corte + barba",
    barber: "Camilo",
    price: 35000,
    status: "confirmada",
  },
];

/** The barber the scripted "Crea una cita para Felipe" step books into. */
const BOOKING_BARBER_ID = "valentina";

const INITIAL_TEAM: SimBarber[] = [
  {
    id: "camilo",
    initials: "CT",
    name: "Camilo Torres",
    role: "Barbero senior",
    citas: 5,
    occupancy: 60,
  },
  {
    id: BOOKING_BARBER_ID,
    initials: "VR",
    name: "Valentina Ruiz",
    role: "Barbera",
    citas: 4,
    occupancy: 52,
  },
  {
    id: "sebastian",
    initials: "SC",
    name: "Sebastián Cruz",
    role: "Barbero",
    citas: 3,
    occupancy: 44,
  },
];

function createInitialState(carry?: LandingSimState): LandingSimState {
  return {
    step: carry?.step ?? 0,
    cycle: carry ? carry.cycle + 1 : 0,
    section: "citas",
    agenda: INITIAL_AGENDA.map((apt) => ({ ...apt })),
    toasts: carry?.toasts ?? [],
    citasHoy: 12,
    caja: 480000,
    ocupacion: 76,
    ceraUnits: CERA_LOW_THRESHOLD,
    tinteActive: false,
    team: INITIAL_TEAM.map((barber) => ({ ...barber })),
    panaTopic: carry?.panaTopic ?? 0,
    panaTyping: false,
    reminder: {
      text: "Hola David, tu cita quedó para hoy a las 12:00. Te esperamos en Barbería El Pana.",
      seq: carry?.reminder.seq ?? 0,
    },
    cursor: carry?.cursor ?? { x: 0, y: 0, moved: false, clickSeq: 0 },
  };
}

export const INITIAL_SIM_STATE = createInitialState();

export const formatCop = (value: number) => `$${value.toLocaleString("es-CO")}`;

export const pendingCount = (state: LandingSimState) =>
  state.agenda.filter((apt) => apt.status !== "confirmada").length;

export interface PanaExchange {
  question: string;
  answer: string;
}

/** Q&A pairs whose answers are computed from the live sim state. */
const firstName = (barber: SimBarber) => barber.name.split(" ")[0];

/** "Camilo va en 60%, Valentina en 52% y Sebastián en 44%" — any team size. */
const occupancyPhrase = (team: SimBarber[]) => {
  const parts = team.map((barber, index) =>
    index === 0
      ? `${firstName(barber)} va en ${barber.occupancy}%`
      : `${firstName(barber)} en ${barber.occupancy}%`,
  );

  if (parts.length < 2) return parts.join("");

  return `${parts.slice(0, -1).join(", ")} y ${parts.at(-1)}`;
};

export const panaExchanges = (state: LandingSimState): PanaExchange[] => [
  {
    question: "¿Cómo va mi día?",
    answer: `Tienes ${state.citasHoy} citas hoy y ${pendingCount(state)} sin confirmar. Camilo está libre a las 4:00 p. m.`,
  },
  {
    question: "¿Cómo va la ocupación del equipo?",
    answer: `${occupancyPhrase(state.team)}. Queda espacio en la tarde.`,
  },
  {
    question: "Crea una cita para Felipe",
    answer:
      "Listo: corte clásico con Valentina, hoy a las 12:45. Le envié la confirmación por SMS.",
  },
];

export const currentPanaExchange = (state: LandingSimState): PanaExchange => {
  const exchanges = panaExchanges(state);
  return exchanges[state.panaTopic % exchanges.length];
};

const pushToast = (
  state: LandingSimState,
  kind: SimToastKind,
  title: string,
  detail: string,
): SimToast[] =>
  [
    { id: `${state.cycle}-${state.step}`, kind, title, detail },
    ...state.toasts,
  ].slice(0, 2);

function confirmNextAppointment(state: LandingSimState): LandingSimState {
  const target = state.agenda.find((apt) => apt.status !== "confirmada");
  if (!target) {
    return state;
  }

  return {
    ...state,
    agenda: state.agenda.map((apt) =>
      apt.id === target.id
        ? { ...apt, status: "confirmada", entered: false }
        : apt,
    ),
    toasts: pushToast(
      state,
      "confirmed",
      "Cita confirmada",
      `${target.name} · respondió por SMS`,
    ),
  };
}

function bookAppointment(state: LandingSimState): LandingSimState {
  const booked: SimAppointment = {
    id: `felipe-${state.cycle}`,
    time: "12:45",
    name: "Felipe Lara",
    service: "Corte clásico",
    barber: "Valentina",
    price: 25000,
    status: "nueva",
    entered: true,
  };

  return {
    ...state,
    agenda: [
      booked,
      ...state.agenda.map((apt) => ({ ...apt, entered: false })),
    ].slice(0, 4),
    citasHoy: state.citasHoy + 1,
    ocupacion: 79,
    team: state.team.map((barber) =>
      barber.id === BOOKING_BARBER_ID
        ? { ...barber, citas: barber.citas + 1, occupancy: 60 }
        : barber,
    ),
    reminder: {
      text: "Hola Felipe, tu cita quedó para hoy a las 12:45. Te esperamos en Barbería El Pana.",
      seq: state.reminder.seq + 1,
    },
    toasts: pushToast(
      state,
      "created",
      "Cita creada",
      "Felipe Lara · hoy 12:45",
    ),
  };
}

interface ScriptStep {
  target: string;
  apply: (state: LandingSimState) => LandingSimState;
}

const SCRIPT: ScriptStep[] = [
  { target: "apt-confirm", apply: confirmNextAppointment },
  { target: "crear-cita", apply: bookAppointment },
  { target: "apt-confirm", apply: confirmNextAppointment },
  {
    target: "nav-inventario",
    apply: (state) => ({
      ...state,
      section: "inventario",
      caja: state.caja + 35000,
      toasts: pushToast(
        state,
        "cash",
        "Cita completada",
        "Andrés Ríos · +$35.000 en caja",
      ),
    }),
  },
  {
    target: "inv-reponer",
    apply: (state) => ({
      ...state,
      ceraUnits: CERA_MAX_UNITS,
      toasts: pushToast(
        state,
        "stock",
        "Orden de compra creada",
        "Cera mate · +24 uds",
      ),
    }),
  },
  {
    target: "nav-servicios",
    apply: (state) => ({ ...state, section: "servicios" }),
  },
  {
    target: "svc-switch",
    apply: (state) => ({
      ...state,
      tinteActive: true,
      toasts: pushToast(
        state,
        "service",
        "Servicio activado",
        "Tinte de barba · $22.000 · 35 min",
      ),
    }),
  },
  {
    target: "nav-equipo",
    apply: (state) => ({ ...state, section: "equipo" }),
  },
  {
    target: "team-invite",
    apply: (state) => ({
      ...state,
      toasts: pushToast(
        state,
        "invite",
        "Invitación enviada",
        "Andrés Peña · andres.p@gmail.com",
      ),
    }),
  },
  { target: "nav-pana", apply: (state) => ({ ...state, section: "pana" }) },
  {
    target: "pana-chip",
    apply: (state) => ({
      ...state,
      panaTopic: (state.panaTopic + 1) % 3,
      panaTyping: true,
    }),
  },
  { target: "nav-citas", apply: (state) => createInitialState(state) },
];

const TICK_MS = 3400;
const CLICK_DELAY_MS = 1150;
const TYPING_MS = 900;

let state = INITIAL_SIM_STATE;
const listeners = new Set<() => void>();
let dashboardEl: HTMLElement | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let actTimeout: ReturnType<typeof setTimeout> | undefined;
let typingTimeout: ReturnType<typeof setTimeout> | undefined;

function setState(next: LandingSimState) {
  state = next;
  for (const listener of listeners) {
    listener();
  }
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function moveCursorToTarget(target: string) {
  if (!dashboardEl || prefersReducedMotion()) {
    return;
  }
  const el = dashboardEl.querySelector(`[data-tour="${target}"]`);
  if (!el) {
    return;
  }
  const dashRect = dashboardEl.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return;
  }
  setState({
    ...state,
    cursor: {
      ...state.cursor,
      x: rect.left - dashRect.left + rect.width / 2,
      y: rect.top - dashRect.top + rect.height / 2,
      moved: true,
    },
  });
}

function tick() {
  if (document.hidden) {
    return;
  }
  const scriptStep = SCRIPT[state.step % SCRIPT.length];
  moveCursorToTarget(scriptStep.target);

  clearTimeout(actTimeout);
  actTimeout = setTimeout(() => {
    const next = scriptStep.apply({
      ...state,
      step: state.step + 1,
      cursor: { ...state.cursor, clickSeq: state.cursor.clickSeq + 1 },
    });
    setState(next);

    if (next.panaTyping) {
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        setState({ ...state, panaTyping: false });
      }, TYPING_MS);
    }
  }, CLICK_DELAY_MS);
}

function start() {
  if (intervalId !== null) {
    return;
  }
  intervalId = setInterval(tick, TICK_MS);
}

function stop() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  clearTimeout(actTimeout);
  clearTimeout(typingTimeout);
  state = INITIAL_SIM_STATE;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    start();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stop();
    }
  };
}

const getSnapshot = () => state;
const getServerSnapshot = () => INITIAL_SIM_STATE;

/** Subscribe a component to the shared landing simulation. */
export function useLandingSim(): LandingSimState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Register the dashboard root so the driver can measure `[data-tour]` targets
 * for the animated cursor. Returns a cleanup function.
 */
export function registerLandingSimDashboard(el: HTMLElement) {
  dashboardEl = el;
  return () => {
    if (dashboardEl === el) {
      dashboardEl = null;
    }
  };
}
