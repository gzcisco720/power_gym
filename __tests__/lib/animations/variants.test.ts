import { springs, variants } from '@/lib/animations/variants';

describe('springs', () => {
  it('exports default spring with stiffness 300', () => {
    expect(springs.default).toEqual({ type: 'spring', stiffness: 300, damping: 30 });
  });
  it('exports bouncy spring with stiffness 400', () => {
    expect(springs.bouncy).toEqual({ type: 'spring', stiffness: 400, damping: 18 });
  });
  it('exports snappy spring with stiffness 600', () => {
    expect(springs.snappy).toEqual({ type: 'spring', stiffness: 600, damping: 35 });
  });
});

describe('variants', () => {
  it('fadeSlideUp hidden state has opacity 0 and y 12', () => {
    expect(variants.fadeSlideUp.hidden).toMatchObject({ opacity: 0, y: 12 });
  });
  it('staggerContainer visible state has staggerChildren 0.06', () => {
    expect(variants.staggerContainer.visible).toMatchObject({
      transition: { staggerChildren: 0.06 },
    });
  });
  it('scaleIn hidden state has scale 0.85', () => {
    expect(variants.scaleIn.hidden).toMatchObject({ scale: 0.85 });
  });
  it('pageEnter starts at x 100%', () => {
    expect(variants.pageEnter).toMatchObject({ x: '100%' });
  });
  it('pageExit ends at x -25%', () => {
    expect(variants.pageExit).toMatchObject({ x: '-25%' });
  });
});
