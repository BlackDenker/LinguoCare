import json
import re
import requests
from config import Config
from services.prompts import get_grammar_check_prompt, get_error_explanation_prompt
from services.utils import parse_gemini_429, align_text_matches

def check_text_grammar(text, lang='en'):
    """Performs the full grammatical check of a text using Gemini."""
    prompt = get_grammar_check_prompt(text)

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }
    
    response = requests.post(
        Config.GEMINI_URL, 
        headers={"Content-Type": "application/json"}, 
        json=payload,
        timeout=30
    )
    
    if response.status_code == 429:
        return {'status': 'error', 'is_429': True, 'error_info': parse_gemini_429(response)}
    if response.status_code == 503:
        return {'status': 'error', 'message': "Nuestros servidores de IA están experimentando una altísima demanda en este momento. Por favor, espera un par de minutos y vuelve a intentarlo. 🕒"}
    if response.status_code != 200:
        raise Exception(f"Gemini API returned status {response.status_code}: {response.text}")
        
    result_json = response.json()
    candidate_text = result_json["candidates"][0]["content"]["parts"][0]["text"].strip()
    analysis = json.loads(candidate_text)
    matches = analysis.get("matches", [])
    
    # Mathematically align offsets and lengths using Python
    matches = align_text_matches(text, matches)
    
    return {
        "status": "success",
        "text": text,
        "language": lang,
        "languageMismatch": analysis.get("languageMismatch"),
        "matches": matches
    }


def generate_error_explanation(error_segment, message, phenomenon, topic, sentence, replacements):
    """Generates a deep pedagogical explanation for a specific error."""
    prompt = get_error_explanation_prompt(
        error_segment, message, phenomenon, topic, sentence, replacements
    )
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }

    response = requests.post(
        Config.GEMINI_URL,
        headers={"Content-Type": "application/json"},
        json=payload,
        timeout=30
    )

    if response.status_code == 429:
        return {'status': 'error', 'is_429': True, 'error_info': parse_gemini_429(response)}
    if response.status_code == 503:
        return {'status': 'error', 'message': "Nuestros servidores de IA están experimentando una altísima demanda en este momento. Por favor, espera un par de minutos y vuelve a intentarlo. 🕒"}
    if response.status_code != 200:
        raise Exception(f"Gemini API returned status {response.status_code}: {response.text}")

    result_json = response.json()
    candidate_text = result_json["candidates"][0]["content"]["parts"][0]["text"].strip()
    explanation = json.loads(candidate_text)

    return {
        "status": "success",
        "explanation": explanation
    }

def generate_practice_sentences(topic, count=5):
    from services.prompts import get_practice_sentences_prompt
    prompt = get_practice_sentences_prompt(topic, count)
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }

    response = requests.post(
        Config.GEMINI_URL,
        headers={"Content-Type": "application/json"},
        json=payload,
        timeout=30
    )

    if response.status_code == 429:
        return {'status': 'error', 'is_429': True, 'error_info': parse_gemini_429(response)}
    if response.status_code == 503:
        return {'status': 'error', 'message': "Nuestros servidores de IA están experimentando una altísima demanda en este momento. Por favor, espera un par de minutos y vuelve a intentarlo. 🕒"}
    if response.status_code != 200:
        raise Exception(f"Gemini API error: {response.text}")

    result_json = response.json()
    candidate_text = result_json["candidates"][0]["content"]["parts"][0]["text"].strip()
    # Eliminar posibles bloques de código markdown que el modelo pueda devolver
    if candidate_text.startswith("```"):
        candidate_text = re.sub(r'^```[a-z]*\n?', '', candidate_text)
        candidate_text = re.sub(r'\n?```$', '', candidate_text).strip()
    data = json.loads(candidate_text)

    return {
        "status": "success",
        "sentences": data.get("sentences", [])
    }

def generate_pronunciation_feedback(word, expected_phonemes, actual_phonemes, sentence):
    from services.prompts import get_pronunciation_feedback_prompt
    prompt = get_pronunciation_feedback_prompt(word, expected_phonemes, actual_phonemes, sentence)
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }

    response = requests.post(
        Config.GEMINI_URL,
        headers={"Content-Type": "application/json"},
        json=payload,
        timeout=30
    )

    if response.status_code == 429:
        return {'status': 'error', 'is_429': True, 'error_info': parse_gemini_429(response)}
    if response.status_code == 503:
        return {'status': 'error', 'message': "Nuestros servidores de IA están experimentando una altísima demanda en este momento. Por favor, espera un par de minutos y vuelve a intentarlo. 🕒"}
    if response.status_code != 200:
        raise Exception(f"Gemini API error: {response.text}")

    result_json = response.json()
    candidate_text = result_json["candidates"][0]["content"]["parts"][0]["text"].strip()
    data = json.loads(candidate_text)

    return {
        "status": "success",
        "details": data.get("details", "")
    }
