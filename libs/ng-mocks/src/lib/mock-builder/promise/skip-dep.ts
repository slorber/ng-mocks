import { DOCUMENT } from '@angular/common';

import coreConfig from '../../common/core.config';
import coreReflectProvidedIn from '../../common/core.reflect.provided-in';
import { isNgInjectionToken } from '../../common/func.is-ng-injection-token';
import ngMocksUniverse from '../../common/ng-mocks-universe';

const skipSystem = (provide: any): boolean => {
  if (!provide || provide === DOCUMENT || ngMocksUniverse.touches.has(provide)) {
    return true;
  }
  if (typeof provide === 'function' && coreConfig.neverMockProvidedFunction.indexOf(provide.name) !== -1) {
    return true;
  }
  if (isNgInjectionToken(provide) && coreConfig.neverMockToken.indexOf(provide.toString()) !== -1) {
    return true;
  }

  return false;
};

// Checks if we should avoid mocking of the provider.
export default (provide: any): boolean => {
  if (skipSystem(provide)) {
    return true;
  }

  // Empty providedIn or things for a platform have to be skipped.
  const providedIn = coreReflectProvidedIn(provide);
  const skip = !providedIn || providedIn === 'platform';
  if (typeof provide === 'function' && skip) {
    return true;
  }

  return false;
};
