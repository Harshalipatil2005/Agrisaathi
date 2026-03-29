// import { useEffect, useState } from 'react';
// import { View, Text, StyleSheet, Platform, TouchableOpacity, TextInput, Modal, Alert, Image, ActivityIndicator } from 'react-native';
// import { useAuth } from '../context/AuthContext';

// const API = 'http://127.0.0.1:8000';

// const CATEGORIES = [
//   { id: 'plastic', label: '🧴 Plastic', color: '#3b82f6' },
//   { id: 'food', label: '🍱 Food waste', color: '#f59e0b' },
//   { id: 'hazardous', label: '☢️ Hazardous', color: '#ef4444' },
//   { id: 'general', label: '🗑️ General', color: '#888' },
// ];

// function WebMap({ token, onReportRequest }: { token: string, onReportRequest: (lat: number, lng: number) => void }) {
//   useEffect(() => {
//     if (Platform.OS !== 'web') return;
//     if ((window as any)._mapInitialized) return;

//     const startMap = async () => {
//       const L = (window as any).L;
//       const map = L.map('map').setView([20.5937, 78.9629], 5);
//       (window as any)._map = map;
//       (window as any)._L = L;
//       (window as any)._userLat = 0;
//       (window as any)._userLng = 0;
//       (window as any)._routeLayer = null;

//       L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//         attribution: '© OpenStreetMap'
//       }).addTo(map);

//       const makeIcon = (emoji: string, size = 28) => L.divIcon({
//         html: `<div style="font-size:${size}px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">${emoji}</div>`,
//         className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2]
//       });

//       navigator.geolocation.getCurrentPosition(async (pos) => {
//         const { latitude: lat, longitude: lng } = pos.coords;
//         (window as any)._userLat = lat;
//         (window as any)._userLng = lng;
//         map.setView([lat, lng], 14);

//         // User location
//         L.marker([lat, lng], { icon: makeIcon('📍', 32) })
//           .addTo(map)
//           .bindPopup('<b>📍 You are here</b>');

//         // Feature 1: AQI heatmap
//         try {
//           const aqiRes = await fetch(`${API}/map/aqi?lat=${lat}&lng=${lng}`, {
//             headers: { Authorization: `Bearer ${token}` }
//           });
//           const aqiData = await aqiRes.json();
//           if (aqiData.results) {
//             aqiData.results.forEach((station: any) => {
//               if (!station.coordinates) return;
//               const val = station.parameters?.[0]?.lastValue || 0;
//               const color = val < 50 ? '#22c55e' : val < 100 ? '#f59e0b' : val < 150 ? '#f97316' : '#ef4444';
//               const label = val < 50 ? 'Good' : val < 100 ? 'Moderate' : val < 150 ? 'Unhealthy' : 'Hazardous';
//               L.circle([station.coordinates.latitude, station.coordinates.longitude], {
//                 color, fillColor: color, fillOpacity: 0.3, radius: 3000, weight: 1.5
//               }).addTo(map).bindPopup(
//                 `<div style="min-width:180px">
//                   <b>🌫️ AQI Station</b><br/>${station.name}<br/>
//                   AQI: <b style="color:${color}">${Math.round(val)} — ${label}</b><br/>
//                   <small>Source: OpenAQ</small>
//                 </div>`
//               );
//             });
//           }
//         } catch (e) { console.log('AQI error:', e); }

//         // Feature 2: Water quality zones
//         try {
//           const wRes = await fetch(`${API}/map/aqi?lat=${lat}&lng=${lng}`, {
//             headers: { Authorization: `Bearer ${token}` }
//           });
//           const wData = await wRes.json();
//           if (wData.results) {
//             wData.results.slice(0, 3).forEach((s: any, i: number) => {
//               if (!s.coordinates) return;
//               const offset = (i + 1) * 0.012;
//               L.circle([s.coordinates.latitude + offset, s.coordinates.longitude], {
//                 color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.18,
//                 radius: 1500, weight: 1, dashArray: '4,4'
//               }).addTo(map).bindPopup(
//                 `<div style="min-width:180px">
//                   <b>💧 Water Quality Zone</b><br/>Near ${s.name}<br/>
//                   Status: <b style="color:#3b82f6">Monitoring Active</b>
//                 </div>`
//               );
//             });
//           }
//         } catch (e) { console.log('Water error:', e); }

//         // Feature 3: Waste report pins
//         try {
//           const repRes = await fetch(`${API}/reports/`, {
//             headers: { Authorization: `Bearer ${token}` }
//           });
//           const reports = await repRes.json();
//           if (Array.isArray(reports)) {
//             reports.forEach((r: any) => {
//               if (!r.location?.lat || !r.location?.lng) return;
//               const statusColor = r.status === 'resolved' ? '#22c55e' : r.status === 'approved' ? '#3b82f6' : '#f59e0b';
//               const catIcon = r.category === 'plastic' ? '🧴' : r.category === 'hazardous' ? '☢️' : r.category === 'food' ? '🍱' : '🗑️';
//               L.marker([r.location.lat, r.location.lng], { icon: makeIcon(catIcon) })
//                 .addTo(map)
//                 .bindPopup(
//                   `<div style="min-width:180px">
//                     <b>${catIcon} ${r.title}</b><br/>
//                     Category: ${r.category || 'general'}<br/>
//                     Status: <b style="color:${statusColor}">${r.status}</b><br/>
//                     ${r.description || ''}
//                   </div>`
//                 );
//             });
//           }
//         } catch (e) { console.log('Reports error:', e); }

//         // Feature 4: Crowd density heatmap
//         const crowdZones = [
//           { lat: lat + 0.008, lng: lng + 0.006, density: 0.9, name: 'Market Area', crowd: 'Very High' },
//           { lat: lat - 0.006, lng: lng + 0.012, density: 0.5, name: 'Park Zone', crowd: 'Moderate' },
//           { lat: lat + 0.014, lng: lng - 0.008, density: 0.3, name: 'Residential', crowd: 'Low' },
//           { lat: lat - 0.012, lng: lng - 0.010, density: 0.8, name: 'Bus Stand', crowd: 'High' },
//           { lat: lat + 0.002, lng: lng + 0.018, density: 0.6, name: 'Temple Area', crowd: 'Moderate-High' },
//         ];
//         crowdZones.forEach(z => {
//           const color = z.density > 0.7 ? '#ef4444' : z.density > 0.4 ? '#f59e0b' : '#22c55e';
//           const wasteRisk = z.density > 0.7 ? 'High waste risk' : z.density > 0.4 ? 'Moderate' : 'Low';
//           L.circle([z.lat, z.lng], {
//             color, fillColor: color,
//             fillOpacity: 0.15 + z.density * 0.15,
//             radius: 600 + z.density * 600, weight: 1
//           }).addTo(map).bindPopup(
//             `<div style="min-width:180px">
//               <b>👥 ${z.name}</b><br/>
//               Density: <b style="color:${color}">${z.crowd}</b><br/>
//               Waste prediction: <b>${wasteRisk}</b><br/>
//               <small>Based on historical patterns</small>
//             </div>`
//           );
//         });

