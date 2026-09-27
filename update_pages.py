import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove requestCurrentLocation from useLocationData import/destructure
    content = re.sub(r',\s*requestCurrentLocation', '', content)
    content = re.sub(r'requestCurrentLocation\s*,', '', content)

    # 2. Remove "My Current Location" option block
    option_regex = r'\{location && location\.isUserCurrent && \(\s*<option value="My Current Location">My Current Location</option>\s*\)\}'
    content = re.sub(option_regex, '', content)

    # 3. Remove "Use My GPS" button
    button_regex = r'<button[^>]*onClick=\{requestCurrentLocation\}[^>]*>.*?</button>'
    content = re.sub(button_regex, '', content, flags=re.DOTALL)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

process_file('src/pages/Dashboard.jsx')
process_file('src/pages/GISMap.jsx')
process_file('src/pages/Alerts.jsx')

