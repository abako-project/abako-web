import { describe, it, expect } from 'vitest';
import {
  isClient,
  isDeveloper,
  isClientSelf,
  isDeveloperSelf,
  isProjectClient,
  isProjectConsultant,
  isMilestoneDeveloper,
  checkPermission,
} from './permissions';
import type { User } from '@/types/index';

// ---------------------------------------------------------------------------
// Helpers — build typed user fixtures
// ---------------------------------------------------------------------------

const clientUser: User = { email: 'client@test.com', name: 'Alice', clientId: 'client-1' };
const developerUser: User = { email: 'dev@test.com', name: 'Bob', developerId: 'dev-1' };
const bareUser: User = { email: 'bare@test.com', name: 'Charlie' };

// ---------------------------------------------------------------------------
// isClient
// ---------------------------------------------------------------------------

describe('isClient', () => {
  it('returns true for a user with clientId', () => {
    expect(isClient(clientUser)).toBe(true);
  });

  it('returns false for a user with no clientId', () => {
    expect(isClient(developerUser)).toBe(false);
  });

  it('returns false for a user with neither role', () => {
    expect(isClient(bareUser)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isClient(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isDeveloper
// ---------------------------------------------------------------------------

describe('isDeveloper', () => {
  it('returns true for a user with developerId', () => {
    expect(isDeveloper(developerUser)).toBe(true);
  });

  it('returns false for a user with no developerId', () => {
    expect(isDeveloper(clientUser)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isDeveloper(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isClientSelf
// ---------------------------------------------------------------------------

describe('isClientSelf', () => {
  it('returns true when clientId matches', () => {
    expect(isClientSelf(clientUser, 'client-1')).toBe(true);
  });

  it('returns false when clientId does not match', () => {
    expect(isClientSelf(clientUser, 'client-999')).toBe(false);
  });

  it('returns false for a developer user', () => {
    expect(isClientSelf(developerUser, 'client-1')).toBe(false);
  });

  it('returns false for null user', () => {
    expect(isClientSelf(null, 'client-1')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isDeveloperSelf
// ---------------------------------------------------------------------------

describe('isDeveloperSelf', () => {
  it('returns true when developerId matches', () => {
    expect(isDeveloperSelf(developerUser, 'dev-1')).toBe(true);
  });

  it('returns false when developerId does not match', () => {
    expect(isDeveloperSelf(developerUser, 'dev-999')).toBe(false);
  });

  it('returns false for a client user', () => {
    expect(isDeveloperSelf(clientUser, 'dev-1')).toBe(false);
  });

  it('returns false for null user', () => {
    expect(isDeveloperSelf(null, 'dev-1')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isProjectClient
// ---------------------------------------------------------------------------

describe('isProjectClient', () => {
  it('returns true when user clientId matches project clientId', () => {
    expect(isProjectClient(clientUser, 'client-1')).toBe(true);
  });

  it('returns false when user clientId does not match project clientId', () => {
    expect(isProjectClient(clientUser, 'client-other')).toBe(false);
  });

  it('returns false for a developer user', () => {
    expect(isProjectClient(developerUser, 'client-1')).toBe(false);
  });

  it('returns false for null user', () => {
    expect(isProjectClient(null, 'client-1')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isProjectConsultant
// ---------------------------------------------------------------------------

describe('isProjectConsultant', () => {
  it('returns true when user developerId matches project consultantId', () => {
    expect(isProjectConsultant(developerUser, 'dev-1')).toBe(true);
  });

  it('returns false when user developerId does not match project consultantId', () => {
    expect(isProjectConsultant(developerUser, 'dev-other')).toBe(false);
  });

  it('returns false for a client user', () => {
    expect(isProjectConsultant(clientUser, 'dev-1')).toBe(false);
  });

  it('returns false when consultantId is undefined', () => {
    expect(isProjectConsultant(developerUser, undefined)).toBe(false);
  });

  it('returns false for null user', () => {
    expect(isProjectConsultant(null, 'dev-1')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isMilestoneDeveloper
// ---------------------------------------------------------------------------

describe('isMilestoneDeveloper', () => {
  it('returns true when user developerId matches milestone developerId', () => {
    expect(isMilestoneDeveloper(developerUser, 'dev-1')).toBe(true);
  });

  it('returns false when user developerId does not match milestone developerId', () => {
    expect(isMilestoneDeveloper(developerUser, 'dev-other')).toBe(false);
  });

  it('returns false for a client user', () => {
    expect(isMilestoneDeveloper(clientUser, 'dev-1')).toBe(false);
  });

  it('returns false when milestoneDeveloperId is undefined', () => {
    expect(isMilestoneDeveloper(developerUser, undefined)).toBe(false);
  });

  it('returns false for null user', () => {
    expect(isMilestoneDeveloper(null, 'dev-1')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkPermission — composite checks
// ---------------------------------------------------------------------------

describe('checkPermission', () => {
  it('returns false for null user regardless of options', () => {
    expect(checkPermission(null, { client: true })).toBe(false);
  });

  it('returns true when client flag matches a client user', () => {
    expect(checkPermission(clientUser, { client: true })).toBe(true);
  });

  it('returns false when client flag is true but user is a developer', () => {
    expect(checkPermission(developerUser, { client: true })).toBe(false);
  });

  it('returns true when developer flag matches a developer user', () => {
    expect(checkPermission(developerUser, { developer: true })).toBe(true);
  });

  it('returns true when projectClient matches', () => {
    expect(checkPermission(clientUser, { projectClient: 'client-1' })).toBe(true);
  });

  it('returns false when projectClient does not match', () => {
    expect(checkPermission(clientUser, { projectClient: 'client-999' })).toBe(false);
  });

  it('returns true when projectConsultant matches', () => {
    expect(checkPermission(developerUser, { projectConsultant: 'dev-1' })).toBe(true);
  });

  it('returns true when milestoneDeveloper matches', () => {
    expect(checkPermission(developerUser, { milestoneDeveloper: 'dev-1' })).toBe(true);
  });

  it('returns true when user matches at least one of multiple permission options', () => {
    // client user matches projectClient even though projectConsultant does not match
    expect(
      checkPermission(clientUser, {
        projectClient: 'client-1',
        projectConsultant: 'dev-1',
      })
    ).toBe(true);
  });

  it('returns false when no option matches any permission', () => {
    expect(
      checkPermission(clientUser, {
        developer: true,
        projectConsultant: 'dev-1',
        milestoneDeveloper: 'dev-1',
      })
    ).toBe(false);
  });

  it('returns false for empty options object', () => {
    expect(checkPermission(clientUser, {})).toBe(false);
  });
});
