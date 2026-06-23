import json
import re
import google.generativeai as genai
from config import Config
from services.prompts import get_grammar_check_prompt, get_error_explanation_prompt
from services.utils import parse_gemini_429, align_text_matches

genai.configure(api_key=Config.GEMINI_API_KEY)
model = genai.GenerativeModel(Config.GEMINI_MODEL, generation_config={"response_mime_type": "application/json"})

def check_text_grammar(text, lang='en'):
    """Performs the full grammatical check of a text using Gemini."""
    prompt = get_grammar_check_prompt(text)

    try:
        response = model.generate_content(prompt)
        candidate_text = response.text.strip()
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
    except Exception as e:
        err_str = str(e)
        if "429" in err_str:
            return {'status': 'error', 'is_429': True, 'error_info': {'message': 'Demasiadas peticiones a la API'}}
        if "503" in err_str:
            return {'status': 'error', 'message': "Nuestros servidores de IA están experimentando una altísima demanda en este momento. Por favor, espera un par de minutos y vuelve a intentarlo. 🕒"}
        raise Exception(f"Gemini API returned an error: {err_str}")

def generate_error_explanation(error_segment, message, phenomenon, topic, sentence, replacements):
    """Generates a deep pedagogical explanation for a specific error."""
    prompt = get_error_explanation_prompt(
        error_segment, message, phenomenon, topic, sentence, replacements
    )
    
    try:
        response = model.generate_content(prompt)
        candidate_text = response.text.strip()
        explanation = json.loads(candidate_text)

        return {
            "status": "success",
            "explanation": explanation
        }
    except Exception as e:
        err_str = str(e)
        if "429" in err_str:
            return {'status': 'error', 'is_429': True, 'error_info': {'message': 'Demasiadas peticiones a la API'}}
        if "503" in err_str:
            return {'status': 'error', 'message': "Nuestros servidores de IA están experimentando una altísima demanda en este momento. Por favor, espera un par de minutos y vuelve a intentarlo. 🕒"}
        raise Exception(f"Gemini API returned an error: {err_str}")

def generate_practice_sentences(topic, count=5):
    from services.prompts import get_practice_sentences_prompt
    prompt = get_practice_sentences_prompt(topic, count)
    
    try:
        response = model.generate_content(prompt)
        candidate_text = response.text.strip()
        
        # Eliminar posibles bloques de código markdown que el modelo pueda devolver
        if candidate_text.startswith("```"):
            candidate_text = re.sub(r'^```[a-z]*\n?', '', candidate_text)
            candidate_text = re.sub(r'\n?```$', '', candidate_text).strip()
            
        data = json.loads(candidate_text)

        return {
            "status": "success",
            "sentences": data.get("sentences", [])
        }
    except Exception as e:
        err_str = str(e)
        if "429" in err_str:
            return {'status': 'error', 'is_429': True, 'error_info': {'message': 'Demasiadas peticiones a la API'}}
        if "503" in err_str:
            return {'status': 'error', 'message': "Nuestros servidores de IA están experimentando una altísima demanda en este momento. Por favor, espera un par de minutos y vuelve a intentarlo. 🕒"}
        raise Exception(f"Gemini API returned an error: {err_str}")

def generate_pronunciation_feedback(word, expected_phonemes, actual_phonemes, sentence):
    from services.prompts import get_pronunciation_feedback_prompt
    prompt = get_pronunciation_feedback_prompt(word, expected_phonemes, actual_phonemes, sentence)
    
    try:
        response = model.generate_content(prompt)
        candidate_text = response.text.strip()
        data = json.loads(candidate_text)

        return {
            "status": "success",
            "details": data.get("details", "")
        }
    except Exception as e:
        err_str = str(e)
        if "429" in err_str:
            return {'status': 'error', 'is_429': True, 'error_info': {'message': 'Demasiadas peticiones a la API'}}
        if "503" in err_str:
            return {'status': 'error', 'message': "Nuestros servidores de IA están experimentando una altísima demanda en este momento. Por favor, espera un par de minutos y vuelve a intentarlo. 🕒"}
        raise Exception(f"Gemini API returned an error: {err_str}")
