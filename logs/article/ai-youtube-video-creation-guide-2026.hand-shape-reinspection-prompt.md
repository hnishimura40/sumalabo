# ai-youtube-video-creation-guide-2026 手の形状・接続 差分再検品

生成を担当していない独立検品者として、添付された9枚を順番どおり thumbnail, slide01, slide02, slide03, slide04, slide05, slide06, slide07_after, slide08_after として検品してください。今回は本数検品済みなので、手の「形・接続・比率」を重点確認します。ただし明らかな本数異常も見つけたら記録してください。

各画像で、見える手を1つずつ個別に確認してください。

1. 左手／右手として自然な向きか。親指が手の向きと体側に対して自然な側か。
2. 手首と前腕が自然につながり、ねじれ・継ぎ足し・別の手の接続・物体との融合がないか。
3. 指の長さ・太さ、特に親指の比率が自然か。
4. ひまりとらぼまるのキャラクターアンカー、画像内日本語、構図に別のblocking問題がないか。

判定基準:

- 明確な左右不整合・親指位置の矛盾・接続異常・余分な手は needs_revision。
- 指の比率だけの違和感は warning。主観差があるためneeds_revisionへ上げない。
- 問題がない画像は ok。
- 手が見えない画像は handChecks を空配列にする。

最後の行にJSONだけを出してください。形式:

{"overallPass":true,"images":[{"id":"thumbnail","verdict":"ok|warning|needs_revision","handChecks":[{"character":"himari|labomaru","side":"left|right|unclear","orientationNatural":true,"thumbPositionNatural":true,"wristConnectionNatural":true,"proportionsNatural":true,"severity":"ok|warning|needs_revision","note":"根拠"}],"issues":[]}],"summary":"短い総括"}