//         // Feature 5: Eco points with Get Route
//         const ecoPoints = [
//           { lat: lat + 0.018, lng: lng + 0.020, icon: '♻️', name: 'Recycling Center', desc: 'Drop off recyclables', dist: '2.1 km' },
//           { lat: lat - 0.015, lng: lng + 0.025, icon: '🌳', name: 'Community Garden', desc: 'Join local gardening', dist: '2.8 km' },
//           { lat: lat + 0.025, lng: lng - 0.015, icon: '⚡', name: 'EV Charging Station', desc: 'Electric vehicle charging', dist: '3.2 km' },
//           { lat: lat - 0.020, lng: lng - 0.022, icon: '🚰', name: 'Clean Water Station', desc: 'Safe drinking water', dist: '1.8 km' },
//           { lat: lat + 0.010, lng: lng - 0.030, icon: '🚻', name: 'Public Toilet', desc: 'Sanitation facility', dist: '1.2 km' },
//           { lat: lat - 0.005, lng: lng + 0.035, icon: '🌿', name: 'Eco Vendor', desc: 'Zero waste food stall', dist: '3.5 km' },
//         ];
//         ecoPoints.forEach(p => {
//           L.marker([p.lat, p.lng], { icon: makeIcon(p.icon) })
//             .addTo(map)
//             .bindPopup(
//               `<div style="min-width:200px">
//                 <b>${p.icon} ${p.name}</b><br/>
//                 ${p.desc}<br/>Distance: <b>${p.dist}</b><br/>
//                 <button onclick="window.getRoute(${p.lat}, ${p.lng}, '${p.name}')"
//                   style="margin-top:8px;padding:5px 12px;background:#22c55e;color:white;border:none;
//                   border-radius:8px;cursor:pointer;font-size:12px;font-weight:bold;width:100%">
//                   🗺️ Get Walking Route
//                 </button>
//               </div>`
//             );
//         });

//         // Feature 6: Sustainability score zones
//         const scoreZones = [
//           { lat: lat + 0.035, lng: lng + 0.035, score: 82, name: 'North Zone', aqi: 35, waste: 'Low', crowd: 'Low' },
//           { lat: lat - 0.035, lng: lng - 0.035, score: 38, name: 'South Zone', aqi: 145, waste: 'High', crowd: 'High' },
//           { lat: lat + 0.035, lng: lng - 0.035, score: 65, name: 'West Zone', aqi: 72, waste: 'Medium', crowd: 'Medium' },
//           { lat: lat - 0.035, lng: lng + 0.035, score: 24, name: 'East Zone', aqi: 180, waste: 'Very High', crowd: 'Very High' },
//           { lat: lat, lng: lng + 0.048, score: 71, name: 'Central Zone', aqi: 55, waste: 'Low', crowd: 'High' },
//         ];
//         scoreZones.forEach(z => {
//           const color = z.score > 70 ? '#22c55e' : z.score > 40 ? '#f59e0b' : '#ef4444';
//           const status = z.score > 70 ? 'Green' : z.score > 40 ? 'Moderate' : 'Critical';
//           const emoji = z.score > 70 ? '🟢' : z.score > 40 ? '🟡' : '🔴';
//           L.circle([z.lat, z.lng], {
//             color, fillColor: color, fillOpacity: 0.12,
//             radius: 2200, weight: 2, dashArray: '8,5'
//           }).addTo(map).bindPopup(
//             `<div style="min-width:210px">
//               <b>${emoji} ${z.name}</b><br/>
//               <span style="font-size:20px;color:${color}"><b>${z.score}/100</b></span> — <b>${status}</b><br/>
//               <hr style="margin:5px 0;border-color:#ddd"/>
//               🌫️ AQI: <b>${z.aqi}</b> &nbsp;|&nbsp; 🗑️ Waste: <b>${z.waste}</b><br/>
//               👥 Crowd: <b>${z.crowd}</b>
//             </div>`
//           );
//         });

//         // Feature 8: Smart walking route via backend
//         (window as any).getRoute = async (destLat: number, destLng: number, name: string) => {
//           const userLat = (window as any)._userLat;
//           const userLng = (window as any)._userLng;

//           if ((window as any)._routeLayer) {
//             map.removeLayer((window as any)._routeLayer);
//             (window as any)._routeLayer = null;
//           }

//           L.popup()
//             .setLatLng([destLat, destLng])
//             .setContent('<b>🔄 Calculating route...</b>')
//             .openOn(map);

//           try {
//             const routeRes = await fetch(
//               `${API}/map/route?startLng=${userLng}&startLat=${userLat}&endLng=${destLng}&endLat=${destLat}`,
//               { headers: { Authorization: `Bearer ${token}` } }
//             );
//             const routeData = await routeRes.json();
//             const coords = routeData.features?.[0]?.geometry?.coordinates;

//             if (coords && coords.length > 0) {
//               const latlngs = coords.map((c: any) => [c[1], c[0]]);
//               const routeLayer = L.polyline(latlngs, {
//                 color: '#22c55e', weight: 5, opacity: 0.85, dashArray: '10,5'
//               }).addTo(map);
//               (window as any)._routeLayer = routeLayer;

//               const seg = routeData.features[0].properties.segments[0];
//               const km = (seg.distance / 1000).toFixed(1);
//               const mins = Math.round(seg.duration / 60);

