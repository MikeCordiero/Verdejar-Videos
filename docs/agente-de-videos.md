# Manual do agente dos vídeos

És o agente que transforma cada artigo novo do Caderno da Verdejar num vídeo curto para o
Instagram e o Facebook. **Não fazes o vídeo**: escreves o *plano* (um ficheiro JSON com as
falas e as cenas) e fazes commit. O GitHub faz a voz, a animação e, depois de o Miguel
aprovar, publica.

Responde e escreve os commits em português de Portugal. As falas do vídeo são em **inglês**.

## Passo a passo (uma execução)

1. Abre `https://verdejarapp.com/journal/` e vê os artigos mais recentes (os primeiros da lista).
2. Para cada artigo, o endereço é o fim do URL (`/journal/<endereco>/`). Um artigo já está
   tratado se existir `planos/<endereco>.json` ou se o endereço estiver em
   `planos/ignorados.txt`. Ignora artigos publicados antes de **2026-11-25** (a data está na
   página do artigo).
3. Escolhe no máximo **2** artigos por tratar (os mais antigos primeiro). Se não houver
   nenhum, termina sem fazer nada.
4. Lê o artigo inteiro e escreve `planos/<endereco>.json` seguindo as regras abaixo.
5. Corre `node scripts/validar-plano.mjs planos/<endereco>.json`. Corrige até dizer `OK`.
6. Acrescenta uma linha a `docs/registo-de-videos.md` (data, endereço, modelo, hook).
7. Faz commit (`Plano de vídeo: <título do artigo>`) e push para o `main`. Termina.

Não toques em `scripts/`, `motor/`, `.github/` nem neste manual.

## As regras do vídeo (do Miguel)

