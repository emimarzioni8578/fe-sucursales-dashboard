import { classifyCoord, hasCoordText } from './coords';

describe('classifyCoord', () => {
  it('flags a branch with no coordinates as sinCoord', () => {
    const c = classifyCoord('', '');
    expect(c).toMatchObject({ lat: null, lng: null, hasCoord: false, sinCoord: true, coordValida: false, coordInvalida: false });
  });

  it('accepts a coordinate inside Argentina as valid', () => {
    const c = classifyCoord('-34.6', '-58.4');
    expect(c.hasCoord).toBe(true);
    expect(c.coordValida).toBe(true);
    expect(c.coordInvalida).toBe(false);
    expect(c.lat).toBe(-34.6);
  });

  it('flags a numeric coordinate outside the bounding box as invalid', () => {
    const c = classifyCoord('10', '10');
    expect(c.hasCoord).toBe(true);
    expect(c.coordValida).toBe(false);
    expect(c.coordInvalida).toBe(true);
  });

  it('treats non-numeric text as no coordinate', () => {
    const c = classifyCoord('n/a', 'n/a');
    expect(c.hasCoord).toBe(false);
    expect(c.sinCoord).toBe(true);
  });

  it('is invalid when only one axis falls outside the bounding box', () => {
    expect(classifyCoord('-34.6', '10').coordInvalida).toBe(true);  // lng fuera
    expect(classifyCoord('10', '-58.4').coordInvalida).toBe(true);  // lat fuera
  });

  it('a single missing axis means no usable coordinate', () => {
    const c = classifyCoord('-34.6', '');
    expect(c.sinCoord).toBe(true);
    expect(c.lat).toBeNull();
  });
});

describe('hasCoordText', () => {
  it('is true only when both fields carry non-blank text', () => {
    expect(hasCoordText({ Latitud: '-34', Longitud: '-58' })).toBe(true);
    expect(hasCoordText({ Latitud: '', Longitud: '-58' })).toBe(false);
    expect(hasCoordText({ Latitud: '  ', Longitud: '-58' })).toBe(false);
    expect(hasCoordText({})).toBe(false);
  });
});