//               routeLayer.bindPopup(
//                 `<div style="min-width:180px">
//                   <b>🟢 Route to ${name}</b><br/>
//                   📏 Distance: <b>${km} km</b><br/>
//                   ⏱️ Walking: <b>${mins} mins</b><br/>
//                   <small style="color:#22c55e">Least polluted path</small><br/>
//                   <button onclick="window._map.removeLayer(window._routeLayer);window._routeLayer=null;"
//                     style="margin-top:6px;padding:4px 10px;background:#ef4444;color:white;
//                     border:none;border-radius:6px;cursor:pointer;font-size:12px">
//                     ✕ Clear Route
//                   </button>
//                 </div>`
//               ).openPopup();

//               map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
//             } else {
//               map.closePopup();
//               alert('Could not calculate route to ' + name);
//             }
//           } catch (e) {
//             console.log('Route error:', e);
//             map.closePopup();
//             alert('Route failed. Check ORS_API_KEY in backend .env');
//           }
//         };

//         // Click map to report waste
//         map.on('click', (e: any) => {
//           L.popup()
//             .setLatLng(e.latlng)
//             .setContent(
//               `<div style="min-width:190px">
//                 <b>🗑️ Report waste here?</b><br/>
//                 <small style="color:#888">${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}</small><br/>
//                 <button onclick="window._onReportRequest(${e.latlng.lat}, ${e.latlng.lng})"
//                   style="margin-top:8px;padding:7px 16px;background:#ef4444;color:white;border:none;
//                   border-radius:8px;cursor:pointer;font-size:13px;font-weight:bold;width:100%">
//                   🚨 Report Waste Here
//                 </button>
//               </div>`
//             )
//             .openOn(map);
//         });

//         // Bridge: Leaflet button → React Native modal
//         (window as any)._onReportRequest = (lat: number, lng: number) => {
//           onReportRequest(lat, lng);
//           map.closePopup();
//         };

//       }, (err) => {
//         console.log('Geolocation error:', err);
//       });
//     }; // end startMap

//     // Poll every 50ms until div#map exists, then initialize
//     const tryInit = setInterval(() => {
//       if (!document.getElementById('map')) return;
//       clearInterval(tryInit);
//       (window as any)._mapInitialized = true;

//       const link = document.createElement('link');
//       link.rel = 'stylesheet';
//       link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
//       document.head.appendChild(link);

//       if (document.getElementById('leaflet-script')) {
//         startMap();
//         return;
//       }

//       const script = document.createElement('script');
//       script.id = 'leaflet-script';
//       script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
//       script.onload = startMap;
//       document.head.appendChild(script);
//     }, 50);

//     return () => clearInterval(tryInit);
//   }, []);

//   return (
//     <div style={{ width: '100%', height: '100%', position: 'relative' }}>
//       <div id="map" style={{ width: '100%', height: '100%' }} />
//       <div style={{
//         position: 'absolute', bottom: 20, right: 10, zIndex: 1000,
//         background: 'rgba(15,15,15,0.92)', borderRadius: 12, padding: '10px 14px',
//         fontSize: 11, color: '#fff', border: '1px solid #333', maxWidth: 170, lineHeight: '1.8'
//       }}>
//         <div style={{ fontWeight: 'bold', marginBottom: 5, color: '#22c55e', fontSize: 12 }}>Map Layers</div>
//         <div>🟢 Green zone (70+)</div>
//         <div>🟡 Moderate (40–70)</div>
//         <div>🔴 Critical (&lt;40)</div>
//         <div style={{ marginTop: 5, borderTop: '1px solid #333', paddingTop: 5, color: '#aaa' }}>
//           <div>Filled = AQI / crowd</div>
//           <div>Dashed = score zones</div>
//           <div>Click map = report</div>
//           <div>Click ♻️ = get route</div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default function MapScreen() {
//   const { user, loading, getValidToken } = useAuth();
//   const [token, setToken] = useState('');
//   const [selectedImage, setSelectedImage] = useState<string | null>(null);
//   const [analyzing, setAnalyzing] = useState(false);
//   const [reportModal, setReportModal] = useState(false);
//   const [reportLat, setReportLat] = useState(0);
//   const [reportLng, setReportLng] = useState(0);
//   const [title, setTitle] = useState('');
//   const [description, setDescription] = useState('');
//   const [category, setCategory] = useState('general');
//   const [submitting, setSubmitting] = useState(false);

//   useEffect(() => {
//     getValidToken().then(t => { if (t) setToken(t); });
//   }, []);

//   if (loading) {
//     return (
//       <View style={{ flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', alignItems: 'center' }}>
//         <ActivityIndicator color="#22c55e" size="large" />
//         <Text style={{ color: '#22c55e', marginTop: 12 }}>Loading map...</Text>
//       </View>
//     );
//   }

//   const handleReportRequest = (lat: number, lng: number) => {
//     setReportLat(lat);
//     setReportLng(lng);
//     setTitle('');
//     setDescription('');
//     setCategory('general');
//     setSelectedImage(null);
//     setReportModal(true);
//   };

//   const pickAndAnalyzeImage = () => {
//     if (Platform.OS !== 'web') return;
//     const input = document.createElement('input');
//     input.type = 'file';
//     input.accept = 'image/*';
//     input.onchange = async (e: any) => {
//       const file = e.target.files[0];
//       if (!file) return;

//       const reader = new FileReader();
//       reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
//       reader.readAsDataURL(file);

//       setAnalyzing(true);
//       try {
//         const freshToken = await getValidToken();
//         const formData = new FormData();
//         formData.append('file', file);

//         const res = await fetch(`${API}/vision/analyze`, {
//           method: 'POST',
//           headers: { Authorization: `Bearer ${freshToken}` },
//           body: formData
//         });

//         const result = await res.json();
//         console.log('Vision result:', result);

//         if (result.detected) {
//           setTitle(result.title || '');
//           setDescription(result.description || '');
//           setCategory(result.category || 'general');
//           Alert.alert(
//             '🤖 AI Detected!',
//             `Type: ${result.category}\nSeverity: ${result.severity}\n\nFields auto-filled!`
//           );
//         } else {
//           Alert.alert('No waste detected', 'Please fill in manually.');
//         }
//       } catch (err) {
//         console.log('Vision error:', err);
//         Alert.alert('Analysis failed', 'Fill in manually.');
//       } finally {
//         setAnalyzing(false);
//       }
//     };
//     input.click();
//   };