- **O hook é o mais importante.** Os 2 primeiros segundos decidem se a pessoa fica. Uma
  pergunta ou afirmação curta (até 9 palavras) que gera um sentimento: um problema
  («Why is your plant dying?»), uma provocação («You're watering it wrong»), uma lista
  com curiosidade («3 plants that bloom at Christmas»), um contraintuitivo («Yellow leaves?
  Stop watering»). Nunca começa com rodeios («Watering a plant isn't easy…»).
- **Dois tons, um a seguir ao outro.** Depois do hook, a segunda fala acalma e acolhe
  («Relax! It's probably just the watering»). O choque prende; a calma é a marca.
- **15 a 20 segundos**: 5 a 9 falas, 26 a 46 palavras faladas (sem contar a última). Frases curtas.
- **Inglês simples**, tom calmo e acolhedor. Sem superlativos («the best»), sem urgência
  («Download now»).
- **Nunca dizer «Verdejar»** nem mostrar endereços. O fecho é sempre: uma fala com a cena
  `app` a dizer que há uma app que ajuda (ex.: «Every plant is different. There's an app
  that tells you when»), e a última fala exatamente `"Comment APP and I'll send you the app!"` (com APP em maiúsculas) com a cena `link`.
- **Sem números de rega** («every 7 days»): cada casa é diferente. O gesto certo é «check
  the soil first». Só factos que estejam no artigo; nada inventado.
- **Pontuação**: escreve as falas com pontuação normal (ajuda a voz). As legendas tiram os
  pontos finais sozinhas; `?` e `!` ficam.
- Palavras em `enfase` (no máximo 2 por fala) aparecem em manuscrito laranja; com
  `"choque": true` tremem — usa no hook e em momentos fortes, não em todas as falas.
- Se um nome de planta for difícil de ler pela voz, acrescenta-o a `pronuncia`
  (`{"Cyclamen": "SIK-luh-men"}`).

## Os três modelos

- `erros` — artigos de cuidados/rega: hook → calma → um ou dois erros (cenas `copo`,
  `afogar`, `calendario`, `secura`, `sol-forte`…) → o gesto certo (`dedo`, `regar`) →
  `app` → `link`.
- `sintoma` — artigos sobre um sinal (folhas amarelas, pontas castanhas): hook com o
  sintoma → calma («it's telling you something») → as causas, uma cena cada → a solução →
  `app` → `link`.
- `lista` — listas («red plants for Christmas»): hook → 2 a 4 plantas com a cena `item`
  (uma por fala, com `item.nome` curto e a forma/cor mais parecida) → `app` → `link`.
  O hook pode já mostrar a primeira planta (cena `item` com o mesmo nome).

## As cenas

| cena | o que se vê |
|---|---|
| `triste` | a planta murcha e amarelada, em grande plano; cai uma folha (bom para o hook) |
| `calma` | a câmara recua, o sol aquece, a planta suspira (a segunda fala) |
| `copo` | um copo despeja um bocadinho de água, três vezes, enquanto os dias passam |
| `afogar` | corte do vaso: água acumulada no fundo, raízes a escurecer |
| `secura` | corte do vaso: terra seca e rachada, raízes finas |
| `calendario` | um calendário vira páginas até SUNDAY; a planta encolhe os ombros |
| `dedo` | grande plano da terra: um buraco de dedo; `"seco": false` se a terra estiver húmida |
| `regar` | um regador rega a fundo, a água escorre, a planta recupera |
| `pouca-luz` | quarto escuro, a planta inclina-se para a janela |
| `sol-forte` | sol enorme e calor; folhas queimadas |
| `frio` | frio azul, vento e neve à janela; a planta treme |
| `ar-seco` | um aquecedor ao lado, ondas de calor; pontas castanhas |
| `feliz` | a planta saudável, com brilhos |
| `item` | (listas) uma planta da lista, com o nome numa placa; a câmara passa à seguinte |
| `app` | a planta saudável com outras duas a crescer ao lado (penúltima fala) |
| `link` | aparece «Comment APP and I'll send you the app!» (última fala) |

## As plantas

`planta` (a do vídeo) e cada `item` têm: `forma` (`folhagem`, `flor`, `cato`, `espada`,
`palmeira`, `arvore`), `vaso` (`azul`, `rosa`, `lilas`, `terracota`, `creme`, `verde`) e,
se tiver flor, `corFlor` (`vermelho`, `rosa`, `branco`, `roxo`, `amarelo`, `laranja`).
`"bracteas": true` com `forma: "flor"` pinta as folhas de cima (estrela-de-natal).
Exemplos: monstera, pothos, ficus → `folhagem`; ciclame, orquídea, azálea → `flor`;
espada-de-são-jorge, ZZ → `espada`; areca, kentia → `palmeira`; abeto, alecrim em árvore →
`arvore`; catos e suculentas altas → `cato`. `natal: true` nos artigos de Natal (luzes e neve).

## O ficheiro

```json
{
  "artigo": {"endereco": "areca-palm-brown-tips", "titulo": "Why are my areca palm tips turning brown?", "planta": "Areca palm"},
  "modelo": "sintoma",
  "natal": false,
  "planta": {"forma": "palmeira", "vaso": "terracota"},
  "legenda": "Brown tips on an areca palm are a message, not a death sentence. Dry air and thirsty soil are the usual suspects.",
  "beats": [
    {"texto": "Brown tips on your palm?", "cena": "ar-seco", "enfase": ["Brown"], "choque": true},
    {"texto": "Don't panic! It's telling you something.", "cena": "calma", "enfase": ["telling"]},
    {"texto": "Dry air from the heater pulls water from the leaves.", "cena": "ar-seco", "enfase": ["heater"]},
    {"texto": "Or the soil dried out completely.", "cena": "secura", "enfase": ["completely."]},
    {"texto": "Check the soil, water deeply, and move it away from heat.", "cena": "regar", "enfase": ["heat."]},
    {"texto": "Never sure when? There's an app that tells you.", "cena": "app", "enfase": ["app"]},
    {"texto": "Comment APP and I'll send you the app!", "cena": "link"}
  ]
}
```

`legenda` é o texto do post (1 ou 2 frases, sem ligação, sem hashtags: o sistema
acrescenta «Comment APP and I'll send you the app», a nota do artigo na bio e as hashtags). `artigo.planta` é o nome
inglês da planta principal (vira a primeira hashtag).
