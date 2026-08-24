"""Intent classification: ONNX model + the guard rails it needs.

The model is a TF-IDF + logistic-regression pipeline compiled whole into the
ONNX graph by skl2onnx, so tokenisation and idf weighting happen *inside*
the graph and Python never re-implements vectorisation - it hands over a raw
string and reads back a label.

Two things the original code discarded, both of which matter:

1. The `probabilities` output. Because TF-IDF maps unknown tokens to nothing,
   any out-of-vocabulary input produces an all-zero vector and the model
   returns its class prior at ~0.296 confidence. Gibberish ("asdkjh qwe zxc")
   and Devanagari were both silently classified as ADD with exactly that
   score. Reading the probability lets us tell "no signal" apart from a real
   prediction instead of guessing ADD and then reporting the misleading
   "Couldn't tell what to add."

2. Hindi verb evidence. `hindi.detect_intent` is a high-precision signal - if
   the user said "हटाओ" they mean remove. But it is deliberately *coarse*: it
   resolves the ADD/REMOVE/SEARCH family only. Within the search family the
   model draws the finer SEARCH_ITEM vs SEARCH_FILTER line, because a price
   constraint is a lexical cue the model reads well and a single Hindi verb
   ("ढूंढो" - "find") simply does not encode.
"""
import onnxruntime as ort

import hindi
from datastore import LABELS, data_path

# Below this, the model is not recognising anything - it is echoing its class
# prior. Calibrated by measuring the shipped model rather than guessed:
#
#   out-of-vocabulary input ("asdkjh qwe zxc", "xyzzy", "")  -> exactly 0.296
#   bare product nouns ("milk", "bread", "potatoes")         -> 0.284 - 0.395,
#       and scattered randomly across all four labels, because a lone noun
#       carries no intent evidence at all
#   weakest genuine intent ("find apples")                   -> 0.437
#   typical genuine intent ("add milk", "remove milk")        -> 0.64 - 0.94
#
# 0.42 sits in the empty band between 0.395 and 0.437, so bare nouns fall to
# the ADD fallback (what a shopping app should do with "milk") while real
# search phrasing survives.
CONFIDENCE_FLOOR = 0.42

SEARCH_INTENTS = ("SEARCH_ITEM", "SEARCH_FILTER")
FALLBACK_INTENT = "ADD"


def _family(intent):
    return "SEARCH" if intent in SEARCH_INTENTS else intent


class IntentClassifier:
    def __init__(self, model_file="model.onnx"):
        self.session = ort.InferenceSession(data_path(model_file))
        self.labels = list(LABELS)
        self._input = self.session.get_inputs()[0].name
        self._has_probabilities = len(self.session.get_outputs()) > 1

    def _raw(self, text):
        outputs = self.session.run(None, {self._input: [[text]]})
        label = outputs[0][0]
        if isinstance(label, bytes):
            label = label.decode("utf-8")
        confidence = float(max(outputs[1][0])) if self._has_probabilities else 1.0
        return label, confidence

    def classify(self, text, verb_hint=None, has_item=False):
        """Classify `text`, already normalised to English.

        `verb_hint` is an explicit intent from Hindi verb detection.
        `has_item` says whether entity extraction found a known product, which
        is what makes a low-confidence fallback to ADD reasonable.

        Returns a dict rather than a bare string so callers - and the UI - can
        see the confidence and why the decision was reached.
        """
        result = {
            "intent": FALLBACK_INTENT,
            "confidence": 0.0,
            "source": "model",
            "verb_hint": verb_hint,
            "low_confidence": False,
        }

        if not text or not text.strip():
            result["source"] = "empty"
            result["low_confidence"] = True
            return result

        try:
            label, confidence = self._raw(text)
        except Exception:
            # A broken inference session must not 500 the request; fall back to
            # the verb hint if we have one, otherwise flag low confidence.
            result["intent"] = verb_hint or FALLBACK_INTENT
            result["source"] = "model-error"
            result["low_confidence"] = verb_hint is None
            return result

        result["intent"] = label
        result["confidence"] = confidence

        if verb_hint:
            # Trust the Hindi verb for the family, the model for the detail.
            if _family(verb_hint) == "SEARCH":
                result["intent"] = label if label in SEARCH_INTENTS else verb_hint
                result["source"] = "verb+model" if label in SEARCH_INTENTS else "verb"
            else:
                result["intent"] = verb_hint
                result["source"] = "verb"
            return result

        if confidence < CONFIDENCE_FLOOR:
            result["low_confidence"] = True
            # A recognised product with no clear intent is almost always an
            # add ("milk", "two eggs"). With no product either, we have
            # nothing - say so rather than inventing an ADD.
            if has_item:
                result["intent"] = FALLBACK_INTENT
                result["source"] = "low-confidence-item-fallback"
            else:
                result["source"] = "low-confidence"

        return result


def detect_verb_hint(raw_text):
    """Hindi verb evidence from the *original* transcript, before normalisation
    rewrites it."""
    return hindi.detect_intent((raw_text or "").lower())