//   const submitReport = async () => {
//     if (!title.trim()) { Alert.alert('Please enter a title'); return; }
//     setSubmitting(true);
//     try {
//       const freshToken = await getValidToken();
//       const res = await fetch(`${API}/reports/`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${freshToken}`
//         },
//         body: JSON.stringify({
//           title, description, category,
//           location: { lat: reportLat, lng: reportLng },
//           data: { reported_via: 'map_click' }
//         })
//       });
//       if (res.ok) {
//         Alert.alert('✅ Reported!', 'Waste report submitted! Refresh map to see your pin.');
//         setReportModal(false);
//         setSelectedImage(null);
//       } else {
//         const err = await res.json();
//         Alert.alert('Error', JSON.stringify(err.detail || err));
//       }
//     } catch (e) {
//       Alert.alert('Error', 'Network error. Is the backend running?');
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.headerText}>🗺️ Smart Eco Map</Text>
//         <Text style={styles.headerSub}>AQI • Reports • Crowd • Routes • AI Vision</Text>
//       </View>

//       <View style={styles.mapContainer}>
//         {Platform.OS === 'web'
//           ? <WebMap token={token} onReportRequest={handleReportRequest} />
//           : (
//             <View style={styles.placeholder}>
//               <Text style={styles.placeholderText}>Map available on web version</Text>
//             </View>
//           )}
//       </View>

//       <Modal
//         visible={reportModal}
//         transparent
//         animationType="slide"
//         onRequestClose={() => setReportModal(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalSheet}>
//             <View style={styles.modalHandle} />
//             <Text style={styles.modalTitle}>🗑️ Report Waste</Text>
//             <Text style={styles.modalCoords}>📍 {reportLat.toFixed(5)}, {reportLng.toFixed(5)}</Text>

//             <TouchableOpacity style={styles.imageUploadBtn} onPress={pickAndAnalyzeImage} disabled={analyzing}>
//               <Text style={styles.imageUploadText}>
//                 {analyzing ? '🤖 AI Analyzing...' : '📷 Upload Photo — AI auto-detects waste'}
//               </Text>
//             </TouchableOpacity>

//             {analyzing && (
//               <View style={{ alignItems: 'center', marginBottom: 8 }}>
//                 <ActivityIndicator color="#22c55e" />
//                 <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>Analyzing with AI...</Text>
//               </View>
//             )}

//             {selectedImage && (
//               <View style={styles.imagePreview}>
//                 <Image source={{ uri: selectedImage }} style={{ width: '100%', height: 130, borderRadius: 8 }} resizeMode="cover" />
//                 <TouchableOpacity style={styles.removeImage} onPress={() => setSelectedImage(null)}>
//                   <Text style={{ color: '#fff', fontSize: 11 }}>✕ Remove</Text>
//                 </TouchableOpacity>
//               </View>
//             )}

//             <Text style={styles.label}>Title *</Text>
//             <TextInput
//               style={styles.input}
//               placeholder="e.g. Garbage pile near river"
//               placeholderTextColor="#555"
//               value={title}
//               onChangeText={setTitle}
//             />

//             <Text style={styles.label}>Category</Text>
//             <View style={styles.chips}>
//               {CATEGORIES.map(c => (
//                 <TouchableOpacity
//                   key={c.id}
//                   style={[styles.chip, category === c.id && { backgroundColor: c.color, borderColor: c.color }]}
//                   onPress={() => setCategory(c.id)}
//                 >
//                   <Text style={[styles.chipText, category === c.id && { color: '#fff' }]}>{c.label}</Text>
//                 </TouchableOpacity>
//               ))}
//             </View>

//             <Text style={styles.label}>Description</Text>
//             <TextInput
//               style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
//               placeholder="Describe the waste situation..."
//               placeholderTextColor="#555"
//               value={description}
//               onChangeText={setDescription}
//               multiline
//             />

//             <View style={styles.modalButtons}>
//               <TouchableOpacity style={styles.cancelBtn} onPress={() => { setReportModal(false); setSelectedImage(null); }}>
//                 <Text style={styles.cancelText}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity style={styles.submitBtn} onPress={submitReport} disabled={submitting}>
//                 <Text style={styles.submitText}>{submitting ? 'Submitting...' : '🚨 Submit Report'}</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#0f0f0f' },
//   header: { backgroundColor: '#1a1a1a', padding: 16, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#333' },
//   headerText: { fontSize: 20, fontWeight: 'bold', color: '#22c55e' },
//   headerSub: { fontSize: 11, color: '#888', marginTop: 2 },
//   mapContainer: { flex: 1 },
//   placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   placeholderText: { color: '#888', fontSize: 16 },
//   modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
//   modalSheet: {
//     backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
//     padding: 22, paddingBottom: 38, borderTopWidth: 1, borderTopColor: '#333'
//   },
//   modalHandle: { width: 40, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
//   modalTitle: { fontSize: 21, fontWeight: 'bold', color: '#ef4444', marginBottom: 3 },
//   modalCoords: { fontSize: 12, color: '#888', marginBottom: 12 },
//   imageUploadBtn: {
//     borderWidth: 1.5, borderColor: '#22c55e', borderStyle: 'dashed',
//     borderRadius: 10, padding: 13, alignItems: 'center', marginBottom: 10,
//     backgroundColor: 'rgba(34,197,94,0.05)'
//   },
//   imageUploadText: { color: '#22c55e', fontSize: 13, fontWeight: '600' },
//   imagePreview: { borderRadius: 8, overflow: 'hidden', marginBottom: 10, position: 'relative' },
//   removeImage: {
//     position: 'absolute', top: 6, right: 6,
//     backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4
//   },
//   label: { color: '#888', fontSize: 13, marginBottom: 6, marginTop: 10 },
//   input: { backgroundColor: '#0f0f0f', color: '#fff', borderRadius: 10, padding: 11, fontSize: 14, borderWidth: 1, borderColor: '#333' },
//   chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
//   chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#333', backgroundColor: '#0f0f0f' },
//   chipText: { color: '#888', fontSize: 12 },
//   modalButtons: { flexDirection: 'row', gap: 12, marginTop: 18 },
//   cancelBtn: { flex: 1, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
//   cancelText: { color: '#888', fontSize: 15 },
//   submitBtn: { flex: 2, backgroundColor: '#ef4444', padding: 13, borderRadius: 12, alignItems: 'center' },
//   submitText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
// });

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, TextInput, Modal, Alert, Image, ActivityIndicator, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useT } from '../hooks/useT';

const API = 'http://127.0.0.1:8000';

