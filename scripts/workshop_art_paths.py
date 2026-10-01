"""Authoring sources live with the world bible; deployed WebP paths stay stable."""
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
ART = PROJECT / 'docs/world/art'
DISPLAY = PROJECT / 'assets/images/magic-workshop/display'
MANIFESTS = ART / 'manifests'


def source(name):
    """Resolve a preserved source filename; fail on missing or ambiguous identity."""
    if Path(name).name != name:
        raise ValueError(f'Expected a source basename: {name}')
    matches = list(ART.rglob(name))
    if len(matches) != 1:
        raise ValueError(f'Expected one world art source for {name}, found {len(matches)}')
    return matches[0]
