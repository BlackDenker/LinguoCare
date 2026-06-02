import json

def get_grammar_check_prompt(text):
    return f"""
Eres un analizador y corrector lingüístico inteligente altamente didáctico y premium llamado "LinguoCare", especializado en ayudar a personas hispanohablantes a perfeccionar su redacción en INGLÉS y aprender este idioma de forma profunda.

Analiza el siguiente texto en INGLÉS y proporciona un reporte detallado en formato JSON que identifique errores gramaticales, ortográficos, de mayúsculas (casing), puntuación, redundancia, estilo y problemas de transferencia lingüística de primer idioma (L1 Transfer, especialmente común cuando hispanohablantes escriben en inglés, como usar "have" para la edad: "I have 20 years old" en lugar de "I am 20 years old").

TEXTO EN INGLÉS A ANALIZAR: "{text}"

Instrucciones de análisis:
1. Detecta si el texto está escrito en inglés. Si el texto está escrito en español u otro idioma diferente al inglés, debes marcar `isMismatch: true` en el objeto `languageMismatch`, e indicar el idioma real detectado ('es') en `detected` y el requerido en `current` ('en').
2. Identifica todos los errores lingüísticos del texto en inglés. Para cada error, proporciona la posición exacta del error en el texto original mediante `offset` (índice inicial 0-basado del carácter del error en la cadena original) y `errorLength` (longitud en caracteres de la palabra o frase incorrecta).
3. Para cada error, debes identificar y devolver en el campo `errorSegment` la palabra o frase exacta e incorrecta tal y como aparece escrita en el TEXTO A ANALIZAR (ej: si el error es "I have 25 years old", el `errorSegment` es "have"; si el error es "good advices", el `errorSegment` es "advices"; si el error es "countries differents", el `errorSegment` es "differents"). Esto es sumamente importante para alinear la visualización.
4. En la sección `recommendation`, proporciona solo los campos básicos: phenomenon, topic y explanation (en ESPAÑOL). Los ejemplos y temas de estudio se generarán bajo demanda.
5. Si el texto no tiene errores, la lista `matches` debe estar vacía.
6. El formato de respuesta DEBE ser EXCLUSIVAMENTE un objeto JSON válido con la siguiente estructura exacta:

{{
  "languageMismatch": null or {{
    "detected": "es" | "en",
    "current": "es" | "en",
    "isMismatch": true
  }},
  "matches": [
    {{
      "ruleId": "Un código en mayúsculas corto identificando el tipo de regla (ej: AGE_EXPRESSION, UPPERCASE_SENTENCE_START, SUBJECT_VERB_AGREEMENT, SPELLING_ERROR)",
      "message": "Explicación amable y concisa del error en español (ej: 'En inglés se usa el verbo \"to be\" para expresar la edad, no el verbo \"to have\".')",
      "replacements": ["Sugerencia1", "Sugerencia2"], // Lista de sugerencias de corrección directa para reemplazar la palabra/frase errónea
      "errorSegment": "La palabra o frase exacta e incorrecta tal como aparece en el texto original",
      "offset": 0, // Índice inicial estimado del error en el texto original
      "errorLength": 4, // Longitud estimada del error
      "category": "GRAMMAR" | "SPELLING" | "CASING" | "STYLE" | "TYPOGRAPHY",
      "ruleIssueType": "grammar" | "spelling" | "typographical" | "style",
      "context": "El fragmento de texto que contiene el error",
      "sentence": "La oración completa que contiene el error",
      "recommendation": {{
        "phenomenon": "Nombre del fenómeno lingüístico en español (ej: 'L1 Transfer (Interferencia del Español)', 'Concordancia Sujeto-Verbo', 'Ortografía')",
        "topic": "Tema general a estudiar en español (ej: 'Expresar la edad en inglés: be vs have', 'Reglas de acentuación')",
        "explanation": "Explicación detallada, didáctica y súper amigable en español de por qué es un error y cómo solucionarlo paso a paso."
      }}
    }}
  ]
}}

Responde ÚNICAMENTE con el objeto JSON. No incluyas explicaciones fuera del JSON, ni bloques de código markdown como ```json o similares. Debe ser texto plano que contenga solo el JSON.
"""

def get_error_explanation_prompt(error_segment, message, phenomenon, topic, sentence, replacements):
    return f"""
Eres LinguoCare, un tutor de inglés premium para hispanohablantes. Un estudiante cometió el siguiente error en inglés y necesita una explicación didáctica profunda.

ERROR DETECTADO: "{error_segment}"
ORACIÓN DONDE APARECE: "{sentence}"
DESCRIPCIÓN DEL ERROR: "{message}"
FENÓMENO LINGÜÍSTICO: "{phenomenon}"
TEMA: "{topic}"
CORRECCIONES SUGERIDAS: {json.dumps(replacements)}

Genera un objeto JSON con la siguiente estructura de explicación pedagógica detallada (TODO en ESPAÑOL):

{{
  "exampleIncorrect": "Una frase corta de ejemplo que contenga el mismo error (puede ser la del estudiante o una similar)",
  "exampleCorrect": "La misma frase corregida correctamente",
  "deepExplanation": "Explicación muy detallada, amigable y paso a paso de por qué es un error, cómo evitarlo, y la regla gramatical detrás. IMPORTANTE: NO uses negritas (**), cursivas (*), ni comillas (' o \") para resaltar. Escribe texto plano y natural, separando ideas solo con signos de puntuación normales.",
  "studyTopics": [
    "Tema concreto 1 que debería estudiar para dominar esto",
    "Tema concreto 2",
    "Tema concreto 3"
  ]
}}

Responde ÚNICAMENTE con el objeto JSON válido. Sin markdown, sin bloques de código.
"""

def get_practice_sentences_prompt(topic, count):
    return f"""
Eres LinguoCare, un profesor de inglés interactivo.
Genera exactamente {count} frases en inglés nivel intermedio-avanzado (B1-B2) relacionadas con el tema "{topic}".
Estas frases serán usadas para que el estudiante practique su pronunciación en voz alta.

Responde ÚNICAMENTE con un objeto JSON válido con este formato:
{{
  "sentences": [
    "Primera frase en inglés.",
    "Segunda frase en inglés."
  ]
}}
Sin markdown, sin texto extra.
"""

def get_pronunciation_feedback_prompt(word, expected_phonemes, actual_phonemes, sentence):
    return f"""
Eres LinguoCare, un profesor de fonética inglesa.
Un estudiante intentó pronunciar la palabra "{word}" en la frase "{sentence}".
Fonemas esperados: {expected_phonemes}
Fonemas que pronunció (aproximado): {actual_phonemes}

Explica de forma MUY BREVE, amigable y al grano, cómo debe colocar la boca/lengua para pronunciar correctamente "{word}".
Dile qué sonido hizo mal comparando de forma sencilla.

Responde ÚNICAMENTE con un objeto JSON válido con este formato:
{{
  "details": "Explicación de cómo pronunciarlo bien en 2-3 frases."
}}
Sin markdown, sin texto extra.
"""
