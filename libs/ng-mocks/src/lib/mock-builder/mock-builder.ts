import { InjectionToken, NgModule } from '@angular/core';
import { getTestBed, MetadataOverride, TestBed, TestBedStatic, TestModuleMetadata } from '@angular/core/testing';

import coreConfig from '../common/core.config';
import { flatten, mapEntries } from '../common/core.helpers';
import coreReflectModuleResolve from '../common/core.reflect.module-resolve';
import { NG_MOCKS, NG_MOCKS_OVERRIDES } from '../common/core.tokens';
import { AnyType, Type } from '../common/core.types';
import { isNgDef } from '../common/func.is-ng-def';
import ngMocksUniverse from '../common/ng-mocks-universe';
import { ngMocks } from '../mock-helper/mock-helper';

import { MockBuilderPerformance } from './mock-builder.performance';
import { IMockBuilder } from './types';

const extractTokens = (
  providers: any,
): {
  mocks?: Map<any, any>;
  overrides?: Map<AnyType<any>, MetadataOverride<any>>;
} => {
  let mocks: Map<any, any> | undefined;
  let overrides: Map<AnyType<any>, MetadataOverride<any>> | undefined;

  for (const provide of flatten(providers || [])) {
    if (typeof provide !== 'object') {
      continue;
    }
    if (provide.provide === NG_MOCKS) {
      mocks = provide.useValue;
    }
    if (provide.provide === NG_MOCKS_OVERRIDES) {
      overrides = provide.useValue;
    }
  }

  return {
    mocks,
    overrides,
  };
};

const applyOverrides = (testBed: TestBedStatic, overrides: Map<AnyType<any>, MetadataOverride<any>>): void => {
  for (const [def, override] of mapEntries(overrides)) {
    (TestBed as any).ngMocksOverrides.add(def);
    // istanbul ignore else
    if (isNgDef(def, 'c')) {
      testBed.overrideComponent(def, override);
    } else if (isNgDef(def, 'd')) {
      testBed.overrideDirective(def, override);
    }
  }
};

const applyPlatformOverridesNormalization = (
  module: Type<any> | Array<Type<any>>,
  mocks: Map<any, any>,
  resetSet: Set<any>,
  track: Set<any>,
  callback: any,
): module is Type<any> => {
  // istanbul ignore if
  if (Array.isArray(module)) {
    for (const moduleCtor of module) {
      callback(moduleCtor, mocks, resetSet, track);
    }

    return false;
  }
  // istanbul ignore if
  if (track.has(module)) {
    return false;
  }
  track.add(module);

  return true;
};

const applyPlatformOverride = (overrides: any, ctorDef: AnyType<any>, mock: AnyType<any>, prop: string): boolean => {
  const bucketAdd: any[] = overrides.add[prop] || [];
  bucketAdd.push(mock);
  overrides.add[prop] = bucketAdd;

  const bucketRemove: any[] = overrides.remove[prop] || [];
  bucketRemove.push(ctorDef);
  overrides.remove[prop] = bucketRemove;

  return true;
};

const applyPlatformOverridesGetMock = (mocks: Map<any, any>, ctorDef: any): AnyType<any> | undefined => {
  const mock = mocks.get(ctorDef);
  if (mock && mock !== ctorDef && coreConfig.neverMockModule.indexOf(ctorDef) !== -1) {
    return mock;
  }

  return undefined;
};

const applyPlatformOverridesData = (module: AnyType<any>): Array<['imports' | 'exports', any]> => {
  const result: Array<['imports' | 'exports', any]> = [];
  const meta = coreReflectModuleResolve(module);
  for (const prop of ['imports', 'exports'] as const) {
    for (const ctorDef of meta[prop] || []) {
      result.push([prop, ctorDef]);
    }
  }

  return result;
};