const CATEGORIES = [
  { id: 'plastic', label: '🧴 Plastic', color: '#3b82f6' },
  { id: 'food', label: '🍱 Food waste', color: '#f59e0b' },
  { id: 'hazardous', label: '☢️ Hazardous', color: '#ef4444' },
  { id: 'general', label: '🗑️ General', color: '#888' },
];

const LAYERS = [
  { id: 'aqi', label: '🌫️ AQI', color: '#f97316' },
  { id: 'crowd', label: '👥 Crowd', color: '#8b5cf6' },
  { id: 'waste', label: '🗑️ Waste', color: '#ef4444' },
  { id: 'eco', label: '♻️ Eco Points', color: '#22c55e' },
  { id: 'score', label: '📊 Score Zones', color: '#3b82f6' },
  { id: 'reports', label: '📍 Reports', color: '#f59e0b' },
];

// Helper: always get the freshest token from window
const getT = () => (window as any)._currentToken || '';

function WebMap({ onReportRequest }: {
  onReportRequest: (lat: number, lng: number) => void
}) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if ((window as any)._mapInitialized) return;

    const startMap = async () => {
      const L = (window as any).L;
      const map = L.map('map', { zoomControl: true }).setView([20.5937, 78.9629], 5);
      (window as any)._map = map;
      (window as any)._L = L;
      (window as any)._userLat = 0;
      (window as any)._userLng = 0;
      (window as any)._routeLayer = null;

      const layerGroups: Record<string, any> = {
        aqi: L.layerGroup().addTo(map),
        crowd: L.layerGroup().addTo(map),
        waste: L.layerGroup().addTo(map),
        eco: L.layerGroup().addTo(map),
        score: L.layerGroup().addTo(map),
        reports: L.layerGroup().addTo(map),
      };
      (window as any)._layerGroups = layerGroups;

      (window as any).toggleLayer = (id: string, visible: boolean) => {
        if (visible) map.addLayer(layerGroups[id]);
        else map.removeLayer(layerGroups[id]);
      };

      (window as any).focusLayer = (id: string | null) => {
        Object.keys(layerGroups).forEach(key => {
          if (id === null || key === id) map.addLayer(layerGroups[key]);
          else map.removeLayer(layerGroups[key]);
        });
      };

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map);

      const makePin = (emoji: string, size = 28) => L.divIcon({
        html: `<div style="font-size:${size}px;line-height:1;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5))">${emoji}</div>`,
        className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2]
      });

      const severityColor = (level: 'low' | 'medium' | 'high' | 'critical') => ({
        low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444'
      }[level]);

      const getSeverity = (val: number) =>
        val < 50 ? 'low' : val < 100 ? 'medium' : val < 150 ? 'high' : 'critical';

      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        (window as any)._userLat = lat;
        (window as any)._userLng = lng;
        map.setView([lat, lng], 14);

        L.marker([lat, lng], { icon: makePin('📍', 36) })
          .addTo(map)
          .bindPopup('<b>📍 You are here</b>');

        // AQI layer
        try {
          const aqiRes = await fetch(`${API}/map/aqi?lat=${lat}&lng=${lng}`, {
            headers: { Authorization: `Bearer ${getT()}` }
          });
          const aqiData = await aqiRes.json();
          if (aqiData.results) {
            aqiData.results.forEach((station: any) => {
              if (!station.coordinates) return;
              const val = station.parameters?.[0]?.lastValue || 0;
              const sev = getSeverity(val);
              const color = severityColor(sev);
              const label = { low: 'Good', medium: 'Moderate', high: 'Unhealthy', critical: 'Hazardous' }[sev];
              const circle = L.circle(
                [station.coordinates.latitude, station.coordinates.longitude],
                { color, fillColor: color, fillOpacity: 0.25, radius: 2500, weight: 1.5 }
              ).bindPopup(
                `<div style="min-width:180px">
                  <b>🌫️ AQI Station</b><br/><b>${station.name}</b><br/>
                  Severity: <b style="color:${color}">${label}</b><br/>
                  Value: <b>${Math.round(val)} µg/m³</b>
                </div>`
              );
              layerGroups.aqi.addLayer(circle);
            });
          }
        } catch (e) { console.log('AQI error:', e); }

        // Crowd layer
        const crowdZones = [
          { lat: lat + 0.008, lng: lng + 0.006, density: 0.9, name: 'Market Area' },
          { lat: lat - 0.006, lng: lng + 0.012, density: 0.5, name: 'Park Zone' },
          { lat: lat + 0.014, lng: lng - 0.008, density: 0.2, name: 'Residential' },
          { lat: lat - 0.012, lng: lng - 0.010, density: 0.8, name: 'Bus Stand' },
          { lat: lat + 0.002, lng: lng + 0.018, density: 0.6, name: 'Temple Area' },
        ];
        crowdZones.forEach(z => {
          const sev = z.density > 0.7 ? 'critical' : z.density > 0.5 ? 'high' : z.density > 0.3 ? 'medium' : 'low';
          const color = severityColor(sev);
          const label = { low: 'Low', medium: 'Moderate', high: 'High', critical: 'Very High' }[sev];
          layerGroups.crowd.addLayer(
            L.circle([z.lat, z.lng], {
              color, fillColor: color, fillOpacity: 0.18,
              radius: 400 + z.density * 400, weight: 2,
            }).bindPopup(
              `<div style="min-width:170px">
                <b>👥 Crowd Zone</b><br/><b>${z.name}</b><br/>
                Density: <b style="color:${color}">${label}</b><br/>
                Waste risk: <b style="color:${color}">${label}</b>
              </div>`
            ).bindTooltip(`👥 ${z.name} — ${label}`, { sticky: true })
          );
        });

        // Score zones
        const scoreZones = [
          { lat: lat + 0.035, lng: lng + 0.035, score: 82, name: 'North Zone', aqi: 35, waste: 'Low', crowd: 'Low' },
          { lat: lat - 0.035, lng: lng - 0.035, score: 38, name: 'South Zone', aqi: 145, waste: 'High', crowd: 'High' },
          { lat: lat + 0.035, lng: lng - 0.035, score: 65, name: 'West Zone', aqi: 72, waste: 'Medium', crowd: 'Medium' },
          { lat: lat - 0.035, lng: lng + 0.035, score: 24, name: 'East Zone', aqi: 180, waste: 'Very High', crowd: 'Very High' },
          { lat: lat, lng: lng + 0.048, score: 71, name: 'Central Zone', aqi: 55, waste: 'Low', crowd: 'High' },
        ];
        scoreZones.forEach(z => {
          const sev = z.score > 70 ? 'low' : z.score > 40 ? 'medium' : 'critical';
          const color = severityColor(sev);
          const status = { low: 'Green', medium: 'Moderate', critical: 'Critical' }[sev];
          const emoji = { low: '🟢', medium: '🟡', critical: '🔴' }[sev];
          layerGroups.score.addLayer(
            L.circle([z.lat, z.lng], {
              color, fillColor: color, fillOpacity: 0.08,
              radius: 2000, weight: 2, dashArray: '10,6'
            }).bindPopup(
              `<div style="min-width:200px">
                <b>${emoji} ${z.name}</b><br/>
                Score: <span style="font-size:18px;color:${color}"><b>${z.score}/100</b></span> — <b>${status}</b><br/>
                <hr style="margin:5px 0"/>
                🌫️ AQI: <b>${z.aqi}</b> | 🗑️ Waste: <b>${z.waste}</b><br/>
                👥 Crowd: <b>${z.crowd}</b>
              </div>`
            ).bindTooltip(`${emoji} ${z.name}: ${z.score}/100`, { sticky: true })
          );
        });

        // Eco points
        const ecoPoints = [
          { lat: lat + 0.018, lng: lng + 0.020, icon: '♻️', name: 'Recycling Center', desc: 'Drop off recyclables', dist: '2.1 km' },
          { lat: lat - 0.015, lng: lng + 0.025, icon: '🌳', name: 'Community Garden', desc: 'Join local gardening', dist: '2.8 km' },
          { lat: lat + 0.025, lng: lng - 0.015, icon: '⚡', name: 'EV Charging Station', desc: 'Electric vehicle charging', dist: '3.2 km' },
          { lat: lat - 0.020, lng: lng - 0.022, icon: '🚰', name: 'Clean Water Station', desc: 'Safe drinking water', dist: '1.8 km' },
          { lat: lat + 0.010, lng: lng - 0.030, icon: '🚻', name: 'Public Toilet', desc: 'Sanitation facility', dist: '1.2 km' },
          { lat: lat - 0.005, lng: lng + 0.035, icon: '🌿', name: 'Eco Vendor', desc: 'Zero waste food stall', dist: '3.5 km' },
        ];
        ecoPoints.forEach(p => {
          layerGroups.eco.addLayer(
            L.marker([p.lat, p.lng], { icon: makePin(p.icon) })
              .bindPopup(
                `<div style="min-width:200px">
                  <b>${p.icon} ${p.name}</b><br/>
                  ${p.desc}<br/>Distance: <b>${p.dist}</b><br/>
                  <button onclick="window.getRoute(${p.lat}, ${p.lng}, '${p.name}')"
                    style="margin-top:8px;padding:6px 0;background:#22c55e;color:white;border:none;
                    border-radius:8px;cursor:pointer;font-size:13px;font-weight:bold;width:100%">
                    🗺️ Get Walking Route
                  </button>
                </div>`
              ).bindTooltip(p.name, { sticky: true })
          );
        });

        // Reports layer
        try {
          const repRes = await fetch(`${API}/reports/`, {
            headers: { Authorization: `Bearer ${getT()}` }
          });
          const reports = await repRes.json();
          if (Array.isArray(reports)) {
            reports.forEach((r: any) => {
              if (!r.location?.lat || !r.location?.lng) return;
              const catIcon = r.category === 'plastic' ? '🧴' : r.category === 'hazardous' ? '☢️' : r.category === 'food' ? '🍱' : '🗑️';
              const statusColor = r.status === 'resolved' ? '#22c55e' : r.status === 'approved' ? '#3b82f6' : '#f59e0b';
              const squareIcon = L.divIcon({
                html: `<div style="width:28px;height:28px;background:${statusColor};border-radius:6px;
                  display:flex;align-items:center;justify-content:center;
                  font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,0.4)">${catIcon}</div>`,
                className: '', iconSize: [28, 28], iconAnchor: [14, 14]
              });
              layerGroups.reports.addLayer(
                L.marker([r.location.lat, r.location.lng], { icon: squareIcon })
                  .bindPopup(
                    `<div style="min-width:180px">
                      <b>${catIcon} ${r.title}</b><br/>
                      Category: ${r.category || 'general'}<br/>
                      Status: <b style="color:${statusColor}">${r.status}</b><br/>
                      ${r.description || ''}
                    </div>`
                  ).bindTooltip(`${catIcon} ${r.title}`, { sticky: true })
              );
            });
          }
        } catch (e) { console.log('Reports error:', e); }

        // Smart route — always uses fresh token via getT()
        (window as any).getRoute = async (destLat: number, destLng: number, name: string) => {
          const userLat = (window as any)._userLat;
          const userLng = (window as any)._userLng;

          if ((window as any)._routeLayer) {
            map.removeLayer((window as any)._routeLayer);
            (window as any)._routeLayer = null;
          }

          L.popup().setLatLng([destLat, destLng])
            .setContent('<b>🔄 Calculating route...</b>')
            .openOn(map);

          try {
            const freshToken = getT(); // always fresh from window
            console.log('Using token for route:', freshToken ? freshToken.slice(0, 20) + '...' : 'EMPTY');

            const routeRes = await fetch(
              `${API}/map/route?startLng=${userLng}&startLat=${userLat}&endLng=${destLng}&endLat=${destLat}`,
              { headers: { Authorization: `Bearer ${freshToken}` } }
            );

            console.log('Route status:', routeRes.status);
            const routeData = await routeRes.json();
            const coords = routeData.features?.[0]?.geometry?.coordinates;

            if (coords?.length > 0) {
              const latlngs = coords.map((c: any) => [c[1], c[0]]);
              const routeLayer = L.polyline(latlngs, {
                color: '#3b82f6', weight: 7, opacity: 0.9,
              }).addTo(map);
              const animLayer = L.polyline(latlngs, {
                color: '#fff', weight: 3, opacity: 0.6, dashArray: '12,18'
              }).addTo(map);

              (window as any)._routeLayer = L.layerGroup([routeLayer, animLayer]);

              const seg = routeData.features[0].properties.segments[0];
              const km = (seg.distance / 1000).toFixed(1);
              const mins = Math.round(seg.duration / 60);

              routeLayer.bindPopup(
                `<div style="min-width:190px">
                  <b>🔵 Route to ${name}</b><br/>
                  📏 <b>${km} km</b> | ⏱️ <b>${mins} min walk</b><br/>
                  <small style="color:#3b82f6">Least polluted path</small><br/>
                  <button onclick="window._clearRoute()"
                    style="margin-top:6px;padding:5px 12px;background:#ef4444;color:white;
                    border:none;border-radius:6px;cursor:pointer;font-size:12px">
                    ✕ Clear Route
                  </button>
                </div>`
              ).openPopup();
              map.fitBounds(routeLayer.getBounds(), { padding: [60, 60] });
            } else {
              map.closePopup();
              alert('Could not calculate route to ' + name + '. Status: ' + routeRes.status);
            }
          } catch (e) {
            console.log('Route error:', e);
            map.closePopup();
            alert('Route request failed. Check console.');
          }
        };

        (window as any)._clearRoute = () => {
          if ((window as any)._routeLayer) {
            map.removeLayer((window as any)._routeLayer);
            (window as any)._routeLayer = null;
          }
        };

        // Click to report
        map.on('click', (e: any) => {
          L.popup()
            .setLatLng(e.latlng)
            .setContent(
              `<div style="min-width:190px">
                <b>🗑️ Report waste here?</b><br/>
                <small style="color:#888">${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}</small><br/>
                <button onclick="window._onReportRequest(${e.latlng.lat}, ${e.latlng.lng})"
                  style="margin-top:8px;padding:7px 0;background:#ef4444;color:white;border:none;
                  border-radius:8px;cursor:pointer;font-size:13px;font-weight:bold;width:100%">
                  🚨 Report Waste Here
                </button>
              </div>`
            ).openOn(map);
        });

        (window as any)._onReportRequest = (lat: number, lng: number) => {
          onReportRequest(lat, lng);
          map.closePopup();
        };

      }, () => console.log('Geolocation denied'));
    };

    const tryInit = setInterval(() => {
      if (!document.getElementById('map')) return;
      clearInterval(tryInit);
      (window as any)._mapInitialized = true;

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      if (document.getElementById('leaflet-script')) { startMap(); return; }

      const script = document.createElement('script');
      script.id = 'leaflet-script';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = startMap;
      document.head.appendChild(script);
    }, 50);

    return () => clearInterval(tryInit);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div id="map" style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

