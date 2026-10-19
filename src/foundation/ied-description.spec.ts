import { expect } from '@open-wc/testing';

import { getIedDescription, getIedHeadline } from './ied-description.js';

function ied(attributes: Record<string, string>): Element {
  const element = document.createElementNS(
    'http://www.iec.ch/61850/2003/SCL',
    'IED',
  );
  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });
  return element;
}

describe('IED descriptions', () => {
  it('joins the manufacturer and type on the first line', () => {
    expect(
      getIedDescription(
        ied({ name: 'IED1', manufacturer: 'ABB', type: 'REL670' }),
      ).firstLine,
    ).to.equal('ABB - REL670');
  });

  it('uses whichever of manufacturer and type is present', () => {
    expect(getIedDescription(ied({ name: 'IED1', manufacturer: 'ABB' })))
      .to.have.property('firstLine', 'ABB');
    expect(getIedDescription(ied({ name: 'IED1', type: 'REL670' })))
      .to.have.property('firstLine', 'REL670');
    expect(getIedDescription(ied({ name: 'IED1' })))
      .to.have.property('firstLine', '');
  });

  it('joins the description, config version and SCL edition', () => {
    expect(
      getIedDescription(
        ied({
          name: 'IED1',
          desc: 'Publisher',
          configVersion: '1.0',
          originalSclVersion: '2007',
          originalSclRevision: 'B',
          originalSclRelease: '4',
        }),
      ).secondLine,
    ).to.equal('Publisher - 1.0 - 2007B4');
  });

  it('omits missing second-line parts', () => {
    expect(getIedDescription(ied({ name: 'IED1', desc: 'Publisher' })))
      .to.have.property('secondLine', 'Publisher');
    expect(getIedDescription(ied({ name: 'IED1' })))
      .to.have.property('secondLine', '');
  });

  it('does not leave a dangling separator in the headline', () => {
    expect(getIedHeadline(ied({ name: 'IED1' }))).to.equal('IED1');
    expect(getIedHeadline(ied({ name: 'IED1', manufacturer: 'ABB' }))).to.equal(
      'IED1 — ABB',
    );
  });
});
