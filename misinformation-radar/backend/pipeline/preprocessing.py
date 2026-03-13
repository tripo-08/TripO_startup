import re
import spacy
from spacy.lang.en.stop_words import STOP_WORDS

nlp = spacy.load("en_core_web_sm")


def clean_text(text: str) -> str:
    """Basic preprocessing: remove URLs, HTML, punctuation, stopwords, lemmatize."""
    # remove urls
    text = re.sub(r"https?://\S+", "", text)
    # remove html tags
    text = re.sub(r"<.*?>", "", text)
    # lowercase
    text = text.lower()
    # remove punctuation
    text = re.sub(r"[^a-z0-9\s]", "", text)
    # tokenize with spacy
    doc = nlp(text)
    tokens = [token.lemma_ for token in doc if token.text not in STOP_WORDS and not token.is_space]
    return " ".join(tokens)