export default function MapScreen() {
  const { loading, getValidToken } = useAuth();
  const t = useT();
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({
    aqi: true, crowd: true, waste: true, eco: true, score: true, reports: true
  });
  const [focusMode, setFocusMode] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [reportLat, setReportLat] = useState(0);
  const [reportLng, setReportLng] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const refreshToken = async () => {
      const t = await getValidToken();
      if (t && Platform.OS === 'web') {
        (window as any)._currentToken = t;
        console.log('Token refreshed on window:', t.slice(0, 20) + '...');
      }
    };

    refreshToken();
    // Refresh every 50 minutes so token never expires during use
    const interval = setInterval(refreshToken, 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleLayer = (id: string) => {
    const next = !activeLayers[id];
    setActiveLayers(prev => ({ ...prev, [id]: next }));
    if ((window as any).toggleLayer) (window as any).toggleLayer(id, next);
  };

  const handleFocus = (id: string) => {
    const next = focusMode === id ? null : id;
    setFocusMode(next);
    if ((window as any).focusLayer) (window as any).focusLayer(next);
    if (next === null) {
      Object.entries(activeLayers).forEach(([key, val]) => {
        if ((window as any).toggleLayer) (window as any).toggleLayer(key, val);
      });
    }
  };

  const handleReportRequest = (lat: number, lng: number) => {
    setReportLat(lat); setReportLng(lng);
    setTitle(''); setDescription(''); setCategory('general');
    setSelectedImage(null); setReportModal(true);
  };

  const pickAndAnalyzeImage = () => {
    if (Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
      reader.readAsDataURL(file);
      setAnalyzing(true);
      try {
        const freshToken = await getValidToken();
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API}/vision/analyze`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${freshToken}` },
          body: formData
        });
        const result = await res.json();
        if (result.detected) {
          setTitle(result.title || '');
          setDescription(result.description || '');
          setCategory(result.category || 'general');
          Alert.alert('🤖 AI Detected!', `Type: ${result.category}\nSeverity: ${result.severity}\n\nFields auto-filled!`);
        } else Alert.alert('No waste detected', 'Please fill in manually.');
      } catch { Alert.alert('Analysis failed', 'Fill in manually.'); }
      finally { setAnalyzing(false); }
    };
    input.click();
  };

  const submitReport = async () => {
    if (!title.trim()) { Alert.alert('Please enter a title'); return; }
    setSubmitting(true);
    try {
      const freshToken = await getValidToken();
      const res = await fetch(`${API}/reports/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freshToken}` },
        body: JSON.stringify({
          title, description, category,
          location: { lat: reportLat, lng: reportLng },
          data: { reported_via: 'map_click' }
        })
      });
      if (res.ok) {
        Alert.alert('✅ Reported!', 'Waste report submitted!');
        setReportModal(false); setSelectedImage(null);
      } else Alert.alert('Error', 'Could not submit report');
    } catch { Alert.alert('Error', 'Network error'); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#22c55e" size="large" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>🗺️ {t('Smart Eco Map')}</Text>
        <Text style={styles.headerSub}>{t('Tap layers to show/hide • Click map to report')}</Text>
      </View>

      <View style={styles.layerBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 12 }}>
          {LAYERS.map(layer => (
            <TouchableOpacity
              key={layer.id}
              style={[
                styles.layerChip,
                activeLayers[layer.id] && { backgroundColor: layer.color + '22', borderColor: layer.color },
                focusMode === layer.id && { backgroundColor: layer.color, borderColor: layer.color }
              ]}
              onPress={() => toggleLayer(layer.id)}
              onLongPress={() => handleFocus(layer.id)}
            >
              <Text style={[
                styles.layerChipText,
                activeLayers[layer.id] && { color: layer.color },
                focusMode === layer.id && { color: '#fff' }
              ]}>
                {layer.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {focusMode && (
        <View style={styles.focusBanner}>
          <Text style={styles.focusText}>
            Focus: {LAYERS.find(l => l.id === focusMode)?.label} — Long press to exit
          </Text>
          <TouchableOpacity onPress={() => handleFocus(focusMode)}>
            <Text style={styles.focusExit}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.mapContainer}>
        {Platform.OS === 'web'
          ? <WebMap onReportRequest={handleReportRequest} />
          : <View style={styles.placeholder}><Text style={styles.placeholderText}>Map on web only</Text></View>
        }
      </View>

      <TouchableOpacity style={styles.legendBtn} onPress={() => setShowLegend(!showLegend)}>
        <Text style={styles.legendBtnText}>📋</Text>
      </TouchableOpacity>

      {showLegend && (
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Map Legend</Text>
          <Text style={styles.legendSection}>Severity (all layers)</Text>
          <Text style={styles.legendItem}>🟢 Low / Good / Green zone</Text>
          <Text style={styles.legendItem}>🟡 Moderate</Text>
          <Text style={styles.legendItem}>🟠 High / Unhealthy</Text>
          <Text style={styles.legendItem}>🔴 Critical / Hazardous</Text>
          <Text style={styles.legendSection}>Shapes = Type</Text>
          <Text style={styles.legendItem}>⬤ Filled = Crowd density</Text>
          <Text style={styles.legendItem}>◎ Dashed = Score zones</Text>
          <Text style={styles.legendItem}>⬤ Solid = AQI stations</Text>
          <Text style={styles.legendItem}>■ Square = Waste reports</Text>
          <Text style={styles.legendItem}>📍 Pin = Eco points</Text>
          <Text style={styles.legendItem}>━━ Blue line = Route</Text>
          <Text style={styles.legendSection}>Tips</Text>
          <Text style={styles.legendItem}>Tap chip → toggle layer</Text>
          <Text style={styles.legendItem}>Long press → focus mode</Text>
          <Text style={styles.legendItem}>Click map → report waste</Text>
          <Text style={styles.legendItem}>Click ♻️ → get route</Text>
        </View>
      )}

      <Modal visible={reportModal} transparent animationType="slide" onRequestClose={() => setReportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>🗑️ {t('Report Waste')}</Text>
            <Text style={styles.modalCoords}>📍 {reportLat.toFixed(5)}, {reportLng.toFixed(5)}</Text>

            <TouchableOpacity style={styles.imageUploadBtn} onPress={pickAndAnalyzeImage} disabled={analyzing}>
              <Text style={styles.imageUploadText}>
                {analyzing ? '🤖 AI Analyzing...' : '📷 Upload Photo — AI auto-fills fields'}
              </Text>
            </TouchableOpacity>

            {analyzing && <ActivityIndicator color="#22c55e" style={{ marginBottom: 8 }} />}

            {selectedImage && (
              <View style={styles.imagePreview}>
                <Image source={{ uri: selectedImage }} style={{ width: '100%', height: 120, borderRadius: 8 }} resizeMode="cover" />
                <TouchableOpacity style={styles.removeImage} onPress={() => setSelectedImage(null)}>
                  <Text style={{ color: '#fff', fontSize: 11 }}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.label}>{t('Title')} *</Text>
            <TextInput style={styles.input} placeholder="e.g. Garbage pile near river" placeholderTextColor="#555" value={title} onChangeText={setTitle} />

            <Text style={styles.label}>{t('Category')}</Text>
            <View style={styles.chips}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c.id} style={[styles.chip, category === c.id && { backgroundColor: c.color, borderColor: c.color }]} onPress={() => setCategory(c.id)}>
                  <Text style={[styles.chipText, category === c.id && { color: '#fff' }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{t('Description')}</Text>
            <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} placeholder="Describe the waste situation..." placeholderTextColor="#555" value={description} onChangeText={setDescription} multiline />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setReportModal(false); setSelectedImage(null); }}>
                <Text style={styles.cancelText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={submitReport} disabled={submitting}>
                <Text style={styles.submitText}>{submitting ? t('Submitting...') : '🚨 ' + t('Submit Report')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: { backgroundColor: '#1a1a1a', padding: 14, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#333' },
  headerText: { fontSize: 18, fontWeight: 'bold', color: '#22c55e' },
  headerSub: { fontSize: 11, color: '#888', marginTop: 2 },
  layerBar: { backgroundColor: '#111', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#222' },
  layerChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#333', backgroundColor: '#1a1a1a' },
  layerChipText: { color: '#666', fontSize: 12, fontWeight: '600' },
  focusBanner: { backgroundColor: '#1a1a1a', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#333' },
  focusText: { color: '#f59e0b', fontSize: 12 },
  focusExit: { color: '#888', fontSize: 16, paddingLeft: 12 },
  mapContainer: { flex: 1 },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#888' },
  legendBtn: { position: 'absolute', bottom: 24, left: 16, backgroundColor: '#1a1a1a', borderRadius: 24, width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333', zIndex: 100 },
  legendBtnText: { fontSize: 20 },
  legend: { position: 'absolute', bottom: 76, left: 16, backgroundColor: 'rgba(15,15,15,0.97)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#333', zIndex: 100, maxWidth: 220 },
  legendTitle: { color: '#22c55e', fontWeight: 'bold', fontSize: 13, marginBottom: 8 },
  legendSection: { color: '#888', fontSize: 10, marginTop: 8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  legendItem: { color: '#ccc', fontSize: 11, marginBottom: 3, lineHeight: 16 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  modalSheet: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, borderTopWidth: 1, borderTopColor: '#333' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#ef4444', marginBottom: 3 },
  modalCoords: { fontSize: 11, color: '#888', marginBottom: 12 },
  imageUploadBtn: { borderWidth: 1.5, borderColor: '#22c55e', borderStyle: 'dashed', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 10, backgroundColor: 'rgba(34,197,94,0.05)' },
  imageUploadText: { color: '#22c55e', fontSize: 13, fontWeight: '600' },
  imagePreview: { borderRadius: 8, overflow: 'hidden', marginBottom: 10, position: 'relative' },
  removeImage: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  label: { color: '#888', fontSize: 12, marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: '#0f0f0f', color: '#fff', borderRadius: 10, padding: 11, fontSize: 14, borderWidth: 1, borderColor: '#333' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#333', backgroundColor: '#0f0f0f' },
  chipText: { color: '#888', fontSize: 12 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  cancelText: { color: '#888', fontSize: 14 },
  submitBtn: { flex: 2, backgroundColor: '#ef4444', padding: 13, borderRadius: 12, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});