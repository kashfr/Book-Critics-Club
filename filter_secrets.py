#!/usr/bin/env python3

import re
import sys


def blob_callback(blob_id, blob_contents, callback_metadata):
    # Look for Firebase service account key patterns
    patterns = [
        rb'firebase-adminsdk',
        rb'serviceAccountKey',
        rb'service-account',
        rb'book-critics-club.*firebase',
        rb'private_key',
        rb'firebase.*private',
        rb'627acbac48'
    ]

    for pattern in patterns:
        if re.search(pattern, blob_contents, re.IGNORECASE):
            return None  # Don't include files with these patterns

    return blob_contents


if __name__ == "__main__":
    # This script is meant to be used with git filter-repo
    print("This script is meant to be used with git filter-repo", file=sys.stderr)
    sys.exit(1)
