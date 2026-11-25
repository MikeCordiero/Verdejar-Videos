# Vídeos da Verdejar

Cada artigo novo do Caderno (verdejarapp.com/journal) ganha um vídeo vertical de 15–45 s,
no estilo mostarda e pincel da marca, com a voz feminina de sempre e legendas palavra a
palavra, publicado como Reel no Facebook e no Instagram.

```
tarefa agendada do Claude  →  planos/<endereco>.json  →  GitHub Actions  →  aprovação  →  Reels
   (lê o artigo, escreve        (falas, cenas,            (voz Kokoro,       (Miguel, no     (Facebook +
    o guião com as regras)       plantas)                  animação, MP4)     telemóvel)      Instagram)
```

- **O guião** é escrito por uma tarefa agendada do Claude, que segue `docs/agente-de-videos.md`
  (as regras: hook, dois tons, sem «Verdejar», «Comment APP and I'll send you the app!»…). Para mudar o estilo dos
  guiões, muda-se esse manual.
- **A voz** é o Kokoro (modelo aberto, Apache 2.0): 70% `af_heart` + 30% `af_bella`, inglês.
  Corre no runner; não há serviço pago nem chave.
- **A animação** é `motor/modelo.html`: seis formas de planta, dezasseis cenas, três palcos.
  Tudo é função do tempo da timeline (o mesmo fotograma sai sempre igual).
- **A publicação** usa os mesmos Secrets da página que o Rega-WEB (`FB_PAGE_ID`,
  `FB_PAGE_TOKEN`) e sobe o vídeo direto para a Meta.

O repositório é público: os minutos do GitHub Actions são gratuitos. Nenhuma chave está no
código; ficam nos Secrets.

## Ligar (uma vez)

1. **Secrets** (Settings → Secrets and variables → Actions): `FB_PAGE_ID` e `FB_PAGE_TOKEN`,
   com os valores do Rega-WEB.
2. **Aprovação** (Settings → Environments → New environment): nome `publicacao`, marcar
   *Required reviewers* e escolher-te. Cada vídeo pára aí até aprovares (na app GitHub do
   telemóvel chega uma notificação). Para passar a publicar sozinho: desmarcar o revisor.
3. **Tarefa agendada** (no claude.ai, com este repositório ligado — uma tarefa criada por um
   agente nasce sem o repositório e falha): todos os dias, por exemplo às 13h de Lisboa,
   uma hora depois dos artigos, com o texto:

   > Lê docs/agente-de-videos.md e segue o passo a passo: escreve os planos dos vídeos dos
   > artigos novos do Caderno, valida-os e faz commit e push para o main.

## Ver e aprovar um vídeo

Quando um plano entra no `main`, o fluxo `videos` faz o vídeo (≈5–8 min) e põe-no numa
pré-release `video-<endereco>` (Releases, ou o link no resumo da execução). Vês o MP4 no
telemóvel e, em Actions → a execução → **Review deployments**, aprovas ou rejeitas.
Rejeitado, nada é publicado; para refazer, corrige o plano (commit) ou corre o fluxo à mão
com o endereço.

Para um artigo não ter vídeo: acrescenta o endereço a `planos/ignorados.txt`.

## Experimentar localmente

```bash
npm ci && pip install -r requirements.txt   # e ffmpeg + Google Chrome
mkdir -p kokoro && curl -fsSL -o kokoro/kokoro.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx \
  && curl -fsSL -o kokoro/voices.bin https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
node scripts/validar-plano.mjs exemplos/rega.json
KOKORO_DIR=kokoro python -I scripts/voz.py exemplos/rega.json saida/rega
node scripts/montar.mjs saida/rega                          # → saida/rega/video.mp4
node scripts/montar.mjs saida/rega --fotogramas 1,5,10      # só alguns fotogramas, para ver
```

Abrir `saida/rega/video.html` no browser também mostra o vídeo (com som e em loop).
