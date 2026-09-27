import json

with open('src/context/LocationContext.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if 'export const PRESET_PLACES = [' in line:
        new_lines.append(line)
        # add existing
        new_lines.append("  { name: 'Pune (Central)', lat: 18.5204, lng: 73.8567 },\n")
        new_lines.append("  { name: 'Hinjawadi, Pune', lat: 18.5913, lng: 73.7389 },\n")
        new_lines.append("  { name: 'Kharadi, Pune', lat: 18.5515, lng: 73.9348 },\n")
        new_lines.append("  { name: 'Baner, Pune', lat: 18.5590, lng: 73.7868 },\n")
        new_lines.append("  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },\n")
        new_lines.append("  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },\n")
        new_lines.append("  { name: 'Delhi', lat: 28.6139, lng: 77.2090 },\n")
        
        # add new
        places = [
            ('Koregaon Park', 18.5362, 73.8939),
            ('Viman Nagar', 18.5679, 73.9143),
            ('Kalyani Nagar', 18.5492, 73.9039),
            ('Aundh', 18.5579, 73.8073),
            ('Wakad', 18.5987, 73.7687),
            ('Kothrud', 18.5074, 73.8077),
            ('Bavdhan', 18.5134, 73.7749),
            ('Pashan', 18.5388, 73.7915),
            ('Balewadi', 18.5713, 73.7732),
            ('Sus', 18.5459, 73.7547),
            ('Shivajinagar', 18.5323, 73.8447),
            ('Deccan Gymkhana', 18.5157, 73.8415),
            ('Camp', 18.5152, 73.8797),
            ('Yerawada', 18.5529, 73.8887),
            ('Vishrantwadi', 18.5670, 73.8770),
            ('Lohegaon', 18.5862, 73.9213),
            ('Dhanori', 18.5878, 73.8943),
            ('Kondhwa', 18.4550, 73.8824),
            ('NIBM', 18.4593, 73.9015),
            ('Katraj', 18.4485, 73.8560),
            ('Warje', 18.4908, 73.8000),
            ('Sinhagad Road', 18.4839, 73.8290),
            ('Dhayari', 18.4468, 73.8077),
            ('Ambegaon', 18.4526, 73.8432),
            ('Pimple Saudagar', 18.5919, 73.8021),
            ('Pimple Nilakh', 18.5779, 73.7937),
            ('Pimpri', 18.6298, 73.7997),
            ('Chinchwad', 18.6323, 73.7844),
            ('Ravet', 18.6475, 73.7441),
            ('Moshi', 18.6657, 73.8444)
        ]
        for name, lat, lng in places:
            new_lines.append(f"  {{ name: '{name}', lat: {lat}, lng: {lng} }},\n")
        
        skip = True
        continue
    
    if skip and '];' in line:
        new_lines.append(line)
        skip = False
        continue
        
    if skip:
        continue
        
    if 'const requestCurrentLocation = useCallback(() => {' in line:
        skip = True
        continue
        
    if skip and '}, [updateLocation]);' in line:
        skip = False
        continue
        
    if 'useEffect(() => {' in line and 'requestCurrentLocation();' in lines[i+1]:
        skip = True
        continue
        
    if skip and '}, [requestCurrentLocation]);' in line:
        skip = False
        continue

    # remove requestCurrentLocation from value exported
    if 'requestCurrentLocation,' in line:
        continue

    new_lines.append(line)

with open('src/context/LocationContext.jsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
