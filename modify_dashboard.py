import re

with open('src/pages/Dashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''title: 'Monitored Region',
      value: (
        <select
          className="bg-transparent font-bold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer text-xl w-full -ml-1"
          value={location ? location.placeName : ''}
          onChange={(e) => {
            const place = PRESET_PLACES.find((p) => p.name === e.target.value);
            if (place) updateLocation(place.lat, place.lng, place.name);
          }}
        >
          {PRESET_PLACES.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      ),'''

content = re.sub(r"title:\s*'Monitored Region',\s*value:[^,]+,", replacement, content)

with open('src/pages/Dashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
