# Música de fundo dos vídeos

Põe aqui as faixas (`.mp3`, `.m4a`, `.wav`, `.ogg`, `.flac`) **da Meta Sound Collection**
(facebook.com/sound/collection): são livres para usar nos Reels do Facebook e do Instagram.
Nunca músicas comerciais («virais»): a Meta deteta-as e silencia ou bloqueia o vídeo.

- O `scripts/montar.mjs` escolhe uma faixa por vídeo, pelo endereço do artigo: o mesmo artigo
  dá sempre a mesma, e artigos diferentes vão rodando entre todas as que estiverem aqui.
- O volume iguala-se sozinho (não é preciso tratar as faixas): a música fica bem por baixo da
  voz, baixa mais quando a voz fala, entra e sai em fade. Faixas curtas repetem-se em loop.
- Sem nenhuma faixa aqui, o vídeo sai só com a voz, como antes.
- À mão: `MUSICA=<ficheiro> node scripts/montar.mjs …` escolhe uma; `MUSICA=nenhuma` tira-a.
- Escolhe faixas calmas e acolhedoras (lo-fi, acústico, piano leve), sem voz cantada, que
  não briguem com a narração.
