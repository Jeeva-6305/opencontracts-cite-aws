"""
Constants for the moderation system.
"""

# Threshold for flagging high moderation activity (actions per hour per action type)
# When any action type exceeds this rate, isAboveThreshold is set to True
MODERATION_HOURLY_RATE_THRESHOLD = 10

# Character count above which user-supplied content embedded in agent prompts
# triggers a warning log.  Longer content has more surface area for prompt
# injection, so we flag it for operators to review if needed.
UNTRUSTED_CONTENT_SIZE_WARNING_THRESHOLD = 1000
