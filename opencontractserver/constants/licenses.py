"""
Creative Commons license constants for corpus licensing.

WARNING: This module is imported from models at startup.
It MUST remain free of Django imports (models, apps, etc.) to avoid
AppRegistryNotReady errors during settings loading.
"""

# SPDX identifiers for Creative Commons licenses.
# See https://spdx.org/licenses/ and https://creativecommons.org/licenses/
CC_BY_4 = "CC-BY-4.0"
CC_BY_SA_4 = "CC-BY-SA-4.0"
CC_BY_NC_4 = "CC-BY-NC-4.0"
CC_BY_NC_SA_4 = "CC-BY-NC-SA-4.0"
CC_BY_ND_4 = "CC-BY-ND-4.0"
CC_BY_NC_ND_4 = "CC-BY-NC-ND-4.0"
CC0_1 = "CC0-1.0"
# Sentinel value for user-provided licenses that don't match a standard SPDX identifier.
# Not a real SPDX ID — used to trigger the license_link requirement on Corpus.
CUSTOM = "CUSTOM"

# Django model choices for the Corpus.license field.
LICENSE_CHOICES = [
    ("", "No license selected"),
    (CC_BY_4, "CC BY 4.0 — Attribution"),
    (CC_BY_SA_4, "CC BY-SA 4.0 — Attribution-ShareAlike"),
    (CC_BY_NC_4, "CC BY-NC 4.0 — Attribution-NonCommercial"),
    (CC_BY_NC_SA_4, "CC BY-NC-SA 4.0 — Attribution-NonCommercial-ShareAlike"),
    (CC_BY_ND_4, "CC BY-ND 4.0 — Attribution-NoDerivatives"),
    (CC_BY_NC_ND_4, "CC BY-NC-ND 4.0 — Attribution-NonCommercial-NoDerivatives"),
    (CC0_1, "CC0 1.0 — Public Domain Dedication"),
    (CUSTOM, "Custom License"),
]

# Maximum length of the license SPDX identifier field on the model.
LICENSE_SPDX_MAX_LENGTH = 64

# Maximum length of the custom license link field on the model.
# Exceeds Django URLField's default of 200 to accommodate long license URLs
# (e.g. Creative Commons deed URLs with language/version suffixes).
LICENSE_LINK_MAX_LENGTH = 512
