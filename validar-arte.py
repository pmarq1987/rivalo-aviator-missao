#!/usr/bin/env python3
"""
Confere os arquivos de arte de img/ contra o que o jogo espera.
Sem dependências: lê o PNG na mão (header + IDAT), não precisa de PIL.

    python3 validar-arte.py
"""
import os, sys, zlib, struct

DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')

# 'ilustrado': tamanho é sugestão, proporção é regra (o canvas escala pela altura).
# 'pixel':     tamanho é regra (1 px de arte = 1 px de tela).
MODO = 'ilustrado'

# nome: (largura, altura, precisa_alpha, repete_na_horizontal, quadros)
ESPERADO = {
    'plane.png':            (576, 120, True,  False, 3),
    'sky.png':              (512, 344, False, True,  1),
    'far.png':              (768, 145, True,  True,  1),
    'mid.png':              (768,  90, True,  True,  1),
    'ground.png':           (512,  38, True,  True,  1),
    'obstacle-top.png':     (300, 520, True,  False, 1),
    'obstacle-bottom.png':  (300, 520, True,  False, 1),
    'goal.png':             (260, 640, True,  False, 1),
    'boom.png':             (688, 172, True,  False, 4),
}

LIMITE_KB = 120 if MODO == 'ilustrado' else 80
TOLERANCIA_PROPORCAO = 0.06   # 6% de desvio na proporção ainda passa


def ler_png(caminho):
    """Devolve (w, h, canais, tem_alfa, linhas).

    Suporta RGB, RGBA e paleta indexada. Paleta com chunk tRNS TEM transparência —
    ignorar isso foi um falso positivo que quase me fez acusar arte correta.
    """
    with open(caminho, 'rb') as f:
        dados = f.read()
    if dados[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('não é PNG')

    pos, idat, info = 8, b'', None
    plte, trns = None, None
    while pos < len(dados):
        (tam,) = struct.unpack('>I', dados[pos:pos + 4])
        tipo = dados[pos + 4:pos + 8]
        corpo = dados[pos + 8:pos + 8 + tam]
        if tipo == b'IHDR':
            w, h, prof, cor, _, _, entrelace = struct.unpack('>IIBBBBB', corpo)
            info = (w, h, prof, cor, entrelace)
        elif tipo == b'PLTE':
            plte = corpo
        elif tipo == b'tRNS':
            trns = corpo
        elif tipo == b'IDAT':
            idat += corpo
        elif tipo == b'IEND':
            break
        pos += 12 + tam

    w, h, prof, cor, entrelace = info
    tem_alfa = cor in (4, 6) or (cor == 3 and trns is not None)
    canais = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}.get(cor)

    if prof != 8 or entrelace != 0 or cor not in (2, 3, 6):
        return w, h, canais, tem_alfa, None     # header ok, pixels não decodificáveis aqui

    bruto = zlib.decompress(idat)
    bpp = canais
    passo = w * bpp
    linhas, ant, i = [], bytearray(passo), 0
    for _ in range(h):
        filtro = bruto[i]; i += 1
        linha = bytearray(bruto[i:i + passo]); i += passo
        for x in range(passo):
            a = linha[x - bpp] if x >= bpp else 0
            b = ant[x]
            c = ant[x - bpp] if x >= bpp else 0
            if filtro == 1:   linha[x] = (linha[x] + a) & 0xFF
            elif filtro == 2: linha[x] = (linha[x] + b) & 0xFF
            elif filtro == 3: linha[x] = (linha[x] + (a + b) // 2) & 0xFF
            elif filtro == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                linha[x] = (linha[x] + pr) & 0xFF
        linhas.append(bytes(linha)); ant = linha

    if cor == 3:        # paleta: expande para RGBA, para a checagem de emenda funcionar
        expandidas = []
        for ln in linhas:
            out = bytearray()
            for idx in ln:
                out += plte[idx * 3:idx * 3 + 3]
                out.append(trns[idx] if (trns and idx < len(trns)) else 255)
            expandidas.append(bytes(out))
        return w, h, 4, tem_alfa, expandidas

    return w, h, canais, tem_alfa, linhas


def diferenca_emenda(w, h, canais, linhas):
    """Quanto a coluna da direita difere da esquerda (0 = emenda perfeita)."""
    total = 0
    for y in range(h):
        ln = linhas[y]
        esq = ln[0:canais]
        dir_ = ln[(w - 1) * canais:w * canais]
        total += sum(abs(esq[c] - dir_[c]) for c in range(canais))
    return total / (h * canais)


def main():
    if not os.path.isdir(DIR):
        print('pasta img/ não existe'); return 1

    problemas, avisos, ok = [], [], []
    for nome, (ew, eh, alpha, tile, quadros) in ESPERADO.items():
        caminho = os.path.join(DIR, nome)
        if not os.path.exists(caminho):
            problemas.append('%-22s FALTANDO' % nome)
            continue

        kb = os.path.getsize(caminho) / 1024
        try:
            w, h, canais, tem_alfa, linhas = ler_png(caminho)
        except Exception as e:
            problemas.append('%-22s ilegível (%s)' % (nome, e))
            continue

        notas = []
        if (w, h) != (ew, eh):
            if MODO == 'pixel':
                notas.append('DIMENSÃO %dx%d, esperado %dx%d' % (w, h, ew, eh))
            else:
                # ilustrado: o que não pode desviar é a proporção
                desvio = abs((w / h) - (ew / eh)) / (ew / eh)
                if desvio > TOLERANCIA_PROPORCAO:
                    notas.append('PROPORÇÃO %dx%d (%.2f:1), esperado ~%.2f:1 — vai distorcer'
                                 % (w, h, w / h, ew / eh))
                else:
                    avisos.append('%-22s %dx%d em vez de %dx%d (proporção ok, só escala)'
                                  % (nome, w, h, ew, eh))
        if alpha and not tem_alfa:
            notas.append('SEM TRANSPARÊNCIA')
        if quadros > 1 and w % quadros:
            notas.append('largura não divide em %d quadros' % quadros)
        if kb > LIMITE_KB:
            avisos.append('%-22s %.0f KB (acima de %d KB)' % (nome, kb, LIMITE_KB))

        if tile and linhas:
            d = diferenca_emenda(w, h, canais, linhas)
            if d > 12:
                notas.append('EMENDA aberta (diferença média %.0f/255 entre as bordas)' % d)
            elif d > 4:
                avisos.append('%-22s emenda quase fechada (diferença %.0f/255)' % (nome, d))

        if notas:
            problemas.append('%-22s %s' % (nome, ' · '.join(notas)))
        else:
            ok.append('%-22s %dx%d  %.0f KB' % (nome, w, h, kb))

    print('\nmodo: %s  ·  limite de peso: %d KB' % (MODO, LIMITE_KB))
    print('\n== OK ==')
    for l in ok: print('  ' + l)
    if avisos:
        print('\n== AVISOS ==')
        for l in avisos: print('  ' + l)
    if problemas:
        print('\n== PROBLEMAS ==')
        for l in problemas: print('  ' + l)
    print()
    return 1 if problemas else 0


if __name__ == '__main__':
    sys.exit(main())
