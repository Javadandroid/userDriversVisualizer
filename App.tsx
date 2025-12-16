import React, { useState, useMemo, useRef } from 'react';
import MapView from './components/MapView';
import { Pin, PinShape, RulerState, MapCircle, LatLng, CellTowerMarker } from './types';
import { MapPin, Ruler, Trash2, Plus, Sparkles, Navigation, X, Circle as CircleIcon } from 'lucide-react';
import { findLocationWithAI } from './services/geminiService';
import { MapIcon } from './components/MapIcons';
import { fetchTowersByBounds, type BoundingBox } from './services/towerService';

// Helper to calculate distance
const calculateDistance = (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) => {
    const R = 6371e3; // metres
    const φ1 = p1.lat * Math.PI / 180;
    const φ2 = p2.lat * Math.PI / 180;
    const Δφ = (p2.lat - p1.lat) * Math.PI / 180;
    const Δλ = (p2.lng - p1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
};

const App: React.FC = () => {
    // -- State --
    const [pins, setPins] = useState<Pin[]>([]);
    const [circles, setCircles] = useState<MapCircle[]>([]);
    const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
    
    // Tools State
    const [rulerState, setRulerState] = useState<RulerState>({
        isActive: false,
        points: [],
        distance: null
    });
    
    // Circle Drawing State
    const [circleMode, setCircleMode] = useState<{
        isActive: boolean;
        step: 'start' | 'drawing';
        center: LatLng | null;
        tempRadius: number;
        color: string;
    }>({
        isActive: false,
        step: 'start',
        center: null,
        tempRadius: 0,
        color: '#2563eb'
    });

    const [newPinForm, setNewPinForm] = useState<{ lat: string, lng: string, name: string, color: string, shape: PinShape, description: string }>({
        lat: '',
        lng: '',
        name: '',
        color: '#ef4444',
        shape: 'pin',
        description: ''
    });
    const [aiQuery, setAiQuery] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | undefined>(undefined);
    const [towers, setTowers] = useState<CellTowerMarker[]>([]);
    const [isLoadingTowers, setIsLoadingTowers] = useState(false);
    const fetchTimeoutRef = useRef<number | null>(null);

    // -- Handlers --

    const handleMapClick = (lat: number, lng: number) => {
        // Ruler Logic
        if (rulerState.isActive) {
            const newPoints = [...rulerState.points, { lat, lng }];
            let dist = null;
            if (newPoints.length >= 2) {
                let totalDist = 0;
                for (let i = 0; i < newPoints.length - 1; i++) {
                    totalDist += calculateDistance(newPoints[i], newPoints[i+1]);
                }
                dist = totalDist;
            }
            setRulerState({ ...rulerState, points: newPoints, distance: dist });
            return;
        }

        // Circle Logic
        if (circleMode.isActive) {
            if (circleMode.step === 'start') {
                setCircleMode(prev => ({
                    ...prev,
                    step: 'drawing',
                    center: { lat, lng },
                    tempRadius: 0
                }));
            } else if (circleMode.step === 'drawing' && circleMode.center) {
                // Finish drawing
                const newCircle: MapCircle = {
                    id: Date.now().toString(),
                    center: circleMode.center,
                    radius: circleMode.tempRadius || 100, // min radius if clicked instantly
                    color: circleMode.color
                };
                setCircles([...circles, newCircle]);
                // Exit mode and reset
                setCircleMode(prev => ({
                    ...prev,
                    isActive: false, // Turn off tool
                    step: 'start',
                    center: null,
                    tempRadius: 0
                }));
            }
            return;
        }

        // Standard Pin Logic
        setNewPinForm(prev => ({
            ...prev,
            lat: lat.toFixed(6),
            lng: lng.toFixed(6),
            name: prev.name || 'New Pin'
        }));
    };

    const handleMapMouseMove = (lat: number, lng: number) => {
        if (circleMode.isActive && circleMode.step === 'drawing' && circleMode.center) {
            const dist = calculateDistance(circleMode.center, { lat, lng });
            setCircleMode(prev => ({
                ...prev,
                tempRadius: dist
            }));
        }
    };

    const handleUpdateCircle = (id: string, newCenter: LatLng) => {
        setCircles(circles.map(c => c.id === id ? { ...c, center: newCenter } : c));
    };

    const handleDeleteCircle = (id: string) => {
        setCircles(circles.filter(c => c.id !== id));
    };

    const handleAddPin = () => {
        const lat = parseFloat(newPinForm.lat);
        const lng = parseFloat(newPinForm.lng);

        if (isNaN(lat) || isNaN(lng) || !newPinForm.name) {
            alert('لطفا نام و مختصات صحیح وارد کنید');
            return;
        }

        const newPin: Pin = {
            id: Date.now().toString(),
            name: newPinForm.name,
            position: { lat, lng },
            color: newPinForm.color,
            shape: newPinForm.shape,
            description: newPinForm.description
        };

        setPins([...pins, newPin]);
        setNewPinForm(prev => ({ ...prev, name: '', description: '' }));
    };

    const handleDeletePin = (id: string) => {
        if (selectedPinId === id) {
            setSelectedPinId(null);
        }
        setPins(pins.filter(p => p.id !== id));
    };

    const handleAiSearch = async () => {
        if (!aiQuery.trim()) return;
        setIsAiLoading(true);
        try {
            const result = await findLocationWithAI(aiQuery);
            setNewPinForm({
                lat: result.lat.toString(),
                lng: result.lng.toString(),
                name: result.suggestedName,
                color: result.suggestedColor,
                shape: result.suggestedShape,
                description: result.description || ''
            });
            setMapCenter({ lat: result.lat, lng: result.lng });
        } catch (error) {
            alert('خطا در یافتن مکان با هوش مصنوعی. لطفا مجددا تلاش کنید.');
        } finally {
            setIsAiLoading(false);
        }
    };

    const toggleRuler = () => {
        // Disable circle mode if active
        if (circleMode.isActive) setCircleMode(prev => ({ ...prev, isActive: false }));
        
        setRulerState(prev => ({
            isActive: !prev.isActive,
            points: [],
            distance: null
        }));
    };

    const toggleCircleMode = () => {
        // Disable ruler if active
        if (rulerState.isActive) setRulerState(prev => ({ ...prev, isActive: false }));

        setCircleMode(prev => ({
            isActive: !prev.isActive,
            step: 'start',
            center: null,
            tempRadius: 0,
            color: prev.color
        }));
    };

    const formattedDistance = useMemo(() => {
        if (rulerState.distance === null) return '';
        if (rulerState.distance > 1000) {
            return `${(rulerState.distance / 1000).toFixed(2)} کیلومتر`;
        }
        return `${Math.round(rulerState.distance)} متر`;
    }, [rulerState.distance]);

    const handleBoundsChange = (bounds: BoundingBox, _zoom: number) => {
        if (fetchTimeoutRef.current) {
            window.clearTimeout(fetchTimeoutRef.current);
        }
        fetchTimeoutRef.current = window.setTimeout(async () => {
            setIsLoadingTowers(true);
            try {
                const data = await fetchTowersByBounds(bounds, 50);
                setTowers(data);
            } catch (error) {
                console.error('Failed to fetch towers', error);
            } finally {
                setIsLoadingTowers(false);
            }
        }, 400);
    };

    return (
        <div className="flex h-screen w-full relative">
            
            {/* Sidebar / Overlay for Mobile */}
            <div className={`
                fixed inset-y-0 right-0 z-20 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out border-l border-gray-200 flex flex-col
                ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
                md:relative md:translate-x-0
            `}>
                <div className="p-4 bg-slate-800 text-white flex justify-between items-center shadow-md">
                    <div className="flex items-center gap-2">
                        <MapPin className="text-blue-400" />
                        <h1 className="font-bold text-xl">PinMap AI</h1>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    
                    {/* Gemini AI Section */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2 mb-2 text-slate-700 font-semibold">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            <h2>جستجوی هوشمند</h2>
                        </div>
                        <div className="flex flex-col gap-2">
                            <textarea
                                value={aiQuery}
                                onChange={(e) => setAiQuery(e.target.value)}
                                placeholder="مثلا: یک پین قرمز نزدیک برج میلاد بزن..."
                                className="w-full p-2 text-sm border rounded focus:ring-2 focus:ring-purple-500 focus:outline-none min-h-[60px]"
                                dir="rtl"
                            />
                            <button 
                                onClick={handleAiSearch}
                                disabled={isAiLoading}
                                className="bg-purple-600 text-white py-2 px-4 rounded text-sm hover:bg-purple-700 disabled:opacity-50 flex justify-center items-center gap-2 transition-all"
                            >
                                {isAiLoading ? 'در حال فکر کردن...' : 'پیدا کن و پر کن'}
                                {!isAiLoading && <Sparkles size={14} />}
                            </button>
                        </div>
                    </div>

                    {/* Add Pin Form */}
                    <div className="space-y-3">
                        <h2 className="font-bold text-slate-700 border-b pb-2">افزودن پین جدید</h2>
                        
                        <div className="grid grid-cols-2 gap-2">
                             <div>
                                <label className="text-xs text-gray-500">عرض جغرافیایی</label>
                                <input 
                                    type="text" 
                                    value={newPinForm.lat}
                                    onChange={(e) => setNewPinForm({...newPinForm, lat: e.target.value})}
                                    className="w-full p-2 border rounded text-sm bg-gray-50"
                                    placeholder="35.68..."
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">طول جغرافیایی</label>
                                <input 
                                    type="text" 
                                    value={newPinForm.lng}
                                    onChange={(e) => setNewPinForm({...newPinForm, lng: e.target.value})}
                                    className="w-full p-2 border rounded text-sm bg-gray-50"
                                    placeholder="51.38..."
                                />
                            </div>
                        </div>

                        <input 
                            type="text" 
                            value={newPinForm.name}
                            onChange={(e) => setNewPinForm({...newPinForm, name: e.target.value})}
                            placeholder="نام مکان"
                            className="w-full p-2 border rounded text-sm text-right"
                            dir="rtl"
                        />

                         <input 
                            type="text" 
                            value={newPinForm.description}
                            onChange={(e) => setNewPinForm({...newPinForm, description: e.target.value})}
                            placeholder="توضیحات (اختیاری)"
                            className="w-full p-2 border rounded text-sm text-right"
                            dir="rtl"
                        />

                        <div className="flex gap-4 items-center">
                            <div className="flex-1">
                                <label className="text-xs block text-gray-500 mb-1">شکل</label>
                                <div className="flex gap-2">
                                    {(['pin', 'circle', 'star', 'square', 'triangle'] as PinShape[]).map(s => (
                                        <button 
                                            key={s}
                                            onClick={() => setNewPinForm({...newPinForm, shape: s})}
                                            className={`p-1 rounded hover:bg-gray-100 ${newPinForm.shape === s ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                                            title={s}
                                        >
                                            <MapIcon shape={s} color={newPinForm.color} size={20} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs block text-gray-500 mb-1">رنگ</label>
                                <input 
                                    type="color" 
                                    value={newPinForm.color}
                                    onChange={(e) => setNewPinForm({...newPinForm, color: e.target.value})}
                                    className="h-8 w-16 p-0 border-0 rounded cursor-pointer"
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleAddPin}
                            className="w-full bg-blue-600 text-white py-2 rounded flex items-center justify-center gap-2 hover:bg-blue-700"
                        >
                            <Plus size={16} /> افزودن به نقشه
                        </button>
                    </div>

                    {/* Pins List */}
                    <div className="space-y-2">
                        <h2 className="font-bold text-slate-700 border-b pb-2 flex justify-between items-center">
                            لیست پین‌ها
                            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">{pins.length}</span>
                        </h2>
                        {pins.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">هنوز پینی اضافه نشده است</p>
                        ) : (
                            <ul className="space-y-2">
                        {pins.map(pin => (
                            <li key={pin.id} className="bg-white border rounded p-2 flex justify-between items-center hover:shadow-sm transition-shadow">
                                <div 
                                    className="flex items-center gap-2 cursor-pointer"
                                    onClick={() => {
                                        setMapCenter(pin.position);
                                        setSelectedPinId(pin.id);
                                    }}
                                >
                                    <MapIcon shape={pin.shape} color={pin.color} size={18} />
                                    <div className="text-right">
                                        <div className="font-semibold text-sm">{pin.name}</div>
                                        <div className="text-xs text-gray-400">{pin.position.lat.toFixed(3)}, {pin.position.lng.toFixed(3)}</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleDeletePin(pin.id)}
                                            className="text-red-400 hover:text-red-600 p-1"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative">
                {isLoadingTowers && (
                    <div className="absolute top-4 left-4 z-[500] bg-white/90 border border-gray-200 shadow px-3 py-1 rounded-full text-xs text-gray-700 flex items-center gap-2">
                        <span className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full"></span>
                        در حال بارگذاری دکل‌ها...
                    </div>
                )}
                {!isLoadingTowers && towers.length === 0 && (
                    <div className="absolute top-4 left-4 z-[500] bg-white/90 border border-gray-200 shadow px-3 py-1 rounded-full text-xs text-gray-700">
                        در این محدوده دکلی یافت نشد
                    </div>
                )}
                <MapView 
                    pins={pins}
                    towers={towers}
                    circles={circles}
                    rulerState={rulerState}
                    selectedPinId={selectedPinId}
                    drawingCircle={circleMode.step === 'drawing' && circleMode.center ? {
                        center: circleMode.center,
                        radius: circleMode.tempRadius,
                        color: circleMode.color
                    } : null}
                    onMapClick={handleMapClick}
                    onMapMouseMove={handleMapMouseMove}
                    onDeletePin={handleDeletePin}
                    onUpdateCircle={handleUpdateCircle}
                    onDeleteCircle={handleDeleteCircle}
                    onBoundsChange={handleBoundsChange}
                    center={mapCenter}
                />

                {/* Mobile Toggle Button */}
                {!sidebarOpen && (
                    <button 
                        onClick={() => setSidebarOpen(true)}
                        className="absolute top-4 right-4 z-10 bg-white p-2 rounded shadow-lg md:hidden"
                    >
                        <Navigation />
                    </button>
                )}

                {/* Tools Control Panel */}
                <div className="absolute bottom-6 left-4 z-[400] flex flex-row items-end gap-3">
                    
                    {/* Ruler Tool */}
                    <button 
                        onClick={toggleRuler}
                        className={`p-3 rounded-full shadow-lg transition-colors flex items-center gap-2 ${rulerState.isActive ? 'bg-orange-500 text-white' : 'bg-white text-slate-700 hover:bg-gray-50'}`}
                        title="ابزار خط کش"
                    >
                        <Ruler size={20} />
                        {rulerState.isActive && <span className="text-xs font-bold">فعال</span>}
                    </button>
                    
                    {/* Circle Tool */}
                    <div className="flex flex-col-reverse items-center gap-2">
                        <button 
                            onClick={toggleCircleMode}
                            className={`p-3 rounded-full shadow-lg transition-colors flex items-center gap-2 ${circleMode.isActive ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-gray-50'}`}
                            title="رسم دایره"
                        >
                            <CircleIcon size={20} />
                            {circleMode.isActive && <span className="text-xs font-bold">رسم</span>}
                        </button>
                        
                        {circleMode.isActive && (
                            <div className="bg-white p-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                                <input 
                                    type="color" 
                                    value={circleMode.color}
                                    onChange={(e) => setCircleMode(prev => ({...prev, color: e.target.value}))}
                                    className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                                    title="رنگ دایره"
                                />
                                <span className="text-xs text-gray-500 whitespace-nowrap">رنگ دایره</span>
                            </div>
                        )}
                    </div>

                    {/* Tools Info Panel */}
                    {(rulerState.isActive || circleMode.isActive) && (
                        <div className="bg-white/95 backdrop-blur p-3 rounded-lg shadow-lg text-right text-sm max-w-[200px]" dir="rtl">
                            {rulerState.isActive && (
                                <>
                                    <p className="font-bold mb-1 text-orange-600">خط‌کش</p>
                                    <p className="text-gray-600 mb-2 text-xs">برای افزودن نقطه کلیک کنید.</p>
                                    {rulerState.distance !== null && (
                                        <div className="text-lg font-bold text-slate-800">
                                            {formattedDistance}
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => setRulerState({ isActive: true, points: [], distance: null })}
                                        className="mt-2 text-xs text-red-500 hover:underline w-full text-center"
                                    >
                                        پاک کردن نقاط
                                    </button>
                                </>
                            )}

                            {circleMode.isActive && (
                                <>
                                    <p className="font-bold mb-1 text-blue-600">رسم دایره</p>
                                    <p className="text-gray-600 mb-2 text-xs">
                                        {circleMode.step === 'start' 
                                            ? 'برای تعیین مرکز کلیک کنید' 
                                            : 'موس را حرکت دهید و برای پایان کلیک کنید'}
                                    </p>
                                    {circleMode.step === 'drawing' && (
                                        <p className="text-lg font-bold text-slate-800 dir-ltr text-center">
                                            {Math.round(circleMode.tempRadius)} m
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
