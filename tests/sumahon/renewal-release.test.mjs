import test from 'node:test';import assert from 'node:assert/strict';
import {assertRenewalRelease} from '../../scripts/automation/renewal-release-gate.mjs';
test('初回はカテゴリ・記事種別ごとにHiroの承認記録を必須にする',()=>{const html='<section data-renewal-kind="comparison:wifi-router">';assert.throws(()=>assertRenewalRelease(html,()=>null));assert.throws(()=>assertRenewalRelease(html,()=>({approvedAt:'2026-11-04',approvedBy:'auto',version:'2026-11-04'})));assert.doesNotThrow(()=>assertRenewalRelease(html,()=>({approvedAt:'2026-11-04',approvedBy:'Hiro',version:'2026-11-04'})));assert.doesNotThrow(()=>assertRenewalRelease('<article>既存記事</article>',()=>null));});

test("AI記事も初回承認が空なら本番公開を止める",()=>{assert.throws(()=>assertRenewalRelease('<article data-renewal-kind="ai">'),/first_publication_requires_hiro_approval:ai/);});
