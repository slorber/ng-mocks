/* tslint:disable:max-classes-per-file */

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserModule, By } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MockComponent } from '../mock-component';
import { MockModule } from './mock-module';
import {
  ExampleComponent,
  ModuleWithProvidersModule,
  ParentModule,
  SameImports1Module,
  SameImports2Module
} from './test-fixtures';

@Component({
  selector: 'component-subject',
  template: `
    <example-component></example-component>
    <span example-directive></span>
    {{ test | examplePipe }}
  `
})
class ComponentSubject {
  test = 'test';
}

@Component({
  selector: 'same-imports',
  template: `same imports`
})
class SameImportsComponent {}

describe('MockModule', () => {
  let fixture: ComponentFixture<ComponentSubject>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        ComponentSubject
      ],
      imports: [
        MockModule(ParentModule),
        MockModule(ModuleWithProvidersModule),
      ],
    })
    .compileComponents()
    .then(() => {
      fixture = TestBed.createComponent(ComponentSubject);
      fixture.detectChanges();
    });
  }));

  it('should do stuff', () => {
    const mockedComponent = fixture.debugElement
                                   .query(By.directive(MockComponent(ExampleComponent)))
                                   .componentInstance as ExampleComponent;
    expect(mockedComponent).not.toBeNull();
  });
});

describe('SameImportsModules', () => {
  let fixture: ComponentFixture<SameImportsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        SameImportsComponent
      ],
      imports: [
        MockModule(SameImports1Module),
        MockModule(SameImports2Module),
      ],
    })
    .compileComponents()
    .then(() => {
      fixture = TestBed.createComponent(SameImportsComponent);
      fixture.detectChanges();
    });
  }));

  it('should be imported correctly', () => {
    expect(fixture.componentInstance).toEqual(jasmine.any(SameImportsComponent));
    expect(fixture.nativeElement.innerText).toEqual('same imports');
  });
});

describe('NeverMockModules', () => {
  let fixture: ComponentFixture<SameImportsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        SameImportsComponent
      ],
      imports: [
        MockModule(CommonModule),
        MockModule(BrowserModule),
        MockModule(BrowserAnimationsModule),
      ],
    })
    .compileComponents()
    .then(() => {
      fixture = TestBed.createComponent(SameImportsComponent);
      fixture.detectChanges();
    });
  }));

  it('should not fail when we pass them to MockModule', () => {
    expect(fixture.componentInstance).toEqual(jasmine.any(SameImportsComponent));
    expect(fixture.nativeElement.innerText).toEqual('same imports');
  });
});

// TODO> Doesn't work because ParentModule doesn't export anything.
// TODO> Basically it's feature of ng-mocks to export declarations of mocked modules.
// describe('RealModule', () => {
//   let fixture: ComponentFixture<ComponentSubject>;
//
//   beforeEach(async(() => {
//     TestBed.configureTestingModule({
//       declarations: [
//         ComponentSubject
//       ],
//       imports: [
//         ParentModule,
//       ],
//     })
//     .compileComponents()
//     .then(() => {
//       fixture = TestBed.createComponent(ComponentSubject);
//       fixture.detectChanges();
//     });
//   }));
//
//   it('should do stuff', () => {
//     expect(fixture.nativeElement.innerHTML)
//       .toContain('<example-component><span>My Example</span></example-component>');
//     expect(fixture.nativeElement.innerHTML)
//       .toContain('<span example-directive="">ExampleDirective</span>');
//     expect(fixture.nativeElement.innerHTML)
//       .toContain('Example: test');
//   });
// });
