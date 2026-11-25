"""Voz da Verdejar: narra cada fala do plano e devolve os tempos.

Uso: python -I scripts/voz.py plano.json saida_dir

A voz é sempre a mesma (decisão do Miguel): Kokoro, 70% af_heart + 30% af_bella,
inglês americano. Cada fala é gerada à parte, para se saber exatamente onde começa e
acaba; as palavras são distribuídas dentro da fala pelo comprimento (o Kokoro não dá
tempos por palavra). Escreve voz.wav e tempos.json.
"""
import json, os, re, subprocess, sys, tempfile
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

SR = 24000
PAUSA = 0.75          # silêncio entre falas (o Miguel quer o ritmo pausado)
PAUSA_HOOK = 0.95     # depois do hook, mais: é a mudança de tom
PAUSA_FRASE = 0.5     # entre frases dentro da mesma fala ("Relax! It's…")
CAUDA = 1.6           # o fim fica no ecrã depois da última palavra

plano_path, saida = sys.argv[1], sys.argv[2]
os.makedirs(saida, exist_ok=True)
plano = json.load(open(plano_path, encoding="utf-8"))
kdir = os.environ.get("KOKORO_DIR", "kokoro")
k = Kokoro(os.path.join(kdir, "kokoro.onnx"), os.path.join(kdir, "voices.bin"))
heart, bella = k.get_voice_style("af_heart"), k.get_voice_style("af_bella")
voz = heart * 0.7 + bella * 0.3
# Mais expressão no hook e na fala seguinte (o Miguel): a mesma voz, com mais af_bella (mais viva),
# o hook um pouco mais rápido e agudo, a resposta calma um pouco mais lenta e quente.
EXPRESSAO = {0: (heart * 0.4 + bella * 0.6, 1.06, 1.035), 1: (heart * 0.5 + bella * 0.5, 0.96, 1.0)}
velocidade = float(os.environ.get("VELOCIDADE", "1.0"))

def pronunciar(txt):
    txt = re.sub(r"\bAPP\b", "app", txt)  # em maiúsculas só na legenda; a voz diz a palavra, não as letras
    # Nomes que o modelo lê mal entram aqui (o que se ouve: o que se escreve para a voz).
    for a, b in (plano.get("pronuncia") or {}).items():
        txt = re.sub(rf"\b{re.escape(a)}\b", b, txt, flags=re.I)
    return txt

partes, t = [np.zeros(int(0.12 * SR), np.float32)], 0.12
def afinar(s, f):
    # sobe o tom sem mudar a duração (ffmpeg: asetrate + atempo)
    with tempfile.TemporaryDirectory() as d:
        a, b = os.path.join(d, "a.wav"), os.path.join(d, "b.wav")
        sf.write(a, s, SR)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", a, "-af", f"asetrate={int(SR * f)},aresample={SR},atempo={1 / f:.5f}", b], check=True)
        return sf.read(b, dtype="float32")[0]

def narrar(txt, vel, estilo=None, tom=1.0):
    s, _ = k.create(pronunciar(txt), voice=voz if estilo is None else estilo, speed=vel, lang="en-us")
    s = s.astype(np.float32)
    if tom != 1.0:
        s = afinar(s, tom)
    nz = np.where(np.abs(s) > 0.01)[0]   # aparar o silêncio das pontas
    return s[max(0, nz[0] - 240): nz[-1] + 480] if len(nz) else s

def pesos(ws):
    return [max(2, len(re.sub(r"[^A-Za-z0-9]", "", w))) + 1.5 for w in ws]

for i, b in enumerate(plano["beats"]):
    estilo, vmul, tom = EXPRESSAO.get(i, (None, 1.0, 1.0))
    vel = velocidade * vmul * float(b.get("velocidade", 1.0))
    # Cada frase da fala é narrada à parte, com uma pausa curta entre elas: dá o ritmo calmo
    # e sabe-se onde começa cada frase (as palavras ficam mais certas com a voz).
    frases = [f for f in re.split(r"(?<=[.!?])\s+", b["texto"].strip()) if f]
    b["t0"], b["palavras"] = round(t, 3), []
    for j, fr in enumerate(frases):
        s = narrar(fr, vel, estilo, tom)
        dur = len(s) / SR
        ws = fr.split(); ps = pesos(ws); tot, acc = sum(ps), 0.0
        for w, p in zip(ws, ps):
            b["palavras"].append([w, round(t + dur * acc / tot, 3)])
            acc += p
        partes.append(s); t += dur
        if j < len(frases) - 1:
            partes.append(np.zeros(int(PAUSA_FRASE * SR), np.float32)); t += PAUSA_FRASE
    b["t1"] = round(t, 3)
    pausa = PAUSA_HOOK if i == 0 else PAUSA
    partes.append(np.zeros(int(pausa * SR), np.float32))
    t += pausa

partes.append(np.zeros(int(CAUDA * SR), np.float32))
t += CAUDA
a = np.concatenate(partes)
a = a / max(1e-6, np.abs(a).max()) * 0.89
sf.write(os.path.join(saida, "voz.wav"), a, SR)
plano["duracao"] = round(len(a) / SR, 2)
json.dump(plano, open(os.path.join(saida, "tempos.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"voz: {plano['duracao']} s, {len(plano['beats'])} falas")
