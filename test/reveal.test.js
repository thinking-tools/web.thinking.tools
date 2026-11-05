import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

// inference.html hides every [data-reveal] block until its scroll reveal shows it. These pin what makes that safe:
// a block that comes into view is shown, blocks arriving together cascade in reading order within one short span,
// and keyboard focus never lands in a block that is still hidden.
const open = () => {
  const observers = [];
  const { window } = new JSDOM(readFileSync(new URL('../inference.html', import.meta.url), 'utf8'), {
    runScripts: 'dangerously',
    beforeParse(w) {
      w.matchMedia = query => ({ matches: query.includes('scripting') }); // motion allowed, reveal CSS can run
      w.IntersectionObserver = class {
        observed = [];
        constructor(callback, options) {
          observers.push(this);
          this.callback = callback;
          this.margin = options.rootMargin;
        }
        observe(el) {
          this.observed.push(el);
        }
        unobserve(el) {
          this.observed = this.observed.filter(o => o !== el);
        }
        disconnect() {}
      };
    },
  });
  const observer = observers.find(o => o.margin === '0px 0px -10% 0px');
  const blocks = [...window.document.querySelectorAll('[data-reveal]')];
  const arrive = (els, inView = () => true) =>
    observer.callback(els.map(target => ({ target, isIntersecting: inView(target) })));
  return { window, observers, observer, blocks, arrive };
};
const step = el => Number(el.style.getPropertyValue('--i'));
const shown = el => el.classList.contains('in');

test('every block is watched; one that arrives is shown and no longer watched', () => {
  const { observer, blocks, arrive } = open();
  assert.ok(blocks.length > 0 && observer.observed.every((el, i) => el === blocks[i]));
  arrive([blocks[0]]);
  assert.ok(shown(blocks[0]));
  assert.ok(!observer.observed.includes(blocks[0]));
});

test('blocks arriving together cascade in reading order, skipping ones not yet in view', () => {
  const { blocks, arrive } = open();
  const [a, b, c, d] = blocks;
  arrive([a, b, c, d], el => el !== b);
  assert.deepEqual([a, c, d].map(step), [0, 1, 2]);
  assert.ok(!shown(b));
});

test('a big batch (tall or zoomed-out screen) keeps its order but shares the usual span', () => {
  const { blocks, arrive } = open();
  arrive(blocks);
  const steps = blocks.map(step);
  assert.ok(steps.every((s, i) => i === 0 || s > steps[i - 1]));
  assert.ok(steps.at(-1) < 10, `last block waits ${steps.at(-1)} steps`);
});

test('focus moving into a still-hidden block shows it', () => {
  const { window, blocks } = open();
  const link = window.document.querySelector('#pricing article a');
  link.focus();
  assert.ok(shown(link.closest('[data-reveal]')));
  assert.ok(!shown(blocks[0]));
});

// The trace chart is the hero's last beat: it must not start before its card has risen in or while the headline's
// underline is still drawing, and never wait on a stroke that is not running (its statuses stay hidden until it plays).
const playTrace = async stroke => {
  const { window, observers } = open();
  const fig = window.document.getElementById('trace');
  window.document.querySelector('h1 .ul').getAnimations = () => (stroke ? [stroke] : []);
  const trace = observers.find(o => o.margin === '0px 0px -35% 0px');
  const tick = () => new Promise(resolve => setTimeout(resolve));
  trace.callback([{ target: fig, isIntersecting: true }], trace);
  await tick();
  const beforeRise = fig.classList.contains('play');
  fig.dispatchEvent(new window.Event('animationend', { bubbles: true }));
  await tick();
  return { fig, beforeRise, tick };
};

test('the trace plays after its card has risen and the headline underline has finished drawing', async () => {
  let finish;
  const stroke = { animationName: 'ul-draw', finished: new Promise(resolve => (finish = resolve)) };
  const { fig, beforeRise, tick } = await playTrace(stroke);
  assert.ok(!beforeRise);
  assert.ok(!fig.classList.contains('play'), 'still drawing');
  finish();
  await tick();
  assert.ok(fig.classList.contains('play'));
});

test('the trace plays as soon as its card has risen when no underline is drawing', async () => {
  const { fig, beforeRise } = await playTrace(null);
  assert.ok(!beforeRise);
  assert.ok(fig.classList.contains('play'));
});
