"""Voz da Verdejar: narra cada fala do plano e devolve os tempos.

Uso: python -I scripts/voz.py plano.json saida_dir

A voz é sempre a mesma (decisão do Miguel): Kokoro, 70% af_heart + 30% af_bella,
inglês americano. Cada fala é gerada à parte, para se saber exatamente onde começa e
acaba; as palavras são distribuídas dentro da fala pelo comprimento (o Kokoro não dá
tempos por palavra). Escreve voz.wav e tempos.json.
"""
import json, os, re, sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

SR = 24000
PAUSA = 0.36          # silêncio entre falas
PAUSA_HOOK = 0.45     # depois do hook, um pouco mais: é a mudança de tom
CAUDA = 1.4           # o fim fica no ecrã depois da última palavra

plano_path, saida = sys.argv[1], sys.argv[2]
os.makedirs(saida, exist_ok=True)
plano = json.load(open(plano_path, encoding="utf-8"))
kdir = os.environ.get("KOKORO_DIR", "kokoro")
k = Kokoro(os.path.join(kdir, "kokoro.onnx"), os.path.join(kdir, "voices.bin"))
voz = k.get_voice_style("af_heart") * 0.7 + k.get_voice_style("af_bella") * 0.3
velocidade = float(os.environ.get("VELOCIDADE", "1.0"))

def pronunciar(txt):
    # Nomes que o modelo lê mal entram aqui (o que se ouve: o que se escreve para a voz).
    for a, b in (plano.get("pronuncia") or {}).items():
        txt = re.sub(rf"\b{re.escape(a)}\b", b, txt, flags=re.I)
    return txt

partes, t = [np.zeros(int(0.12 * SR), np.float32)], 0.12
for i, b in enumerate(plano["beats"]):
    s, _ = k.create(pronunciar(b["texto"]), voice=voz, speed=velocidade * float(b.get("velocidade", 1.0)), lang="en-us")
    s = s.astype(np.float32)
    # aparar silêncio das pontas
    nz = np.where(np.abs(s) > 0.01)[0]
    if len(nz):
        s = s[max(0, nz[0] - 240): nz[-1] + 480]
    dur = len(s) / SR
    b["t0"], b["t1"] = round(t, 3), round(t + dur, 3)
    palavras = b["texto"].split()
    pesos = [max(2, len(re.sub(r"[^A-Za-z0-9]", "", w))) + 1.5 for w in palavras]
    tot, acc = sum(pesos), 0.0
    b["palavras"] = []
    for w, p in zip(palavras, pesos):
        b["palavras"].append([w, round(t + dur * acc / tot, 3)])
        acc += p
    partes.append(s)
    t += dur
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
