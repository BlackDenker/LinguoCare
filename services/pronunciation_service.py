import os
import re
import subprocess

def convert_webm_to_wav(webm_path, wav_path):
    """Convierte WebM a WAV usando ffmpeg si está disponible."""
    try:
        subprocess.run(['ffmpeg', '-y', '-i', webm_path, wav_path], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def clean_word(word):
    """Limpia puntuación de una palabra"""
    return re.sub(r'[^\w\s]', '', word.lower())

def evaluate_pronunciation(audio_file_path, sentence, accuracy_val=80):
    """
    Toma un audio en formato wav, y la frase esperada.
    Devuelve un array evaluando cada palabra usando alineación fonética.
    Usa lazy loading para no bloquear el arranque de Flask.
    """
    # --- Lazy imports para no bloquear Flask al arrancar ---
    model = None
    try:
        from allosaurus.app import read_recognizer
        try:
            model = read_recognizer('eng2102')
        except Exception:
            try:
                model = read_recognizer('uni2005')
            except Exception:
                model = None
    except ImportError:
        model = None

    g2p = None
    try:
        import nltk
        try:
            nltk.data.find('taggers/averaged_perceptron_tagger_eng')
        except LookupError:
            nltk.download('averaged_perceptron_tagger_eng', quiet=True)
            
        try:
            nltk.data.find('corpora/cmudict')
        except LookupError:
            nltk.download('cmudict', quiet=True)
            
        from g2p_en import G2p
        g2p = G2p()
    except ImportError:
        g2p = None

    dist_module = None
    try:
        import distance as dist_module
    except ImportError:
        dist_module = None

    # Si faltan dependencias críticas, devolver error descriptivo
    if model is None or g2p is None:
        return {
            "status": "error",
            "message": "Allosaurus o g2p_en no están instalados. Instala allosaurus con: conda activate linguocare && pip install allosaurus"
        }

    # 1. Obtener fonemas del audio usando allosaurus
    try:
        recognized_phonemes_str = model.recognize(audio_file_path, 'eng')
        recognized_phonemes = recognized_phonemes_str.split()
    except Exception as e:
        return {"status": "error", "message": f"Error procesando audio: {str(e)}"}

    # Función de mapeo ARPAbet a IPA
    def arpabet_to_ipa_list(arpabet_phones):
        mapping = {
            'AA': 'ɑ', 'AE': 'æ', 'AH': 'ʌ', 'AO': 'ɔ', 'AW': 'aʊ',
            'AY': 'aɪ', 'B': 'b', 'CH': 'tʃ', 'D': 'd', 'DH': 'ð',
            'EH': 'ɛ', 'ER': 'ɝ', 'EY': 'eɪ', 'F': 'f', 'G': 'ɡ',
            'HH': 'h', 'IH': 'ɪ', 'IY': 'i', 'JH': 'dʒ', 'K': 'k',
            'L': 'l', 'M': 'm', 'N': 'n', 'NG': 'ŋ', 'OW': 'oʊ',
            'OY': 'ɔɪ', 'P': 'p', 'R': 'ɹ', 'S': 's', 'SH': 'ʃ',
            'T': 't', 'TH': 'θ', 'UH': 'ʊ', 'UW': 'u', 'V': 'v',
            'W': 'w', 'Y': 'j', 'Z': 'z', 'ZH': 'ʒ'
        }
        ipa_phones = []
        for p in arpabet_phones:
            clean_p = ''.join([c for c in p if c.isalpha()])
            if clean_p in mapping:
                ipa_phones.append(mapping[clean_p])
            elif clean_p:
                ipa_phones.append(clean_p.lower())
        return ipa_phones

    # Función de alineación Levenshtein (Needleman-Wunsch)
    def align_sequences(seq1, seq2):
        n = len(seq1)
        m = len(seq2)
        dp = [[0] * (m + 1) for _ in range(n + 1)]
        for i in range(n + 1): dp[i][0] = i
        for j in range(m + 1): dp[0][j] = j
        for i in range(1, n + 1):
            for j in range(1, m + 1):
                cost = 0 if seq1[i-1] == seq2[j-1] else 1
                dp[i][j] = min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + cost)
                
        i, j = n, m
        aligned_seq1 = []
        aligned_seq2 = []
        while i > 0 or j > 0:
            if i > 0 and j > 0 and dp[i][j] == dp[i-1][j-1] + (0 if seq1[i-1] == seq2[j-1] else 1):
                aligned_seq1.append(seq1[i-1])
                aligned_seq2.append(seq2[j-1])
                i -= 1
                j -= 1
            elif i > 0 and dp[i][j] == dp[i-1][j] + 1:
                aligned_seq1.append(seq1[i-1])
                aligned_seq2.append('-')
                i -= 1
            else:
                aligned_seq1.append('-')
                aligned_seq2.append(seq2[j-1])
                j -= 1
        return aligned_seq1[::-1], aligned_seq2[::-1]

    # Preparar fonemas esperados
    words = sentence.split()
    expected_flat = []
    word_info = []

    for i, word in enumerate(words):
        clean_w = clean_word(word)
        if clean_w:
            phones_arpa = g2p(clean_w)
            phones_ipa = arpabet_to_ipa_list(phones_arpa)
            word_info.append({
                "word": word,
                "expected_ipa": phones_ipa,
                "aligned_actual": [],
                "errors": 0
            })
            for p in phones_ipa:
                expected_flat.append((p, i))
        else:
            word_info.append({
                "word": word,
                "expected_ipa": [],
                "aligned_actual": [],
                "errors": 0
            })

    # Ejecutar alineación con el output de allosaurus
    seq1 = [x[0] for x in expected_flat]
    seq2 = recognized_phonemes
    aligned_1, aligned_2 = align_sequences(seq1, seq2)

    # Reconstruir mapping a palabras
    flat_idx = 0
    for a1, a2 in zip(aligned_1, aligned_2):
        if a1 != '-':
            word_idx = expected_flat[flat_idx][1]
            if a2 != '-':
                word_info[word_idx]["aligned_actual"].append(a2)
            if a1 != a2:
                word_info[word_idx]["errors"] += 1
            flat_idx += 1
        else:
            # Inserción en el habla, asignar a la palabra actual o última
            word_idx = expected_flat[min(flat_idx, len(expected_flat)-1)][1] if len(expected_flat) > 0 else 0
            if a2 != '-':
                word_info[word_idx]["aligned_actual"].append(a2)
            word_info[word_idx]["errors"] += 1

    # Calcular resultado final
    evaluation = []
    
    # Mapeo manual ultra-relajado de exigencia:
    # Como el reconocimiento acústico sin "Forced Alignment" puro suele generar muchos
    # errores de alineación por espacios/silencios, debemos ser sumamente permisivos.
    # 60%: Permite 85% de error fonético (Básicamente con que la vocal principal o la primera consonante coincida, pasa).
    # 70%: Permite 70% de error.
    # 80%: Permite 50% de error.
    # 90%: Permite 25% de error.
    # 100%: Permite 5% de error.
    
    tolerance_map = {
        60: 0.85,
        70: 0.70,
        80: 0.50,
        90: 0.25,
        100: 0.05
    }
    
    # Encontrar el valor más cercano si mandan algo raro
    closest_acc = min(tolerance_map.keys(), key=lambda k: abs(k - accuracy_val))
    allowed_error_rate = tolerance_map[closest_acc]

    for info in word_info:
        if not info["expected_ipa"]:
            # Palabra sin fonemas (puntuación pura)
            continue
            
        error_rate = info["errors"] / len(info["expected_ipa"])
        correct = error_rate <= allowed_error_rate

        evaluation.append({
            "word": info["word"],
            "correct": correct,
            "expected_phonemes": " ".join(info["expected_ipa"]),
            "actual_phonemes": " ".join(info["aligned_actual"]) if info["aligned_actual"] else "-"
        })

    return {
        "status": "success",
        "evaluation": evaluation
    }
