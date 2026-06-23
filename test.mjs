import assert from 'node:assert';
import { toMs, parseSubs, buildCards } from './subs.js';

// time parsing
assert.equal(toMs('00:00:01,500'), 1500);
assert.equal(toMs('01:02:03.250'), 3723250);
assert.equal(toMs('00:05.000'), 5000);

const srt = `1
00:00:01,000 --> 00:00:04,000
Hola mundo

2
00:00:05,000 --> 00:00:07,000
¿Cómo estás?`;

const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.500
Hello world

00:00:06.000 --> 00:00:07.000
How are you?`;

const a = parseSubs(srt);
const b = parseSubs(vtt);
assert.equal(a.length, 2);
assert.equal(a[0].text, 'Hola mundo');
assert.equal(b[0].text, 'Hello world');

// ASS: time as h:mm:ss.cc, override tags + \N stripped, text column may contain commas
const ass = `[Script Info]
Title: x

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,{\\i1}Hola,\\Nmundo
Dialogue: 0,0:00:05.00,0:00:07.00,Default,,0,0,0,,Adios`;

const c = parseSubs(ass);
assert.equal(c.length, 2);
assert.equal(c[0].start, 1000);
assert.equal(c[0].end, 4000);
assert.equal(c[0].text, 'Hola,\nmundo');   // tag gone, comma kept, \N -> newline

const cards = buildCards(a, b);
assert.equal(cards.length, 2);
assert.equal(cards[0].front, 'Hola mundo');
assert.equal(cards[0].back, 'Hello world');   // 1.0-4.0 overlaps 1.0-4.5
assert.equal(cards[1].back, 'How are you?');   // 5.0-7.0 overlaps 6.0-7.0

console.log('ok');
