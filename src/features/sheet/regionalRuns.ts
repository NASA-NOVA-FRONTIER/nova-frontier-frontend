import { useCallback, useEffect, useSyncExternalStore } from "react";

import { getExploration } from "@/features/explore/exploreApi";
import {
  explorationSchema,
  isFinal,
  type ExplorationView,
} from "@/features/explore/exploreSchemas";
import { apiRequest, ApiError } from "@/lib/api/apiClient";

export type RegionalRun = { view?: ExplorationView; error?: string; starting?: boolean };

type Api = {
  launch: (explorationId: string) => Promise<ExplorationView>;
  poll: (jobId: string, signal: AbortSignal) => Promise<ExplorationView>;
};

type Entry = {
  run: RegionalRun;
  launched: boolean;
  listeners: Set<() => void>;
  poll?: AbortController;
};

const EMPTY: RegionalRun = {};
export const POLL_MS = 3500;

const launchMessage = (error: unknown): string =>
  error instanceof ApiError && error.status === 404
    ? "Regional analysis is unavailable on this server."
    : error instanceof ApiError && [429, 503].includes(error.status)
      ? "Analysis capacity is limited. Try again shortly."
      : "Could not start regional analysis.";

// One regional run per exploration id, kept above the sheet: closing it or switching views re-attaches
// to the same job. Only the first open and an explicit Retry ever POST; polling runs only while
// someone is looking.
export const createRegionalRuns = (api: Api) => {
  const entries = new Map<string, Entry>();

  const entryOf = (id: string): Entry => {
    const found = entries.get(id);
    if (found) return found;
    const entry: Entry = { run: EMPTY, launched: false, listeners: new Set() };
    entries.set(id, entry);
    return entry;
  };

  const set = (entry: Entry, run: RegionalRun) => {
    entry.run = run;
    entry.listeners.forEach((listener) => listener());
    startPolling(entry);
  };

  const stopPolling = (entry: Entry) => {
    entry.poll?.abort();
    delete entry.poll;
  };

  const startPolling = (entry: Entry) => {
    const { view, error } = entry.run;
    if (entry.poll || entry.listeners.size === 0 || error !== undefined) return;
    if (view === undefined || isFinal(view.status)) return;
    const poll = new AbortController();
    entry.poll = poll;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    poll.signal.addEventListener("abort", () => clearTimeout(timer));
    const tick = async () => {
      try {
        const next = await api.poll(view.id, poll.signal);
        if (poll.signal.aborted) return;
        // Each answer starts a fresh poll, which resets the failure count.
        delete entry.poll;
        set(entry, { view: next });
        return;
      } catch {
        if (poll.signal.aborted) return;
        if (++failures >= 3) {
          delete entry.poll;
          set(entry, { ...entry.run, error: "Could not check job status." });
          return;
        }
      }
      timer = setTimeout(() => void tick(), POLL_MS);
    };
    timer = setTimeout(() => void tick(), POLL_MS);
  };

  // The POST is never aborted: closing the sheet mid-launch must still keep the job id it returns.
  const launch = async (id: string, entry: Entry) => {
    entry.launched = true;
    set(entry, { starting: true });
    try {
      set(entry, { view: await api.launch(id) });
    } catch (error) {
      set(entry, { error: launchMessage(error) });
    }
  };

  return {
    get: (id: string): RegionalRun => entries.get(id)?.run ?? EMPTY,
    subscribe: (id: string, listener: () => void) => {
      const entry = entryOf(id);
      entry.listeners.add(listener);
      startPolling(entry);
      return () => {
        entry.listeners.delete(listener);
        if (entry.listeners.size === 0) stopPolling(entry);
      };
    },
    ensure: (id: string) => {
      const entry = entryOf(id);
      if (!entry.launched) void launch(id, entry);
    },
    retry: (id: string) => {
      const entry = entryOf(id);
      const { view, error, starting } = entry.run;
      if (starting) return;
      // A job that is still running only lost its status checks: follow it again, don't relaunch.
      if (error !== undefined && view !== undefined && !isFinal(view.status)) {
        set(entry, { view });
        return;
      }
      void launch(id, entry);
    },
  };
};

const regionalRuns = createRegionalRuns({
  launch: (id) =>
    apiRequest(`/explorations/${encodeURIComponent(id)}/analysis`, explorationSchema, {
      method: "POST",
    }),
  poll: getExploration,
});

export const retryRegionalRun = (id: string) => regionalRuns.retry(id);

// Opening the Regional analysis view launches the run once per exploration and follows it while shown.
export const useRegionalRun = (id: string): RegionalRun => {
  const subscribe = useCallback(
    (listener: () => void) => regionalRuns.subscribe(id, listener),
    [id],
  );
  const run = useSyncExternalStore(subscribe, () => regionalRuns.get(id));
  useEffect(() => regionalRuns.ensure(id), [id]);
  return run;
};

// Regional analysis needs a finished GCOV answer on one radar series; InSAR and failed runs have none.
export const canRunRegional = (view: ExplorationView | undefined): boolean =>
  view !== undefined &&
  view.result?.insar == null &&
  Boolean(view.plan?.seriesKey) &&
  (view.status === "succeeded" || view.status === "partial");