const applyPlatformOverrides = (
  module: Type<any> | Array<Type<any>>,
  mocks: Map<any, any>,
  resetSet: Set<any>,
  track: Set<any>,
): void => {
  // istanbul ignore if
  if (!applyPlatformOverridesNormalization(module, mocks, resetSet, track, applyPlatformOverrides)) {
    return;
  }

  let changed = false;
  const overrides: MetadataOverride<NgModule> = { add: {}, remove: {} };

  for (const [prop, ctorDef] of applyPlatformOverridesData(module)) {
    if (!isNgDef(ctorDef, 'm')) {
      continue;
    }

    const mock = applyPlatformOverridesGetMock(mocks, ctorDef);
    if (mock) {
      changed = applyPlatformOverride(overrides, ctorDef, mock, prop);
    } else {
      applyPlatformOverrides(ctorDef, mocks, resetSet, track);
    }
  }

  if (changed) {
    resetSet.add(module);
    TestBed.overrideModule(module, overrides);
  }
};

// Thanks Ivy and its TestBed.override - it does not clean up leftovers.
const applyNgMocksOverrides = (testBed: TestBedStatic & { ngMocksOverrides?: any }): void => {
  if (testBed.ngMocksOverrides) {
    ngMocks.flushTestBed();
    for (const def of testBed.ngMocksOverrides) {
      // istanbul ignore else
      if (isNgDef(def, 'c')) {
        testBed.overrideComponent(def, {});
      } else if (isNgDef(def, 'd')) {
        testBed.overrideDirective(def, {});
      } else if (isNgDef(def, 'm')) {
        testBed.overrideModule(def, {});
      }
    }
    testBed.ngMocksOverrides = undefined;
  }
};

const configureTestingModule = (
  original: TestBedStatic['configureTestingModule'],
): TestBedStatic['configureTestingModule'] => (moduleDef: TestModuleMetadata) => {
  ngMocksUniverse.global.set('bullet:customized', true);
  const { mocks, overrides } = extractTokens(moduleDef.providers);

  if (mocks) {
    ngMocks.flushTestBed();
  }
  const testBedStatic = original.call(TestBed, moduleDef);
  if (!mocks) {
    return testBedStatic;
  }

  // istanbul ignore else
  // Now we can apply overrides.
  if (!(TestBed as any).ngMocksOverrides) {
    (TestBed as any).ngMocksOverrides = new Set();
  }
  // istanbul ignore else
  if (overrides) {
    applyOverrides(testBedStatic, overrides);
  }
  applyPlatformOverrides(getTestBed().ngModule, mocks, (TestBed as any).ngMocksOverrides, new Set());

  return testBedStatic;
};

const resetTestingModule = (
  original: TestBedStatic['resetTestingModule'],
): TestBedStatic['resetTestingModule'] => () => {
  if (ngMocksUniverse.global.has('bullet')) {
    if (ngMocksUniverse.global.has('bullet:customized')) {
      ngMocksUniverse.global.set('bullet:reset', true);
    }

    return TestBed;
  }
  ngMocksUniverse.global.delete('builder:config');
  ngMocksUniverse.global.delete('builder:module');
  ngMocksUniverse.global.delete('bullet:customized');
  ngMocksUniverse.global.delete('bullet:reset');
  applyNgMocksOverrides(TestBed);

  return original.call(TestBed);
};

/**
 * @see https://ng-mocks.sudo.eu/api/MockBuilder
 */
export function MockBuilder(
  keepDeclaration?: string | AnyType<any> | InjectionToken<any> | null | undefined,
  itsModuleToMock?: AnyType<any> | null | undefined,
): IMockBuilder {
  if (!(TestBed as any).ngMocks) {
    TestBed.configureTestingModule = configureTestingModule(TestBed.configureTestingModule);
    TestBed.resetTestingModule = resetTestingModule(TestBed.resetTestingModule);
    (TestBed as any).ngMocks = true;
  }

  const instance = new MockBuilderPerformance();

  if (keepDeclaration) {
    instance.keep(keepDeclaration, {
      export: true,
    });
  }
  if (itsModuleToMock) {
    instance.mock(itsModuleToMock, {
      exportAll: true,
    });
  }

  return instance;
}
