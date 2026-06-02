import re

def parse_gemini_429(response):
    """
    Analyze a 429 response from Gemini and return a structured error dict.
    """
    try:
        body = response.json()
        details = body.get('error', {}).get('details', [])

        for detail in details:
            if detail.get('@type') == 'type.googleapis.com/google.rpc.QuotaFailure':
                for violation in detail.get('violations', []):
                    quota_id = violation.get('quotaId', '')
                    if 'PerDay' in quota_id or 'FreeTier' in quota_id:
                        return {'errorType': 'quota_exhausted'}

        retry_seconds = None
        for detail in details:
            if detail.get('@type') == 'type.googleapis.com/google.rpc.RetryInfo':
                delay_str = detail.get('retryDelay', '0s')
                seconds = float(delay_str.replace('s', '').strip())
                if seconds > 0:
                    retry_seconds = round(seconds, 1)
                break

        if retry_seconds is not None:
            return {'errorType': 'rate_limit_retry', 'retryAfterSeconds': retry_seconds}

        return {'errorType': 'quota_exhausted'}
    except Exception:
        return {'errorType': 'quota_exhausted'}

def align_text_matches(text, matches):
    """
    Mathematically align offsets and lengths using Python to override Gemini's count estimates.
    """
    for match in matches:
        error_segment = match.get('errorSegment', '').strip()
        sentence = match.get('sentence', '').strip()
        context = match.get('context', '').strip()
        estimated_offset = match.get('offset', 0)
        
        if error_segment:
            pattern = re.escape(error_segment)
            if error_segment[0].isalnum():
                pattern = r'\b' + pattern
            if error_segment[-1].isalnum():
                pattern = pattern + r'\b'
            
            best_offset = None
            
            if context:
                ctx_matches = [m.start() for m in re.finditer(re.escape(context), text, re.IGNORECASE)]
                if ctx_matches:
                    ctx_start = min(ctx_matches, key=lambda x: abs(x - estimated_offset))
                    sub_text = text[ctx_start : ctx_start + len(context)]
                    sub_matches = [m.start() for m in re.finditer(pattern, sub_text, re.IGNORECASE)]
                    if sub_matches:
                        best_offset = min([ctx_start + m_idx for m_idx in sub_matches], key=lambda x: abs(x - estimated_offset))
                        
            if best_offset is None and sentence:
                sent_matches = [m.start() for m in re.finditer(re.escape(sentence), text, re.IGNORECASE)]
                if sent_matches:
                    sent_start = min(sent_matches, key=lambda x: abs(x - estimated_offset))
                    sub_text = text[sent_start : sent_start + len(sentence)]
                    sub_matches = [m.start() for m in re.finditer(pattern, sub_text, re.IGNORECASE)]
                    if sub_matches:
                        best_offset = min([sent_start + m_idx for m_idx in sub_matches], key=lambda x: abs(x - estimated_offset))
                        
            if best_offset is None:
                occurrences = [m.start() for m in re.finditer(pattern, text, re.IGNORECASE)]
                if occurrences:
                    best_offset = min(occurrences, key=lambda x: abs(x - estimated_offset))
                    
            if best_offset is not None:
                match['offset'] = best_offset
                match['errorLength'] = len(error_segment)
    return matches
