import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replacements
    # next/image
    content = re.sub(r'import\s+Image\s+from\s+[\'"]next/image[\'"];?', 'import Image from "@/app/components/NextImage";', content)
    
    # next/link
    content = re.sub(r'import\s+Link\s+from\s+[\'"]next/link[\'"];?', 'import Link from "@/app/components/NextLink";', content)
    
    # next/navigation
    content = re.sub(r'import\s+\{([^}]+)\}\s+from\s+[\'"]next/navigation[\'"];?', r'import {\1} from "@/app/components/NextNavigation";', content)
    
    # next/router
    content = re.sub(r'import\s+\{([^}]+)\}\s+from\s+[\'"]next/router[\'"];?', r'import {\1} from "@/app/components/NextNavigation";', content)
    
    # next/dynamic
    content = re.sub(r'import\s+dynamic\s+from\s+[\'"]next/dynamic[\'"];?', 'import dynamic from "@/app/components/NextDynamic";', content)

    # next/script
    content = re.sub(r'import\s+Script\s+from\s+[\'"]next/script[\'"];?', 'import Script from "@/app/components/NextScript";', content)

    # next/head
    content = re.sub(r'import\s+Head\s+from\s+[\'"]next/head[\'"];?', 'import Head from "@/app/components/NextHead";', content)

    # removing emojis
    # Note: Regex for emojis can be complex, let's remove common unicode emoji ranges
    # We will skip emojis for now or use a basic replace if we find any. The prompt says "Do not use emojis anywhere in the UI".
    # I'll let a regex run to strip emoji blocks.
    emoji_pattern = re.compile(
        u"(\ud83d[\ude00-\ude4f])|"  # emoticons
        u"(\ud83c[\udf00-\uffff])|"  # symbols & pictographs (1 of 2)
        u"(\ud83d[\u0000-\uddff])|"  # symbols & pictographs (2 of 2)
        u"(\ud83d[\ude80-\udeff])|"  # transport & map symbols
        u"(\ud83c[\udde0-\uddff])"  # flags (iOS)
        "+", flags=re.UNICODE)
    content = emoji_pattern.sub(r'', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, dirs, files in os.walk('artifacts/putko/src/app'):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.tsx') or file.endswith('.js'):
            process_file(os.path.join(root, file))

