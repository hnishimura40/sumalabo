export function validateComparisonRenewal(body){
  const issues=[];const fail=(code,message)=>issues.push({code,severity:'major',message});
  const headings=['30秒で分かる結論','今月の1台（迷ったらこれ）','残り2枠','段×価格のマップ','残りの候補の達成表','全候補のテーマ別比較','選び方の脚注'];
  const positions=headings.map(h=>body.indexOf('>'+h+'</h2>'));
  if(positions.some((p,i)=>p<0||i>0&&p<positions[i-1])||/早見表|pc-overview/.test(body))fail('reading-order','比較記事の表示順が違うか早見表が残っています。');
  if((body.match(/data-pick-slot=/g)||[]).length!==3||/undefined|\{topSegment\}/.test(body))fail('editorial-picks','3枠の判定結果または文言に欠落があります。');
  if((body.match(/<ComparisonPriceButtons\b/g)||[]).length<6)fail('price-buttons','3枠のカード・深掘りに価格ボタンが必要です。');
  if(!body.includes('日本メーカー＝日本製ではない'))fail('origin-escalation','製造国とメーカー拠点を区別する注記が必要です。');
  if(!body.includes('r-tablewrap')||!body.includes('r-chips'))fail('mobile-overflow','スクロール箱またはスマホ用マップがありません。');
  if(!body.includes('国内')||!body.includes('未確認')&&!body.includes('製造国'))fail('origin-escalation','国内窓口・製造国の比較が必要です。');
  return {issues,ok:issues.length===0};
}
