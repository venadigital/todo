import { normalizeState } from './storage';
import type { AppStateV1 } from '../types';

const STATE_ENDPOINT = import.meta.env.VITE_STATE_ENDPOINT ?? '/api/state';
const REMOTE_SYNC_ENABLED = import.meta.env.VITE_REMOTE_SYNC !== 'false';

export const isRemoteSyncEnabled = (): boolean => REMOTE_SYNC_ENABLED;

export const loadRemoteState = async (): Promise<AppStateV1 | null> => {
  if (!REMOTE_SYNC_ENABLED) {
    return null;
  }

  const response = await fetch(STATE_ENDPOINT, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`No se pudo cargar estado remoto (${response.status})`);
  }

  const raw = (await response.json()) as unknown;
  return normalizeState(raw);
};

export const saveRemoteState = async (state: AppStateV1): Promise<void> => {
  if (!REMOTE_SYNC_ENABLED) {
    return;
  }

  const response = await fetch(STATE_ENDPOINT, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(state),
  });

  if (!response.ok) {
    throw new Error(`No se pudo guardar estado remoto (${response.status})`);
  }
};
