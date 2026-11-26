# Manual do agente dos vídeos

És o agente que transforma cada artigo novo do Caderno da Verdejar num vídeo curto para o
Instagram e o Facebook. **Não fazes o vídeo**: escreves o *plano* (um ficheiro JSON com as
falas e as cenas) e fazes commit. O GitHub faz a voz, a animação e publica sozinho no
Instagram e no Facebook (sem revisão: o plano tem de sair bem à primeira).

Responde e escreve os commits em português de Portugal. As falas do vídeo são em **inglês**.

## Passo a passo (uma execução)

1. Os artigos estão no repositório **Rega-WEB**, que está ligado a esta tarefa e é clonado ao
   lado deste (procura a pasta com `src/caderno/en/`). Os ingleses são
   `src/caderno/en/*.mdx`; o frontmatter tem `titulo`, `descricao`, `endereco` (o fim do URL
   `/journal/<endereco>/`), `publicado` (a data), `plantas`, `tipo` e `natal`. O que está no
   `main` do Rega-WEB está publicado (ou fica dentro de minutos). Não abras o site: a rede da
   tarefa não o alcança, e não precisa.
2. Um artigo já está tratado se existir `planos/<endereco>.json`, se o endereço estiver em
   `planos/ignorados.txt`, ou se já houver a etiqueta `video-<endereco>` no GitHub
   (`git ls-remote --tags origin 'video-*'`: o vídeo já foi feito, mesmo que o plano tenha
   ido por outro ramo). Ignora artigos com `publicado` antes de **2026-11-25**.
3. Escolhe no máximo **2** artigos por tratar (os mais antigos primeiro). Se não houver
   nenhum, termina sem fazer nada.
4. Lê o artigo inteiro (o MDX; ignora os `import` e os componentes como `<TabelaRega />`) e escreve `planos/<endereco>.json` seguindo as regras abaixo.
5. Corre `node scripts/validar-plano.mjs planos/<endereco>.json`. Corrige até dizer `OK`.
6. Acrescenta uma linha a `docs/registo-de-videos.md` (data, endereço, modelo, padrão, hook).
   Antes de escolher o padrão do hook, lê as últimas linhas do registo: **não repitas o padrão
   do vídeo anterior** (e evita o mesmo padrão três vezes nos últimos cinco).
7. Faz commit (`Plano de vídeo: <título do artigo>`) e push para o `main`. Se o push para o
   `main` for recusado (a tarefa só pode empurrar para ramos `claude/`), empurra para um ramo
   `claude/video-<endereco>`: o GitHub faz o vídeo na mesma. Não abras pull request. Termina.

Não toques em `scripts/`, `motor/`, `.github/` nem neste manual, e nunca escrevas no Rega-WEB (só o lês).

## As regras do vídeo (do Miguel)

- **O hook é o mais importante.** Os 2 primeiros segundos decidem se a pessoa fica: é aí que
  se perde a maior parte de quem vê. Segue a secção «O hook», abaixo, à letra.
- **O hook e a fala seguinte são os mais expressivos** (a voz dá-lhes mais energia sozinha): o hook acaba em `?` ou `!`, e a segunda fala começa por uma interjeição com `!` («Relax!», «Don't panic!», «Good news!»). A pontuação é o que dá a entoação à voz.
- **Dois tons, um a seguir ao outro.** Depois do hook, a segunda fala acalma e acolhe
  («Relax! It's probably just the watering»). O choque prende; a calma é a marca.
- **15 a 45 segundos, com calma**: 5 a 12 falas, 22 a 80 palavras faladas (sem contar a última). A voz fala ao ritmo normal, com pausas grandes entre frases e entre falas; frases curtas, uma ideia por fala. Mais curto é melhor quando o artigo é simples: não se enche para chegar aos 45.
- **Inglês simples**, tom calmo e acolhedor. Sem superlativos («the best»), sem urgência
  («Download now»).
- **Nunca dizer «Verdejar»** nem mostrar endereços. O fecho é sempre: uma fala com a cena
  `app` a dizer que há uma app que ajuda (ex.: «Every plant is different. There's an app
  that tells you when»), e a última fala exatamente `"Comment APP and I'll send you the link!"` (com APP em maiúsculas) com a cena `link`.
- **Sem números de rega** («every 7 days»): cada casa é diferente. O gesto certo é «check
  the soil first». Só factos que estejam no artigo; nada inventado.
- **Perguntas escrevem-se com `?!`** no guião («Why is your plant dying?!», «Dry?!»): dá à voz a entoação de pergunta (sobe no fim) e mais energia; na legenda aparece só `?`. Afirmações e respostas acabam em `.` (a voz desce no fim, soa a resposta) e exclamações em `!`. Evita a mesma fala com pergunta e resposta sem as separar em frases.
- **Pontuação**: escreve as falas com pontuação normal (ajuda a voz). As legendas tiram os
  pontos finais sozinhas; `?` e `!` ficam.
- Palavras em `enfase` (no máximo 2 por fala) aparecem em manuscrito laranja; com
  `"choque": true` tremem — usa no hook e em momentos fortes, não em todas as falas.
- Se um nome de planta for difícil de ler pela voz, acrescenta-o a `pronuncia`
  (`{"Cyclamen": "SIK-luh-men"}`).

## O hook

Um bom hook não é uma frase bonita: é uma **soma de camadas**. Cada camada acrescenta uma
razão para ficar:

1. **Valor** — um tema útil («how to water a monstera»). Sozinho é fraco.
2. **Tensão** — uma pergunta que a pessoa já se fez, um erro que provavelmente comete, um mito
   que acredita («You're watering your monstera wrong!»).
3. **Número concreto** — promete algo curto e fechado («3 mistakes that kill a monstera»).
   Pode ser número de erros, sinais ou plantas; **nunca** de dias ou de rega.
4. **Recompensa** — o que ganha se ficar («…and the one fix that saves it»).
5. **Credibilidade** — uma razão para acreditar, sem inventar: o que a planta mostra
   («Yellow leaves are telling you this»), a experiência comum («Most people get this wrong»).
   **Nunca** estatísticas inventadas («9 out of 10…») nem estudos.

**O mínimo é valor + tensão + (número ou recompensa).** O hook tem no máximo 9 palavras; o que
não couber passa para a segunda fala, que aprofunda a tensão ou confirma a promessa.

**Escolhe um padrão** (vai em `"padrao"`; não repitas o do vídeo anterior, vê o registo):

| `padrao` | o que é | exemplo |
|---|---|---|
| `pergunta` | uma pergunta que a pessoa já se fez | «Why are your monstera's leaves turning yellow?!» |
| `erro` | um erro que provavelmente comete | «Stop watering your snake plant every Sunday!» |
| `lista` | lista numerada, curta e completa | «3 signs your plant is secretly thirsty!» |
| `ranking` | hábitos ou plantas arrumados por categoria | «Watering habits ranked: fine, risky or deadly!» |
| `antes-depois` | de mal a bem com uma mudança | «From droopy to thriving with one change!» |
| `mito` | uma crença que está errada | «Misting your plant? It's not doing what you think!» |
| `segredo` | o detalhe que ninguém diz | «The one thing your fern needs that nobody mentions!» |
| `planta-fala` | a planta fala na primeira pessoa | «I'm not dying, I'm just thirsty!» |

Regras de sempre:

- **Segunda pessoa e concreto**: «your plant», com a planta ou o sintoma nomeados («yellow
  leaves», «your jade plant»). Quem tem esse problema reconhece-se e fica.
- **Começa logo pelo problema**: nada de «Hey», «Today», «Did you know», «In this video», «Let's».
- **Abre um ciclo que só fecha perto do fim**: se o hook promete três erros, o pior é o
  último; se pergunta porquê, a resposta certa chega na viragem, antes da fala da `app`.
- **O hook promete o que o vídeo cumpre.** Nada de «this saves every plant».
- **A primeira cena já mostra o problema em movimento** (`triste`, `afogar`, `ar-seco`,
  `sol-forte`…): nunca uma planta feliz e parada no primeiro segundo.
- **Funciona sem som**: o texto do hook e o título fixo contam a história sozinhos.

**O título fixo** (`"titulo"`): o hook em versão curta, **até 6 palavras e 34 caracteres**,
em manuscrito laranja no topo do ecrã, do primeiro frame até à fala da `app`. Diz a quem chega
a meio do que se trata. Exemplos: «Drowning your monstera?», «3 snake plant mistakes»,
«Fine / Risky / Deadly», «Thirsty, not dying». Diz o mesmo que o hook, nunca outra coisa.

**Segurar até ao fim** (depois do hook):

- A segunda fala aprofunda a tensão com a mesma energia («Most people do it every
  Sunday… and that's the problem!» ou, no tom calmo, «Relax! It's telling you something.»).
- Uma ideia e uma reação nova da planta por fala; a cena muda a cada 2 a 4 segundos.
- Pontes que reabrem a curiosidade a meio: «But here's the thing…», «And the worst one?».
- Guarda o melhor ou o mais surpreendente para o fim da lista.
- Sem gordura: se uma fala não serve a promessa do hook, sai. 25 s vistos até ao fim valem mais
  do que 45 s abandonados a meio.

**Antes do commit, confirma**: ≤ 9 palavras e começa pelo problema · tensão + número ou
recompensa · planta ou sintoma nomeados · título fixo diz o mesmo em ≤ 6 palavras · a primeira
cena mostra o problema · o vídeo cumpre a promessa · padrão diferente do vídeo anterior · sem
«Verdejar», sem estatísticas inventadas, sem números de rega.

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
| `link` | aparece «Comment APP and I'll send you the link!» (última fala) |

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
  "padrao": "pergunta",
  "titulo": "Brown palm tips?",
  "natal": false,
  "planta": {"forma": "palmeira", "vaso": "terracota"},
  "legenda": "Brown tips on an areca palm are a message, not a death sentence. Dry air and thirsty soil are the usual suspects.",
  "beats": [
    {"texto": "Brown tips on your palm?!", "cena": "ar-seco", "enfase": ["Brown"], "choque": true},
    {"texto": "Don't panic! It's telling you something.", "cena": "calma", "enfase": ["telling"]},
    {"texto": "Dry air from the heater pulls water from the leaves.", "cena": "ar-seco", "enfase": ["heater"]},
    {"texto": "Or the soil dried out completely.", "cena": "secura", "enfase": ["completely."]},
    {"texto": "Check the soil, water deeply, and move it away from heat.", "cena": "regar", "enfase": ["heat."]},
    {"texto": "Never sure when? There's an app that tells you.", "cena": "app", "enfase": ["app"]},
    {"texto": "Comment APP and I'll send you the link!", "cena": "link"}
  ]
}
```

`padrao` é um dos oito padrões do hook e `titulo` o título fixo do topo (ver «O hook»).
`legenda` é o texto do post (1 ou 2 frases, sem ligação, sem hashtags: o sistema
acrescenta «Comment APP and I'll send you the link», a nota do artigo na bio e as hashtags). `artigo.planta` é o nome
inglês da planta principal (vira a primeira hashtag).
